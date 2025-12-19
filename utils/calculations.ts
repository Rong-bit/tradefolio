import { 
  Transaction, 
  CashFlow, 
  Account, 
  ChartDataPoint, 
  Currency, 
  CashFlowType, 
  Holding, 
  AssetAllocationItem, 
  Market, 
  AnnualPerformanceItem, 
  AccountPerformance,
  TransactionType,
  HistoricalData
} from '../types';

export const calculateHoldings = (
  transactions: Transaction[], 
  currentPrices: Record<string, number>,
  priceDetails?: Record<string, { change: number, changePercent: number }>
): Holding[] => {
  const map = new Map<string, Holding>();
  const flowsMap = new Map<string, { amount: number, date: number }[]>();
  const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sortedTx.forEach(tx => {
     const key = `${tx.accountId}-${tx.ticker}`;
     if (!map.has(key)) {
       map.set(key, {
         ticker: tx.ticker,
         market: tx.market,
         quantity: 0,
         avgCost: 0,
         totalCost: 0,
         currentPrice: 0,
         currentValue: 0,
         unrealizedPL: 0,
         unrealizedPLPercent: 0,
         accountId: tx.accountId,
         weight: 0,
         annualizedReturn: 0,
         firstBuyDate: tx.date
       });
     }
     
     if (!flowsMap.has(key)) {
       flowsMap.set(key, []);
     }
     const flows = flowsMap.get(key)!;

     const h = map.get(key)!;
     
     if (tx.type === TransactionType.BUY || tx.type === TransactionType.TRANSFER_IN || tx.type === TransactionType.DIVIDEND) {
       // 台股邏輯：股價 * 股數 無條件捨去 + 手續費
       let baseVal = tx.price * tx.quantity;
       if (tx.market === Market.TW) baseVal = Math.floor(baseVal);

       const txCost = tx.amount !== undefined ? tx.amount : (baseVal + (tx.fees || 0));
       const newTotalCost = h.totalCost + txCost;
       const newQty = h.quantity + tx.quantity;
       h.avgCost = newQty > 0 ? newTotalCost / newQty : 0;
       h.totalCost = newTotalCost;
       h.quantity = newQty;
       
       const flowDate = new Date(tx.date).getTime();
       if (tx.type === TransactionType.BUY) {
          flows.push({ amount: -txCost, date: flowDate });
       } else if (tx.type === TransactionType.TRANSFER_IN) {
          flows.push({ amount: -txCost, date: flowDate });
       }
       
     } else if (tx.type === TransactionType.SELL || tx.type === TransactionType.TRANSFER_OUT) {
       if (h.quantity > 0) {
         const ratio = tx.quantity / h.quantity;
         let costOfSold = h.totalCost * ratio;
         
         // 修正邏輯：若是台股，將扣除的成本進行四捨五入取整，確保剩餘總成本為整數
         if (tx.market === Market.TW) {
            costOfSold = Math.round(costOfSold);
         }

         h.totalCost -= costOfSold;
         h.quantity -= tx.quantity;
         
         let baseVal = tx.price * tx.quantity;
         if (tx.market === Market.TW) baseVal = Math.floor(baseVal);

         const proceeds = tx.amount !== undefined ? tx.amount : (baseVal - (tx.fees || 0));
         const flowDate = new Date(tx.date).getTime();
         
         if (tx.type === TransactionType.SELL) {
            flows.push({ amount: proceeds, date: flowDate });
         } else {
            flows.push({ amount: proceeds, date: flowDate });
         }
       }
     } else if (tx.type === TransactionType.CASH_DIVIDEND) {
        const proceeds = tx.amount !== undefined ? tx.amount : ((tx.price * tx.quantity) - (tx.fees || 0));
        flows.push({ amount: proceeds, date: new Date(tx.date).getTime() });
     }
  });
  
  return Array.from(map.values())
    .filter(h => h.quantity > 0.000001)
    .map(h => {
      const priceKey = `${h.market}-${h.ticker}`;
      const currentPrice = currentPrices[priceKey] || h.avgCost;
      
      // 策略更新：若是台股，市值(CurrentValue)四捨五入取整；美股則保留運算精確度
      let currentValue = currentPrice * h.quantity;
      if (h.market === Market.TW) {
        currentValue = Math.round(currentValue);
      }

      const unrealizedPL = currentValue - h.totalCost;
      const unrealizedPLPercent = h.totalCost > 0 ? (unrealizedPL / h.totalCost) * 100 : 0;
      
      const flows = flowsMap.get(`${h.accountId}-${h.ticker}`) || [];
      const xirrFlows = [...flows, { amount: currentValue, date: Date.now() }];
      const annualizedReturn = calculateGenericXIRR(xirrFlows);

      const details = priceDetails?.[priceKey];
      // 如果有 details，使用其實際值（即使是 0 也代表平盤）；如果沒有，使用 undefined 表示未取得
      const dailyChange = details !== undefined ? (details.change !== undefined ? details.change : 0) : undefined;
      const dailyChangePercent = details !== undefined ? (details.changePercent !== undefined ? details.changePercent : 0) : undefined;

      return { 
        ...h, 
        currentPrice, 
        currentValue, 
        unrealizedPL, 
        unrealizedPLPercent, 
        annualizedReturn,
        dailyChange,
        dailyChangePercent
      };
    });
};

