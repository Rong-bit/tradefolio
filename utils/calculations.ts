
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
  TransactionType
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
     
     // Calculate Cost/Proceeds
     // For BUY/TRANSFER_IN/DIVIDEND: Cost = Amount (if set) OR (Price * Qty + Fees)
     // For SELL/CASH_DIVIDEND/TRANSFER_OUT: Proceeds = Amount (if set) OR (Price * Qty - Fees)
     
     // Note: In calculateAccountBalances, Amount is strictly used if present. Here we do same logic.
     
     if (tx.type === TransactionType.BUY || tx.type === TransactionType.TRANSFER_IN || tx.type === TransactionType.DIVIDEND) {
       const txCost = tx.amount !== undefined ? tx.amount : (tx.price * tx.quantity + (tx.fees || 0));
       const newTotalCost = h.totalCost + txCost;
       const newQty = h.quantity + tx.quantity;
       h.avgCost = newQty > 0 ? newTotalCost / newQty : 0;
       h.totalCost = newTotalCost;
       h.quantity = newQty;
       
       // XIRR Flows
       const flowDate = new Date(tx.date).getTime();
       if (tx.type === TransactionType.BUY) {
          flows.push({ amount: -txCost, date: flowDate });
       } else if (tx.type === TransactionType.TRANSFER_IN) {
          // Transfer In acts as a Buy at that date's value
          flows.push({ amount: -txCost, date: flowDate });
       }
       // TransactionType.DIVIDEND (Reinvest) is NOT an external cash flow for Portfolio Performance, 
       // so we exclude it from XIRR flows to reflect true return on capital invested from outside.
       
     } else if (tx.type === TransactionType.SELL || tx.type === TransactionType.TRANSFER_OUT) {
       if (h.quantity > 0) {
         const ratio = tx.quantity / h.quantity;
         const costOfSold = h.totalCost * ratio;
         h.totalCost -= costOfSold;
         h.quantity -= tx.quantity;
         
         // XIRR Flows
         const proceeds = tx.amount !== undefined ? tx.amount : ((tx.price * tx.quantity) - (tx.fees || 0));
         const flowDate = new Date(tx.date).getTime();
         
         if (tx.type === TransactionType.SELL) {
            flows.push({ amount: proceeds, date: flowDate });
         } else {
            // Transfer Out acts as a Sell/Exit
            flows.push({ amount: proceeds, date: flowDate });
         }
       }
     } else if (tx.type === TransactionType.CASH_DIVIDEND) {
        // Cash Dividend is a return on investment (Inflow)
        const proceeds = tx.amount !== undefined ? tx.amount : ((tx.price * tx.quantity) - (tx.fees || 0));
        flows.push({ amount: proceeds, date: new Date(tx.date).getTime() });
     }
  });
  
  return Array.from(map.values())
    .filter(h => h.quantity > 0)
    .map(h => {
      const priceKey = `${h.market}-${h.ticker}`;
      const currentPrice = currentPrices[priceKey] || h.avgCost;
      const currentValue = currentPrice * h.quantity;
      const unrealizedPL = currentValue - h.totalCost;
      const unrealizedPLPercent = h.totalCost > 0 ? (unrealizedPL / h.totalCost) * 100 : 0;
      
      // XIRR Calculation
      const flows = flowsMap.get(`${h.accountId}-${h.ticker}`) || [];
      // Add current value as final positive flow (Hypothetical Sell today)
      const xirrFlows = [...flows, { amount: currentValue, date: Date.now() }];
      const annualizedReturn = calculateGenericXIRR(xirrFlows);

      // Price Details
      const details = priceDetails?.[priceKey];
      const dailyChange = details ? details.change : 0;
      const dailyChangePercent = details ? details.changePercent : 0;

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
    
    // 1. Cash Flows
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

    // 2. Transactions
    transactions.forEach(tx => {
       const cost = tx.amount !== undefined ? tx.amount : (tx.price * tx.quantity + (tx.fees || 0));
       
       if (tx.type === TransactionType.BUY) {
         balMap[tx.accountId] = (balMap[tx.accountId] || 0) - cost;
       } else if (tx.type === TransactionType.SELL) {
         const proceeds = tx.amount !== undefined ? tx.amount : ((tx.price * tx.quantity) - (tx.fees || 0));
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

export const generateAdvancedChartData = (
  transactions: Transaction[],
  cashFlows: CashFlow[],
  accounts: Account[],
  currentTotalValueTWD: number,
  exchangeRate: number
): ChartDataPoint[] => {
  const years = new Set<string>();
  const allDates = [...transactions.map(t => t.date), ...cashFlows.map(c => c.date)];
  if (allDates.length === 0) return [];

  const startYear = new Date(allDates.sort()[0]).getFullYear();
  const endYear = new Date().getFullYear();

  const data: ChartDataPoint[] = [];
  
  let cumulativeNetInvestedTWD = 0; 

  for (let y = startYear; y <= endYear; y++) {
    const flowsInYear = cashFlows.filter(c => new Date(c.date).getFullYear() === y);
    
    flowsInYear.forEach(cf => {
      const account = accounts.find(a => a.id === cf.accountId);
      const isUSD = account?.currency === Currency.USD;
      
      // 修改：使用歷史匯率計算成本
      let rate = isUSD ? exchangeRate : 1;
      if (isUSD && cf.exchangeRate && cf.exchangeRate > 0) {
        rate = cf.exchangeRate;
      }
      
      const amountTWD = cf.amount * rate;

      if (cf.type === CashFlowType.DEPOSIT) {
        cumulativeNetInvestedTWD += amountTWD;
      } else if (cf.type === CashFlowType.WITHDRAW) {
        cumulativeNetInvestedTWD -= amountTWD;
      }
    });

    const cost = Math.max(0, cumulativeNetInvestedTWD);
    
    const totalYears = endYear - startYear + 1;
    const currentYearIndex = y - startYear + 1;
    
    let totalAssets = 0;
    if (y === endYear) {
      totalAssets = currentTotalValueTWD;
    } else {
       const progress = currentYearIndex / totalYears;
       const totalProfit = currentTotalValueTWD - cumulativeNetInvestedTWD;
       totalAssets = cost + (totalProfit * progress);
    }
    
    const estTotalAssets = cost * Math.pow(1.08, currentYearIndex);
    const assetCostRatio = cost > 0 ? totalAssets / cost : 0;

    data.push({
      year: y.toString(),
      cost,
      totalAssets,
      estTotalAssets,
      assetCostRatio
    });
  }

  return data;
};

export const formatCurrency = (val: number, currency: string) => {
  try {
    if (!currency || currency.trim() === '' || currency.length !== 3) {
      return new Intl.NumberFormat('zh-TW', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(val);
    }

    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val);
  } catch (error) {
    return val.toLocaleString();
  }
};

export const calculateAssetAllocation = (
  holdings: Holding[],
  cashBalanceTWD: number,
  exchangeRate: number
): AssetAllocationItem[] => {
  const tickerMap: Record<string, number> = {};
  let totalValue = cashBalanceTWD;

  holdings.forEach(h => {
    const valTWD = h.market === Market.US ? h.currentValue * exchangeRate : h.currentValue;
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
      roi
    });
  }

  return items.reverse();
};

export const calculateAccountPerformance = (
  accounts: Account[],
  holdings: Holding[],
  cashFlows: CashFlow[],
  exchangeRate: number
): AccountPerformance[] => {
  return accounts.map(acc => {
    const isUSD = acc.currency === Currency.USD;
    const rate = isUSD ? exchangeRate : 1;

    const cashTWD = acc.balance * rate;
    const accountHoldings = holdings.filter(h => h.accountId === acc.id);
    const stockValueNative = accountHoldings.reduce((sum, h) => sum + h.currentValue, 0);
    const stockValueTWD = isUSD ? stockValueNative * rate : stockValueNative;
    const totalAssetsTWD = cashTWD + stockValueTWD;

    let netInvestedTWD = 0;
    
    cashFlows.forEach(cf => {
      // 修改：計算個別帳戶的投入成本時，也優先使用歷史匯率
      let flowRate = 1;
      if (isUSD) {
         flowRate = (cf.exchangeRate && cf.exchangeRate > 0) ? cf.exchangeRate : exchangeRate;
      }
      const amountNative = cf.amount;
      const amountFlowTWD = amountNative * flowRate;

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
        // Approximate incoming transfer value in TWD
        if (cf.exchangeRate) {
           // If exchange rate exists, it means cross currency. 
           // 這裡的邏輯比較複雜，通常跨幣別轉帳時，紀錄上的 exchangeRate 是指換匯匯率
           // 我們假設轉入金額以該匯率換算為目標貨幣價值
           const incomingVal = cf.amount * cf.exchangeRate; // Target Currency
           
           // 如果目標帳戶是 USD，我們再轉回 TWD (使用歷史匯率如果有的話，但轉帳通常是當下)
           // 簡化處理：轉入一律使用當前匯率或是紀錄上的匯率
           netInvestedTWD += (isUSD ? incomingVal * exchangeRate : incomingVal);
        } else {
           // 同幣別轉帳，或無匯率資訊
           netInvestedTWD += amountFlowTWD;
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

/**
 * Generic XIRR Calculator
 * @param flows Array of { amount: number, date: number (timestamp) }
 * @returns annualized return percentage (e.g. 10.5 for 10.5%)
 */
export const calculateGenericXIRR = (flows: { amount: number, date: number }[]): number => {
  // Sort
  flows.sort((a, b) => a.date - b.date);
  
  if (flows.length < 2) return 0;
  
  // Filter out tiny amounts to avoid numeric issues
  const validFlows = flows.filter(f => Math.abs(f.amount) > 0.0001);
  if (validFlows.length < 2) return 0;

  // If all transactions are on same day, cannot calculate efficiently
  // Treat as immediate return: (Final - Initial) / Initial
  if (validFlows[validFlows.length-1].date === validFlows[0].date) {
      const totalFlow = validFlows.reduce((sum, f) => sum + f.amount, 0);
      // If total flow is positive, it means profit, but XIRR over 0 days is infinity.
      // We return 0 to avoid display error.
      return 0;
  }

  const minDate = validFlows[0].date;
  const normalizedFlows = validFlows.map(f => ({
    amount: f.amount,
    years: (f.date - minDate) / (365 * 24 * 60 * 60 * 1000)
  }));

  // Newton-Raphson iteration
  let rate = 0.1; // Initial guess 10%
  const maxIter = 50;

  for(let i=0; i<maxIter; i++) {
     let f = 0;
     let df = 0;
     for(const flow of normalizedFlows) {
        // formula: sum (amount / (1+r)^years) = 0
        const factor = Math.pow(1+rate, flow.years);
        if (factor === 0 || !isFinite(factor)) continue; 
        f += flow.amount / factor;
        df -= (flow.years * flow.amount) / (factor * (1+rate));
     }
     
     if(Math.abs(f) < 1e-5) break; // Converged
     if(Math.abs(df) < 1e-9) break; // Avoid div by zero
     
     const newRate = rate - f/df;
     
     if(isNaN(newRate) || !isFinite(newRate)) return 0;
     
     if(Math.abs(newRate - rate) < 1e-5) {
        rate = newRate;
        break;
     }
     rate = newRate;
  }
  
  if (isNaN(rate) || !isFinite(rate)) return 0;
  return rate * 100;
}

/**
 * 計算 XIRR (內部報酬率) for Portfolio
 */
export const calculateXIRR = (
  cashFlows: CashFlow[],
  accounts: Account[],
  currentTotalAssetsTWD: number,
  defaultExchangeRate: number
): number => {
  const xirrInputs: { amount: number, date: number }[] = [];

  // 1. 整理過去的現金流
  cashFlows.forEach(cf => {
    // 只計算外部資金進出 (Deposit/Withdraw)
    if (cf.type !== CashFlowType.DEPOSIT && cf.type !== CashFlowType.WITHDRAW) return;

    const account = accounts.find(a => a.id === cf.accountId);
    if (!account) return;

    // 計算台幣金額
    let amountTWD = 0;
    if (cf.amountTWD && cf.amountTWD > 0) {
       amountTWD = cf.amountTWD;
    } else {
       const isUSD = account.currency === Currency.USD;
       const rate = isUSD ? (cf.exchangeRate || defaultExchangeRate) : 1;
       const baseAmount = cf.amount;
       const fee = cf.fee || 0;
       
       if (cf.type === CashFlowType.DEPOSIT) {
          amountTWD = (baseAmount * rate) + fee;
       } else {
          amountTWD = (baseAmount * rate) - fee;
       }
    }

    // XIRR 符號規則：Deposit (投資) -> 負值, Withdraw (回收) -> 正值
    const sign = cf.type === CashFlowType.DEPOSIT ? -1 : 1;
    
    xirrInputs.push({
      amount: amountTWD * sign,
      date: new Date(cf.date).getTime()
    });
  });

  // 2. 加入目前總資產 (視為今日全部贖回 -> 正值)
  xirrInputs.push({
    amount: currentTotalAssetsTWD,
    date: new Date().getTime()
  });

  return calculateGenericXIRR(xirrInputs);
};