export const calculateAccountBalances = (accounts: Account[], cashFlows: CashFlow[], transactions: Transaction[]): Account[] => {
    const balMap: Record<string, number> = {};
    accounts.forEach(a => balMap[a.id] = 0); 
    
    cashFlows.forEach(cf => {
      if (cf.type === CashFlowType.DEPOSIT || cf.type === CashFlowType.INTEREST) {
        balMap[cf.accountId] = (balMap[cf.accountId] || 0) + cf.amount;
      } else if (cf.type === CashFlowType.WITHDRAW) {
        balMap[cf.accountId] = (balMap[cf.accountId] || 0) - cf.amount;
      } else if (cf.type === CashFlowType.TRANSFER) {
        balMap[cf.accountId] = (balMap[cf.accountId] || 0) - cf.amount;
        if (cf.targetAccountId) {
             const sourceAcc = accounts.find(a => a.id === cf.accountId);
             const targetAcc = accounts.find(a => a.id === cf.targetAccountId);
             if (sourceAcc && targetAcc) {
                let inAmount = cf.amount;
                if (cf.exchangeRate && cf.exchangeRate > 0) {
                    if (sourceAcc.currency === Currency.USD && targetAcc.currency === Currency.TWD) {
                        inAmount = cf.amount * cf.exchangeRate;
                    } else if (sourceAcc.currency === Currency.TWD && targetAcc.currency === Currency.USD) {
                        inAmount = cf.amount / cf.exchangeRate;
                    }
                }
                balMap[cf.targetAccountId!] = (balMap[cf.targetAccountId!] || 0) + inAmount;
             }
        }
      }
    });

    transactions.forEach(tx => {
       let baseVal = tx.price * tx.quantity;
       if (tx.market === Market.TW) baseVal = Math.floor(baseVal);

       const cost = tx.amount !== undefined ? tx.amount : (baseVal + (tx.fees || 0));
       
       if (tx.type === TransactionType.BUY) {
         balMap[tx.accountId] = (balMap[tx.accountId] || 0) - cost;
       } else if (tx.type === TransactionType.SELL) {
         const proceeds = tx.amount !== undefined ? tx.amount : (baseVal - (tx.fees || 0));
         balMap[tx.accountId] = (balMap[tx.accountId] || 0) + proceeds;
       } else if (tx.type === TransactionType.CASH_DIVIDEND) {
         const divAmt = tx.amount !== undefined ? tx.amount : ((tx.price * tx.quantity) - (tx.fees || 0));
         balMap[tx.accountId] = (balMap[tx.accountId] || 0) + divAmt;
       } else if (tx.type === TransactionType.TRANSFER_OUT) {
         balMap[tx.accountId] = (balMap[tx.accountId] || 0) - (tx.fees || 0);
       } else if (tx.type === TransactionType.TRANSFER_IN) {
         balMap[tx.accountId] = (balMap[tx.accountId] || 0) - (tx.fees || 0);
       }
    });

    return accounts.map(a => ({ ...a, balance: balMap[a.id] || 0 }));
}

// Time Machine Helper: Calculate holdings and cash at a specific date
// EXPORT THIS FUNCTION for HistoricalDataModal
export const getPortfolioStateAtDate = (
    targetDate: Date,
    transactions: Transaction[],
    cashFlows: CashFlow[],
    accounts: Account[]
): { holdings: Record<string, number>, cashBalances: Record<string, number> } => {
    
    // 1. Calculate Cash Balances
    const cashBalances: Record<string, number> = {};
    accounts.forEach(a => cashBalances[a.id] = 0);

    cashFlows.filter(cf => new Date(cf.date) <= targetDate).forEach(cf => {
        if (cf.type === CashFlowType.DEPOSIT || cf.type === CashFlowType.INTEREST) {
            cashBalances[cf.accountId] = (cashBalances[cf.accountId] || 0) + cf.amount;
        } else if (cf.type === CashFlowType.WITHDRAW) {
            cashBalances[cf.accountId] = (cashBalances[cf.accountId] || 0) - cf.amount;
        } else if (cf.type === CashFlowType.TRANSFER) {
            cashBalances[cf.accountId] = (cashBalances[cf.accountId] || 0) - cf.amount;
            if (cf.targetAccountId) {
                // Simplified transfer logic for historical estimate
                let inAmount = cf.amount;
                if (cf.exchangeRate && cf.exchangeRate > 0) {
                     const sourceAcc = accounts.find(a => a.id === cf.accountId);
                     const targetAcc = accounts.find(a => a.id === cf.targetAccountId);
                     if (sourceAcc?.currency === Currency.USD && targetAcc?.currency === Currency.TWD) inAmount = cf.amount * cf.exchangeRate;
                     else if (sourceAcc?.currency === Currency.TWD && targetAcc?.currency === Currency.USD) inAmount = cf.amount / cf.exchangeRate;
                }
                cashBalances[cf.targetAccountId] = (cashBalances[cf.targetAccountId] || 0) + inAmount;
            }
        }
    });

    // 2. Calculate Holdings
    const holdings: Record<string, number> = {}; // Key: "Market-Ticker"

    transactions.filter(tx => new Date(tx.date) <= targetDate).forEach(tx => {
        const key = `${tx.market}-${tx.ticker}`;
        
        // Update Cash from Tx cost logic (simplified here as we only need cashBalances roughly correct, but holdings exact)
        let baseVal = tx.price * tx.quantity;
        if (tx.market === Market.TW) baseVal = Math.floor(baseVal);

        const cost = tx.amount !== undefined ? tx.amount : (baseVal + (tx.fees || 0));
        
        if (tx.type === TransactionType.BUY) {
            cashBalances[tx.accountId] = (cashBalances[tx.accountId] || 0) - cost;
            holdings[key] = (holdings[key] || 0) + tx.quantity;
        } else if (tx.type === TransactionType.SELL) {
            const proceeds = tx.amount !== undefined ? tx.amount : (baseVal - (tx.fees || 0));
            cashBalances[tx.accountId] = (cashBalances[tx.accountId] || 0) + proceeds;
            holdings[key] = (holdings[key] || 0) - tx.quantity;
        } else if (tx.type === TransactionType.CASH_DIVIDEND) {
             const divAmt = tx.amount !== undefined ? tx.amount : ((tx.price * tx.quantity) - (tx.fees || 0));
             cashBalances[tx.accountId] = (cashBalances[tx.accountId] || 0) + divAmt;
        } else if (tx.type === TransactionType.DIVIDEND) {
             holdings[key] = (holdings[key] || 0) + tx.quantity;
        } else if (tx.type === TransactionType.TRANSFER_IN) {
             cashBalances[tx.accountId] = (cashBalances[tx.accountId] || 0) - (tx.fees || 0);
             holdings[key] = (holdings[key] || 0) + tx.quantity;
        } else if (tx.type === TransactionType.TRANSFER_OUT) {
             cashBalances[tx.accountId] = (cashBalances[tx.accountId] || 0) - (tx.fees || 0);
             holdings[key] = (holdings[key] || 0) - tx.quantity;
        }
    });

    return { holdings, cashBalances };
};

export const generateAdvancedChartData = (
  transactions: Transaction[],
  cashFlows: CashFlow[],
  accounts: Account[],
  currentTotalValueTWD: number,
  exchangeRate: number,
  historicalData?: HistoricalData, // New Parameter
  jpyExchangeRate?: number // JPY to TWD exchange rate
): ChartDataPoint[] => {
  const years = new Set<string>();
  const allDates = [...transactions.map(t => t.date), ...cashFlows.map(c => c.date)];
  if (allDates.length === 0) return [];

  const startYear = new Date(allDates.sort()[0]).getFullYear();
  const endYear = new Date().getFullYear();

  const data: ChartDataPoint[] = [];
  
  let cumulativeNetInvestedTWD = 0; 
  let accumulatedEstAssets = 0; 

  for (let y = startYear; y <= endYear; y++) {
    const prevCost = cumulativeNetInvestedTWD; 
    const flowsInYear = cashFlows.filter(c => new Date(c.date).getFullYear() === y);
    const txsInYear = transactions.filter(t => new Date(t.date).getFullYear() === y);
    
    // 1. Process Net Invested (Cost)
    flowsInYear.forEach(cf => {
      const account = accounts.find(a => a.id === cf.accountId);
      const isUSD = account?.currency === Currency.USD;
      let amountTWD = 0;
      if (cf.amountTWD && cf.amountTWD > 0) {
        amountTWD = cf.amountTWD;
      } else {
        let rate = isUSD ? exchangeRate : 1;
        if (isUSD && cf.exchangeRate && cf.exchangeRate > 0) rate = cf.exchangeRate;
        amountTWD = cf.amount * rate;
      }
      if (cf.type === CashFlowType.DEPOSIT) cumulativeNetInvestedTWD += amountTWD;
      else if (cf.type === CashFlowType.WITHDRAW) cumulativeNetInvestedTWD -= amountTWD;
    });

    txsInYear.forEach(tx => {
        if (tx.type === TransactionType.TRANSFER_IN || tx.type === TransactionType.TRANSFER_OUT) {
             let baseVal = tx.price * tx.quantity;
             if (tx.market === Market.TW) baseVal = Math.floor(baseVal);
             
            const val = tx.amount !== undefined ? tx.amount : baseVal;
            let valTWD = 0;
            // 根據市場類型使用對應的匯率
            if (tx.market === Market.US || tx.market === Market.UK) {
              valTWD = val * exchangeRate;
            } else if (tx.market === Market.JP) {
              // 日本市場使用日幣匯率
              valTWD = jpyExchangeRate ? val * jpyExchangeRate : val * exchangeRate; // 如果沒有日幣匯率，回退到美元匯率
            } else {
              valTWD = val;
            }
             
             if (tx.type === TransactionType.TRANSFER_IN) cumulativeNetInvestedTWD += valTWD;
             else cumulativeNetInvestedTWD -= valTWD;
        }
    });

    // Net Inflow for Estimate
    const netInflowThisYear = cumulativeNetInvestedTWD - prevCost;
    accumulatedEstAssets = (accumulatedEstAssets + netInflowThisYear) * 1.08;
    if (accumulatedEstAssets < 0) accumulatedEstAssets = 0;

    const cost = Math.max(0, cumulativeNetInvestedTWD);
    
    // --- 2. Calculate Total Assets (The Hybrid Logic) ---
    let totalAssets = 0;
    let isRealData = false;

    if (y === endYear) {
      // Current year: Use live calculated value
      totalAssets = currentTotalValueTWD;
      isRealData = true; 
    } else {
       // Historical years: Try to use AI fetched data
       const yearKey = y.toString();
       if (historicalData && historicalData[yearKey]) {
          // YES! We have historical prices
          const histPrices = historicalData[yearKey].prices;
          const histRate = historicalData[yearKey].exchangeRate || exchangeRate;
          const histJpyRate = historicalData[yearKey].jpyExchangeRate || jpyExchangeRate;
          
          const yearEndDate = new Date(`${y}-12-31`);
          const { holdings, cashBalances } = getPortfolioStateAtDate(yearEndDate, transactions, cashFlows, accounts);
          
          let stockValueTWD = 0;
          let hasMissingPrices = false;
          
          Object.entries(holdings).forEach(([key, qty]) => {
              if (qty > 0.000001) {
                  const [market, ticker] = key.split('-');
                  // 移除 (BAK) 後綴（備份股票代號）
                  const cleanTicker = ticker.replace(/\(BAK\)/gi, '').trim();
                  
                  // 嘗試多種格式查找歷史價格
                  // 1. 直接使用 ticker（可能是 "TPE:2330" 或 "2330" 或 "AAPL"）
                  // 2. 如果是台股且沒有 TPE: 前綴，嘗試加上 TPE: 前綴
                  // 3. 如果是台股且有 TPE: 前綴，嘗試移除前綴
                  // 4. 同時嘗試移除 (BAK) 後綴後的版本
                  let price = 0;
                  
                  // 先嘗試原始 ticker（可能包含 (BAK)）
                  if (histPrices[ticker]) {
                      price = histPrices[ticker];
                  } else if (market === Market.TW) {
                      // 台股：嘗試多種格式
                      if (cleanTicker.startsWith('TPE:')) {
                          // 如果 cleanTicker 是 "TPE:2412"，嘗試 "TPE:2412" 和 "2412"
                          const withoutPrefix = cleanTicker.replace(/^TPE:/i, '');
                          price = histPrices[cleanTicker] || histPrices[withoutPrefix] || histPrices[`TPE:${withoutPrefix}`] || 0;
                      } else {
                          // 如果 cleanTicker 是 "2412"，嘗試 "TPE:2412" 和 "2412"
                          price = histPrices[`TPE:${cleanTicker}`] || histPrices[cleanTicker] || 0;
                      }
                  } else {
                      // 美股：先嘗試原始 ticker，再嘗試移除 (BAK) 後的版本
                      price = histPrices[ticker] || histPrices[cleanTicker] || 0;
                  }
                  
                  // 檢查是否有缺失的價格
                  if (price === 0) {
                      hasMissingPrices = true;
                  }
                  
                  // 根據市場類型使用對應的匯率
                  if (market === Market.US || market === Market.UK) {
                      stockValueTWD += qty * price * histRate;
                  } else if (market === Market.JP) {
                      // 日本市場使用日幣匯率
                      const rate = histJpyRate || histRate; // 如果沒有日幣匯率，回退到美元匯率
                      stockValueTWD += qty * price * rate;
                  } else {
                      // TWD: Round the value
                      stockValueTWD += Math.round(qty * price);
                  }
              }
          });

          let cashValueTWD = 0;
          Object.entries(cashBalances).forEach(([accId, bal]) => {
              const acc = accounts.find(a => a.id === accId);
              if (acc) {
                  if (acc.currency === Currency.USD) {
                    cashValueTWD += bal * histRate;
                  } else if (acc.currency === Currency.JPY) {
                    // 日幣帳戶使用日幣匯率
                    const rate = histJpyRate || histRate; // 如果沒有日幣匯率，回退到美元匯率
                    cashValueTWD += bal * rate;
                  } else {
                    cashValueTWD += bal;
                  }
              }
          });

          totalAssets = stockValueTWD + cashValueTWD;
          
          // 判斷是否為真實數據：
          // 只要有歷史數據且沒有缺失價格，就標記為真實數據
          // 即使 totalAssets < cost（市場下跌時可能發生），只要所有股票都有價格，仍然是真實數據
          if (hasMissingPrices) {
              // 有缺失價格，使用插值計算作為備選方案
              const totalYears = endYear - startYear + 1;
              const currentYearIndex = y - startYear + 1;
              const progress = currentYearIndex / totalYears;
              const totalProfit = currentTotalValueTWD - cumulativeNetInvestedTWD;
              totalAssets = cost + (totalProfit * progress);
              isRealData = false;
          } else {
              // 所有股票都有價格，標記為真實數據
              isRealData = true;
          }

       } else {
          // NO historical data: Fallback to linear interpolation
          const totalYears = endYear - startYear + 1;
          const currentYearIndex = y - startYear + 1;
          const progress = currentYearIndex / totalYears;
          const totalProfit = currentTotalValueTWD - cumulativeNetInvestedTWD;
          totalAssets = cost + (totalProfit * progress);
       }
    }
    
    // 計算 profit，確保 totalAssets = cost + profit 成立
    const profit = totalAssets - cost;
    
    // 處理浮點數精度問題：確保 totalAssets 與 cost + profit 完全一致
    // 這樣折線圖才能正確對齊到疊加柱狀圖的頂部
    // 使用原始 totalAssets 值，但確保它等於 cost + profit（理論上應該總是成立）
    const adjustedTotalAssets = cost + profit;
    
    const assetCostRatio = cost > 0 ? adjustedTotalAssets / cost : 0;

    data.push({
      year: y.toString(),
      cost,
      profit,
      totalAssets: adjustedTotalAssets, // 使用調整後的 totalAssets 確保與疊加柱狀圖對齊
      estTotalAssets: accumulatedEstAssets,
      assetCostRatio,
      isRealData
    });
  }

  return data;
};

export const formatCurrency = (val: number, currency: string): string => {
  try {
    if (!currency || currency.trim() === '' || currency.length !== 3) {
      return new Intl.NumberFormat('zh-TW', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(val);
    }

    // Hybrid Strategy:
    // USD: 2 decimals
    // TWD: 0 decimals
    const isUSD = currency === 'USD';

    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: isUSD ? 2 : 0,
      maximumFractionDigits: isUSD ? 2 : 0,
    }).format(val);
  } catch (error) {
    return val.toLocaleString();
  }
};

export const calculateAssetAllocation = (
  holdings: Holding[],
  cashBalanceTWD: number,
  exchangeRate: number,
  jpyExchangeRate?: number
): AssetAllocationItem[] => {
  const tickerMap: Record<string, number> = {};
  let totalValue = cashBalanceTWD;

  holdings.forEach(h => {
    // 根據市場類型使用對應的匯率
    let valTWD: number;
    if (h.market === Market.US || h.market === Market.UK) {
      valTWD = h.currentValue * exchangeRate;
    } else if (h.market === Market.JP) {
      // 日本市場使用日幣匯率
      valTWD = jpyExchangeRate ? h.currentValue * jpyExchangeRate : h.currentValue * exchangeRate; // 如果沒有日幣匯率，回退到美元匯率
    } else {
      valTWD = h.currentValue;
    }
    if (!tickerMap[h.ticker]) tickerMap[h.ticker] = 0;
    tickerMap[h.ticker] += valTWD;
    totalValue += valTWD;
  });

  const items: AssetAllocationItem[] = [];
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];
  let colorIdx = 0;

  Object.entries(tickerMap).forEach(([name, value]) => {
    items.push({
      name,
      value,
      ratio: totalValue > 0 ? (value / totalValue) * 100 : 0,
      color: colors[colorIdx++ % colors.length]
    });
  });

  items.sort((a, b) => b.value - a.value);

  if (cashBalanceTWD > 0) {
    items.unshift({
      name: '現金 (Cash)',
      value: cashBalanceTWD,
      ratio: totalValue > 0 ? (cashBalanceTWD / totalValue) * 100 : 0,
      color: '#cbd5e1'
    });
  }

  return items;
};

export const calculateAnnualPerformance = (
  chartData: ChartDataPoint[]
): AnnualPerformanceItem[] => {
  const items: AnnualPerformanceItem[] = [];

  for (let i = 0; i < chartData.length; i++) {
    const current = chartData[i];
    const prev = i > 0 ? chartData[i - 1] : null;

    const startAssets = prev ? prev.totalAssets : 0;
    const endAssets = current.totalAssets;
    const netInflow = current.cost - (prev ? prev.cost : 0);
    const profit = endAssets - startAssets - netInflow;
    const base = startAssets + netInflow;
    const roi = base > 0 ? (profit / base) * 100 : 0;

    let yearLabel = current.year;
    const currentYear = new Date().getFullYear().toString();
    if (yearLabel === currentYear) {
      const currentMonth = new Date().getMonth() + 1;
      yearLabel = `${yearLabel} (至 ${currentMonth} 月底)`;
    }

    items.push({
      year: yearLabel,
      startAssets,
      netInflow,
      endAssets,
      profit,
      roi,
      isRealData: current.isRealData
    });
  }

  return items.reverse();
};

export const calculateAccountPerformance = (
  accounts: Account[],
  holdings: Holding[],
  cashFlows: CashFlow[],
  transactions: Transaction[],
  exchangeRate: number,
  jpyExchangeRate?: number
): AccountPerformance[] => {
  return accounts.map(acc => {
    const isUSD = acc.currency === Currency.USD;
    const isJPY = acc.currency === Currency.JPY;
    const rate = isUSD ? exchangeRate : (isJPY ? (jpyExchangeRate || exchangeRate) : 1); // 如果沒有日幣匯率，回退到美元匯率

    const cashTWD = acc.balance * rate;
    const accountHoldings = holdings.filter(h => h.accountId === acc.id);
    const stockValueNative = accountHoldings.reduce((sum, h) => sum + h.currentValue, 0);
    const stockValueTWD = isUSD ? stockValueNative * rate : stockValueNative;
    const totalAssetsTWD = cashTWD + stockValueTWD;

    let netInvestedTWD = 0;
    
    // 1. Process Cash Flows (Deposits / Withdrawals)
    cashFlows.forEach(cf => {
      let amountFlowTWD = 0;
      if (cf.amountTWD && cf.amountTWD > 0) {
        amountFlowTWD = cf.amountTWD;
      } else {
         let flowRate = 1;
         if (isUSD) {
            flowRate = (cf.exchangeRate && cf.exchangeRate > 0) ? cf.exchangeRate : exchangeRate;
         } else if (isJPY) {
            flowRate = (cf.exchangeRate && cf.exchangeRate > 0) ? cf.exchangeRate : (jpyExchangeRate || exchangeRate);
         }
         amountFlowTWD = cf.amount * flowRate;
      }

      if (cf.accountId === acc.id) {
        if (cf.type === CashFlowType.DEPOSIT) {
          netInvestedTWD += amountFlowTWD;
        } else if (cf.type === CashFlowType.WITHDRAW) {
          netInvestedTWD -= amountFlowTWD;
        } else if (cf.type === CashFlowType.TRANSFER) {
          netInvestedTWD -= amountFlowTWD;
        }
      }
      
      if (cf.targetAccountId === acc.id && cf.type === CashFlowType.TRANSFER) {
        if (cf.exchangeRate) {
           const incomingVal = cf.amount * cf.exchangeRate; 
           netInvestedTWD += (isUSD ? incomingVal * exchangeRate : incomingVal);
        } else {
           netInvestedTWD += amountFlowTWD;
        }
      }
    });

    // 2. Process Stock Transfers (TRANSFER_IN / TRANSFER_OUT)
    transactions.forEach(tx => {
       if (tx.accountId !== acc.id) return;
       
       if (tx.type === TransactionType.TRANSFER_IN || tx.type === TransactionType.TRANSFER_OUT) {
          let baseVal = tx.price * tx.quantity;
          if (tx.market === Market.TW) baseVal = Math.floor(baseVal);
          
          const val = tx.amount !== undefined ? tx.amount : baseVal;
          let valTWD = 0;
          
          // 根據市場類型使用對應的匯率
          if (tx.market === Market.US || tx.market === Market.UK) {
              valTWD = val * exchangeRate;
          } else if (tx.market === Market.JP) {
              // 日本市場使用日幣匯率
              valTWD = jpyExchangeRate ? val * jpyExchangeRate : val * exchangeRate; // 如果沒有日幣匯率，回退到美元匯率
          } else {
              valTWD = val;
          }

          if (tx.type === TransactionType.TRANSFER_IN) {
              netInvestedTWD += valTWD;
          } else {
              netInvestedTWD -= valTWD;
          }
       }
    });

    const profitTWD = totalAssetsTWD - netInvestedTWD;
    const roi = netInvestedTWD > 0 ? (profitTWD / netInvestedTWD) * 100 : 0;

    return {
      id: acc.id,
      name: acc.name,
      currency: acc.currency,
      totalAssetsTWD,
      marketValueTWD: stockValueTWD,
      cashBalanceTWD: cashTWD,
      profitTWD,
      roi
    };
  });
};

export const calculateGenericXIRR = (flows: { amount: number, date: number }[]): number => {
  flows.sort((a, b) => a.date - b.date);
  if (flows.length < 2) return 0;
  
  const validFlows = flows.filter(f => Math.abs(f.amount) > 0.0001);
  if (validFlows.length < 2) return 0;

  const calculateSimpleAnnualizedROI = () => {
     let totalInvested = 0;
     let totalReturned = 0; 
     let minTime = validFlows[0].date;
     let maxTime = validFlows[validFlows.length-1].date;
     
     validFlows.forEach(f => {
         if (f.amount < 0) totalInvested += Math.abs(f.amount);
         else totalReturned += f.amount;
     });
     
     if (totalInvested === 0) return 0;
     const absoluteROI = (totalReturned - totalInvested) / totalInvested;
     const years = Math.max((maxTime - minTime) / (365 * 24 * 60 * 60 * 1000), 0.1); 
     
     return (Math.pow(1 + absoluteROI, 1 / years) - 1) * 100;
  };

  if (validFlows[validFlows.length-1].date === validFlows[0].date) {
      return 0;
  }

  let rate = 0.1; 
  
  for (let i = 0; i < 50; i++) {
      let fValue = 0;
      let fDerivative = 0;
      const t0 = validFlows[0].date;

      for (const flow of validFlows) {
          const years = (flow.date - t0) / (365 * 24 * 60 * 60 * 1000);
          const exp = Math.pow(1 + rate, years);
          fValue += flow.amount / exp;
          fDerivative -= (years * flow.amount) / (exp * (1 + rate));
      }

      if (Math.abs(fDerivative) < 1e-8) break;
      const newRate = rate - fValue / fDerivative;
      if (Math.abs(newRate - rate) < 1e-6) {
          return newRate * 100;
      }
      rate = newRate;
  }

  return calculateSimpleAnnualizedROI();
};

export const calculateXIRR = (
  cashFlows: CashFlow[],
  accounts: Account[],
  currentTotalValueTWD: number,
  exchangeRate: number
): number => {
  const xirrFlows: { amount: number, date: number }[] = [];

  cashFlows.forEach(cf => {
    if (cf.type !== CashFlowType.DEPOSIT && cf.type !== CashFlowType.WITHDRAW) return;

    let amountTWD = 0;
    if (cf.amountTWD && cf.amountTWD > 0) {
      amountTWD = cf.amountTWD;
    } else {
      const acc = accounts.find(a => a.id === cf.accountId);
      const isUSD = acc?.currency === Currency.USD;
      const rate = isUSD ? (cf.exchangeRate || exchangeRate) : 1;
      amountTWD = cf.amount * rate;
    }

    if (cf.type === CashFlowType.DEPOSIT) {
      xirrFlows.push({ amount: -amountTWD, date: new Date(cf.date).getTime() });
    } else if (cf.type === CashFlowType.WITHDRAW) {
      xirrFlows.push({ amount: amountTWD, date: new Date(cf.date).getTime() });
    }
  });

  xirrFlows.push({ amount: currentTotalValueTWD, date: Date.now() });

  return calculateGenericXIRR(xirrFlows);
};
