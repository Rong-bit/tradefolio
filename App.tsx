
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Holding, PortfolioSummary, ChartDataPoint, Market, Account, CashFlow, TransactionType, AssetAllocationItem, AnnualPerformanceItem, AccountPerformance, CashFlowType, Currency, HistoricalData } from './types';
import { calculateHoldings, calculateAccountBalances, generateAdvancedChartData, calculateAssetAllocation, calculateAnnualPerformance, calculateAccountPerformance, calculateXIRR } from './utils/calculations';
import TransactionForm from './components/TransactionForm';
import HoldingsTable from './components/HoldingsTable';
import Dashboard from './components/Dashboard';
import AccountManager from './components/AccountManager';
import FundManager from './components/FundManager';
import RebalanceView from './components/RebalanceView';
import HelpView from './components/HelpView';
import BatchImportModal from './components/BatchImportModal';
import HistoricalDataModal from './components/HistoricalDataModal';
import { fetchCurrentPrices } from './services/yahooFinanceService';
import { ADMIN_EMAIL, SYSTEM_ACCESS_CODE, GLOBAL_AUTHORIZED_USERS } from './config';
import { v4 as uuidv4 } from 'uuid';

type View = 'dashboard' | 'history' | 'funds' | 'accounts' | 'rebalance' | 'help';

// 全局覆蓋 confirm 函數
let globalDebugLogs: string[] = [];
let globalSetDebugLogs: ((logs: string[]) => void) | null = null;

window.confirm = function(message?: string): boolean {
  const logEntry = `🚨 CONFIRM() 調用 - ${new Date().toISOString()}\n訊息: ${message}`;
  globalDebugLogs = [...globalDebugLogs.slice(-9), logEntry];
  if (globalSetDebugLogs) globalSetDebugLogs([...globalDebugLogs]);
  return false;
};

window.alert = function(message?: string): void {
  console.warn('⚠️ ALERT() 被調用了！', message);
};

const App: React.FC = () => {
  useEffect(() => {
    globalSetDebugLogs = setDebugLogs;
    setDebugLogs([...globalDebugLogs]);
    return () => { globalSetDebugLogs = null; };
  }, []);

  // --- State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [loginEmail, setLoginEmail] = useState(''); 
  const [loginPassword, setLoginPassword] = useState('');
  const [currentUser, setCurrentUser] = useState(''); 
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cashFlows, setCashFlows] = useState<CashFlow[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [priceDetails, setPriceDetails] = useState<Record<string, { change: number, changePercent: number }>>({});
  const [exchangeRate, setExchangeRate] = useState<number>(31.5);
  const [rebalanceTargets, setRebalanceTargets] = useState<Record<string, number>>({});
  const [historicalData, setHistoricalData] = useState<HistoricalData>({}); 
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isTransactionDeleteConfirmOpen, setIsTransactionDeleteConfirmOpen] = useState(false);
  const [isHistoricalModalOpen, setIsHistoricalModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [alertDialog, setAlertDialog] = useState<{isOpen: boolean, title: string, message: string, type: 'info' | 'success' | 'error'}>({
    isOpen: false, title: '', message: '', type: 'info'
  });
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [view, setView] = useState<View>('dashboard');
  const [hasAutoUpdated, setHasAutoUpdated] = useState(false);
  
  // 篩選狀態
  const [filterAccount, setFilterAccount] = useState<string>('');
  const [filterTicker, setFilterTicker] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [includeCashFlow, setIncludeCashFlow] = useState<boolean>(true);

  // --- HelpView Confirm Override ---
  useEffect(() => {
    if (view === 'help') {
      const tempConfirm = window.confirm;
      window.confirm = (message?: string) => {
        if (message && (message.includes('匯入') || message.includes('覆蓋') || message.includes('警告'))) return true;
        return true;
      };
      return () => { window.confirm = tempConfirm; };
    }
  }, [view]);

  useEffect(() => {
    const lastUser = localStorage.getItem('tf_last_user');
    const isAuth = localStorage.getItem('tf_is_auth');
    const guestStatus = localStorage.getItem('tf_is_guest');
    
    if (isAuth === 'true' && lastUser) {
      if (guestStatus === 'true') {
        setCurrentUser(lastUser === 'Guest' ? 'Guest' : lastUser);
        setIsGuest(true);
        setIsAuthenticated(true);
      } else {
        setCurrentUser(lastUser);
        setIsAuthenticated(true);
        setIsGuest(false);
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const email = loginEmail.trim();
    const password = loginPassword.trim();
    
    if (!email) return showAlert("請輸入 Email 信箱", "登入錯誤", "error");

    // 1. Admin Login
    if (email === ADMIN_EMAIL) {
      if (password === SYSTEM_ACCESS_CODE) {
        loginSuccess(email, false);
        showAlert(`歡迎回來，管理員！`, "登入成功", "success");
        return;
      } else {
        return showAlert("管理員密碼錯誤", "登入失敗", "error");
      }
    }

    // 2. Authorized Login
    if (GLOBAL_AUTHORIZED_USERS.includes(email)) {
      loginSuccess(email, false);
      return;
    }

    // 3. Unauthorized - Guest Login
    loginSuccess(email, true);
    showAlert("已為您登入「非會員模式」。\n\n您尚未註冊，若需開通會員模式，請按'申請開通'發送申請信通知管理員開通權限。", "登入成功", "info");
  };

  const handleContactAdmin = () => {
    const subject = encodeURIComponent("TradeFolio 購買/權限開通申請");
    const body = encodeURIComponent(`Hi 管理員,\n\n我的帳號是: ${currentUser}\n\n我目前是訪客身份，希望申請/購買完整權限。\n\n請協助處理，謝謝。`);
    window.location.href = `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;
  };

  const loginSuccess = (user: string, isGuestUser: boolean) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setIsGuest(isGuestUser);
    localStorage.setItem('tf_is_auth', 'true');
    localStorage.setItem('tf_last_user', user);
    localStorage.setItem('tf_is_guest', isGuestUser ? 'true' : 'false');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsGuest(false);
    setCurrentUser('');
    setLoginEmail('');
    setLoginPassword('');
    localStorage.removeItem('tf_is_auth');
    localStorage.removeItem('tf_last_user');
    localStorage.removeItem('tf_is_guest');
    
    setTransactions([]);
    setAccounts([]);
    setCashFlows([]);
    setCurrentPrices({});
    setPriceDetails({});
    setExchangeRate(31.5);
    setRebalanceTargets({});
    setHistoricalData({});
    setHasAutoUpdated(false); // 重置自動更新狀態
  };

  // --- Persistence: LOAD DATA ---
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    const getKey = (key: string) => `tf_${currentUser}_${key}`;
    const load = (key: string, defaultVal: any) => {
        const item = localStorage.getItem(getKey(key));
        return item ? JSON.parse(item) : defaultVal;
    };
    
    setTransactions(load('transactions', []));
    setAccounts(load('accounts', []));
    setCashFlows(load('cashFlows', []));
    setCurrentPrices(load('prices', {}));
    setPriceDetails(load('priceDetails', {}));
    
    const rate = localStorage.getItem(getKey('exchangeRate'));
    setExchangeRate(rate ? parseFloat(rate) : 31.5);
    
    setRebalanceTargets(load('rebalanceTargets', {}));
    setHistoricalData(load('historicalData', {}));

  }, [isAuthenticated, currentUser]);

  // --- Persistence: SAVE DATA ---
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    const getKey = (key: string) => `tf_${currentUser}_${key}`;
    localStorage.setItem(getKey('transactions'), JSON.stringify(transactions));
    localStorage.setItem(getKey('accounts'), JSON.stringify(accounts));
    localStorage.setItem(getKey('cashFlows'), JSON.stringify(cashFlows));
    localStorage.setItem(getKey('prices'), JSON.stringify(currentPrices));
    localStorage.setItem(getKey('priceDetails'), JSON.stringify(priceDetails));
    localStorage.setItem(getKey('exchangeRate'), exchangeRate.toString());
    localStorage.setItem(getKey('rebalanceTargets'), JSON.stringify(rebalanceTargets));
    localStorage.setItem(getKey('historicalData'), JSON.stringify(historicalData));
  }, [transactions, accounts, cashFlows, currentPrices, priceDetails, exchangeRate, rebalanceTargets, historicalData, isAuthenticated, currentUser]);

  const showAlert = (message: string, title: string = '提示', type: 'info' | 'success' | 'error' = 'info') => {
    setAlertDialog({ isOpen: true, title, message, type });
  };
  const closeAlert = () => setAlertDialog(prev => ({ ...prev, isOpen: false }));

  const addTransaction = (tx: Transaction) => {
    setTransactions(prev => [...prev, tx]);
    const key = `${tx.market}-${tx.ticker}`;
    if (!currentPrices[key]) updatePrice(key, tx.price);
  };
  const addBatchTransactions = (txs: Transaction[]) => {
    setTransactions(prev => [...prev, ...txs]);
    const newPrices = { ...currentPrices };
    txs.forEach(tx => {
      const key = `${tx.market}-${tx.ticker}`;
      if (!newPrices[key] && tx.price > 0) newPrices[key] = tx.price;
    });
    setCurrentPrices(newPrices);
  };
  const removeTransaction = (id: string) => {
    setTransactionToDelete(id);
    setIsTransactionDeleteConfirmOpen(true);
  };
  const confirmRemoveTransaction = () => {
    if (transactionToDelete) {
      setTransactions(prev => prev.filter(t => t.id !== transactionToDelete));
      showAlert("交易記錄已刪除", "刪除成功", "success");
    }
    setIsTransactionDeleteConfirmOpen(false);
    setTransactionToDelete(null);
  };
  const handleClearAllTransactions = () => setIsDeleteConfirmOpen(true);
  const confirmDeleteAllTransactions = () => {
    const count = transactions.length;
    setTransactions([]);
    setIsDeleteConfirmOpen(false);
    setTimeout(() => showAlert(`✅ 成功清空 ${count} 筆交易紀錄！`, "刪除成功", "success"), 100);
  };
  const cancelDeleteAllTransactions = () => setIsDeleteConfirmOpen(false);
  
  const addAccount = (acc: Account) => setAccounts(prev => [...prev, acc]);
  const removeAccount = (id: string) => {
    const account = accounts.find(a => a.id === id);
    setAccounts(prev => prev.filter(a => a.id !== id));
    showAlert(`帳戶「${account?.name}」已刪除`, "刪除成功", "success");
  };
  
  const addCashFlow = (cf: CashFlow) => setCashFlows(prev => [...prev, cf]);
  const addBatchCashFlows = (cfs: CashFlow[]) => setCashFlows(prev => [...prev, ...cfs]);
  const removeCashFlow = (id: string) => {
    setCashFlows(prev => prev.filter(c => c.id !== id));
    showAlert(`現金流紀錄已刪除`, "刪除成功", "success");
  };
  
  const handleClearAllCashFlows = () => {
     setCashFlows([]);
     showAlert("✅ 成功清空所有資金紀錄！", "刪除成功", "success");
  };

  const updatePrice = (key: string, price: number) => setCurrentPrices(prev => ({ ...prev, [key]: price }));
  const updateRebalanceTargets = (newTargets: Record<string, number>) => setRebalanceTargets(newTargets);
  const handleOpenHistoricalModal = () => setIsHistoricalModalOpen(true);
  
  const handleSaveHistoricalData = (newData: HistoricalData) => {
      setHistoricalData(newData);
      showAlert("歷史資產數據更新完成！報表已根據真實股價修正。", "更新成功", "success");
  };

  const handleExportData = () => {
    try {
      const exportData = { 
        version: "2.0", 
        user: currentUser, 
        timestamp: new Date().toISOString(), 
        transactions, 
        accounts, 
        cashFlows, 
        currentPrices, 
        priceDetails, 
        exchangeRate, 
        rebalanceTargets, 
        historicalData 
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Sanitize filename
      const safeUser = (currentUser || 'guest').replace(/[^a-zA-Z0-9@._-]/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `tradefolio_${safeUser}_${dateStr}.json`;
      
      document.body.appendChild(link);
      link.click();
      
      // Delay cleanup to ensure browser captures the click
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

    } catch (err) {
      console.error("Export failed:", err);
      showAlert(`備份失敗：${err instanceof Error ? err.message : String(err)}`, "錯誤", "error");
    }
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.transactions && !data.accounts) throw new Error("Invalid format");
        if (data.accounts) setAccounts(data.accounts);
        if (data.transactions) setTransactions(data.transactions);
        if (data.cashFlows) setCashFlows(data.cashFlows);
        if (data.currentPrices) setCurrentPrices(data.currentPrices);
        if (data.priceDetails) setPriceDetails(data.priceDetails);
        if (data.exchangeRate) setExchangeRate(data.exchangeRate);
        if (data.rebalanceTargets) setRebalanceTargets(data.rebalanceTargets);
        if (data.historicalData) setHistoricalData(data.historicalData);
        showAlert(`成功還原資料！`, "還原成功", "success");
      } catch (err) {
        showAlert("匯入失敗：檔案格式錯誤。", "匯入失敗", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleAutoUpdatePrices = async (silent: boolean = false) => {
    // 使用 baseHoldings 或從 transactions 提取唯一的 ticker
    const holdingsToUse = baseHoldings.length > 0 ? baseHoldings : holdings;
    const holdingKeys = holdingsToUse.map((h: Holding) => ({ market: h.market, ticker: h.ticker, key: `${h.market}-${h.ticker}` }));
    
    // 建立 ticker 到 market 的對應關係，同時建立原始 ticker 到查詢 ticker 的映射
    const tickerMarketMap = new Map<string, 'US' | 'TW'>();
    const tickerToQueryTickerMap = new Map<string, string>(); // 原始 ticker -> 查詢用的 ticker
    
    holdingKeys.forEach((h: { market: Market, ticker: string, key: string }) => {
      let queryTicker = h.ticker;
      if (h.market === Market.TW && !queryTicker.includes('TPE:') && !queryTicker.includes('TW') && !queryTicker.match(/^\d{4}$/)) {
        queryTicker = `TPE:${queryTicker}`;
      }
      if (h.market === Market.TW && queryTicker.match(/^\d{4}$/)) {
        queryTicker = `TPE:${queryTicker}`;
      }
      tickerMarketMap.set(queryTicker, h.market === Market.TW ? 'TW' : 'US');
      tickerToQueryTickerMap.set(h.key, queryTicker); // 儲存映射關係
    });
    
    const queryList: string[] = Array.from(tickerMarketMap.keys());
    const marketsList = queryList.map(t => tickerMarketMap.get(t)!);
    
    if (queryList.length === 0) return;

    try {
      const result = await fetchCurrentPrices(queryList, marketsList);
      
      const newPrices: Record<string, number> = {};
      const newDetails: Record<string, { change: number, changePercent: number }> = {};
      
      // 使用映射關係來匹配價格資料
      console.log('🔍 開始匹配價格資料，查詢結果:', result.prices);
      console.log('📋 查詢的 ticker 列表:', queryList);
      console.log('🗺️ Ticker 映射關係:', Array.from(tickerToQueryTickerMap.entries()));
      
      holdingKeys.forEach((h: { market: Market, ticker: string, key: string }) => {
          const queryTicker = tickerToQueryTickerMap.get(h.key) || h.ticker;
          
          // 優先使用查詢 ticker 匹配
          let match = result.prices[queryTicker];
          
          // 如果找不到，嘗試其他可能的格式
          if (!match) {
            match = result.prices[h.ticker] || result.prices[`TPE:${h.ticker}`];
          }
          
          // 最後嘗試模糊匹配
          if (!match) {
            const foundKey = Object.keys(result.prices).find(k => 
              k.toLowerCase() === h.ticker.toLowerCase() || 
              k.toLowerCase() === queryTicker.toLowerCase() ||
              k.toLowerCase() === `tpe:${h.ticker}`.toLowerCase() ||
              k.endsWith(h.ticker) ||
              (h.ticker.length >= 4 && k.includes(h.ticker))
            );
            if (foundKey) match = result.prices[foundKey];
          }
          
          if (match) {
            const price = match.price;
            // 確保即使 change 為 0 也保存（可能是平盤）
            const change = match.change !== undefined ? match.change : 0;
            const changePercent = match.changePercent !== undefined ? match.changePercent : 0;
            newPrices[h.key] = price;
            newDetails[h.key] = { change, changePercent };
            console.log(`✅ 匹配成功: ${h.key} -> 價格: ${price}, 漲跌: ${change}, 漲跌幅: ${changePercent}%`);
          } else {
            console.warn(`⚠️ 無法匹配: ${h.key} (查詢 ticker: ${queryTicker}, 原始 ticker: ${h.ticker})`);
          }
      });
      
      console.log('💰 最終價格資料:', newPrices);
      console.log('📊 最終漲跌資料:', newDetails);
      
      setCurrentPrices(prev => ({ ...prev, ...newPrices }));
      setPriceDetails(prev => ({ ...prev, ...newDetails }));

      // 自動更新匯率邏輯
      let msg = `成功更新 ${Object.keys(newPrices).length} 筆股價`;
      if (result.exchangeRate && result.exchangeRate > 0) {
        setExchangeRate(result.exchangeRate);
        msg += `，並同步更新匯率為 ${result.exchangeRate}`;
      }

      // 只有在非靜默模式下才顯示提示
      if (!silent) {
        showAlert(msg, "更新完成", "success");
      }
    } catch (error) {
      console.error(error);
      if (!silent) {
        showAlert("自動更新失敗", "錯誤", "error");
      }
    }
  };

  // --- Calculations ---
  // 1. Calculate Base Holdings (Prices, Values, but Weight is 0)
  const baseHoldings = useMemo(() => calculateHoldings(transactions, currentPrices, priceDetails), [transactions, currentPrices, priceDetails]);
  
  const computedAccounts = useMemo(() => calculateAccountBalances(accounts, cashFlows, transactions), [accounts, cashFlows, transactions]);

  const summary = useMemo<PortfolioSummary>(() => {
    let netInvestedTWD = 0;
    let totalUsdInflow = 0;
    let totalTwdCostForUsd = 0;

    cashFlows.forEach(cf => {
       const account = accounts.find(a => a.id === cf.accountId);
       
       // 1. Calculate Net Invested (Cost)
       if(cf.type === CashFlowType.DEPOSIT) {
           const rate = (cf.exchangeRate || (account?.currency === Currency.USD ? exchangeRate : 1));
           netInvestedTWD += (cf.amountTWD || cf.amount * rate);
       } else if (cf.type === CashFlowType.WITHDRAW) {
           const rate = (cf.exchangeRate || (account?.currency === Currency.USD ? exchangeRate : 1));
           netInvestedTWD -= (cf.amountTWD || cf.amount * rate);
       }

       // 2. Calculate Avg Exchange Rate (Accumulate USD Inflows)
       if (cf.type === CashFlowType.DEPOSIT && account?.currency === Currency.USD) {
           totalUsdInflow += cf.amount;
           const cost = cf.amountTWD || (cf.amount * (cf.exchangeRate || exchangeRate));
           totalTwdCostForUsd += cost;
       }
       
       if (cf.type === CashFlowType.TRANSFER && cf.targetAccountId) {
           const targetAccount = accounts.find(a => a.id === cf.targetAccountId);
           if (account?.currency === Currency.TWD && targetAccount?.currency === Currency.USD) {
               const costTwd = cf.amount;
               let usdReceived = 0;
               if (cf.exchangeRate && cf.exchangeRate > 0) {
                   usdReceived = cf.amount / cf.exchangeRate;
               } else {
                   usdReceived = cf.amount / exchangeRate;
               }
               totalUsdInflow += usdReceived;
               totalTwdCostForUsd += costTwd;
           }
       }
    });

    const stockValueTWD = baseHoldings.reduce((sum: number, h: Holding) => sum + (h.market === Market.US ? h.currentValue * exchangeRate : h.currentValue), 0);
    const cashValueTWD = computedAccounts.reduce((sum: number, a: Account) => sum + (a.currency === Currency.USD ? a.balance * exchangeRate : a.balance), 0);
    const totalValueTWD = stockValueTWD;
    const totalAssets = totalValueTWD + cashValueTWD;
    const totalPLTWD = totalAssets - netInvestedTWD;
    const totalPLPercent = netInvestedTWD > 0 ? (totalPLTWD / netInvestedTWD) * 100 : 0;
    const annualizedReturn = calculateXIRR(cashFlows, accounts, totalAssets, exchangeRate);
    
    const accumulatedCashDividendsTWD = transactions.filter(t => t.type === TransactionType.CASH_DIVIDEND).reduce((sum, t) => {
        const amt = t.amount || (t.price * t.quantity);
        return sum + (t.market === Market.US ? amt * exchangeRate : amt);
    }, 0);

    const accumulatedStockDividendsTWD = transactions.filter(t => t.type === TransactionType.DIVIDEND).reduce((sum, t) => {
        const amt = t.amount || (t.price * t.quantity);
        return sum + (t.market === Market.US ? amt * exchangeRate : amt);
    }, 0);

    const avgExchangeRate = totalUsdInflow > 0 ? totalTwdCostForUsd / totalUsdInflow : 0;

    return {
        totalCostTWD: 0,
        totalValueTWD,
        totalPLTWD,
        totalPLPercent,
        cashBalanceTWD: cashValueTWD,
        netInvestedTWD,
        annualizedReturn,
        exchangeRateUsdToTwd: exchangeRate,
        accumulatedCashDividendsTWD,
        accumulatedStockDividendsTWD,
        avgExchangeRate
    };
  }, [baseHoldings, computedAccounts, cashFlows, exchangeRate, accounts, transactions]);

  // Step 4: Final Holdings with Weights
  const holdings = useMemo(() => {
    const totalAssets = summary.totalValueTWD + summary.cashBalanceTWD;
    return baseHoldings.map(h => {
        const valTwd = h.market === Market.US ? h.currentValue * exchangeRate : h.currentValue;
        return {
            ...h,
            weight: totalAssets > 0 ? (valTwd / totalAssets) * 100 : 0
        };
    });
  }, [baseHoldings, summary, exchangeRate]);

  // --- Auto Update Prices on Load ---
  useEffect(() => {
    // 當用戶已登入、有持倉、且尚未自動更新時，自動更新一次
    if (isAuthenticated && baseHoldings.length > 0 && !hasAutoUpdated) {
      // 延遲 1.5 秒後自動更新，確保數據已載入完成
      const timer = setTimeout(() => {
        handleAutoUpdatePrices(true); // silent mode，不顯示提示
        setHasAutoUpdated(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, baseHoldings.length, hasAutoUpdated]);

  const chartData = useMemo(() => generateAdvancedChartData(transactions, cashFlows, accounts, summary.totalValueTWD + summary.cashBalanceTWD, exchangeRate, historicalData), [transactions, cashFlows, accounts, summary, exchangeRate, historicalData]);
  const assetAllocation = useMemo(() => calculateAssetAllocation(holdings, summary.cashBalanceTWD, exchangeRate), [holdings, summary, exchangeRate]);
  const annualPerformance = useMemo(() => calculateAnnualPerformance(chartData), [chartData]);
  const accountPerformance = useMemo(() => calculateAccountPerformance(computedAccounts, holdings, cashFlows, transactions, exchangeRate), [computedAccounts, holdings, cashFlows, transactions, exchangeRate]);

  // --- Filtering & Balance Calculation Logic (Merged) ---
  const combinedRecords = useMemo(() => {
    // 1. Transform Transactions
    const transactionRecords = transactions.map(tx => {
      let calculatedAmount = 0;
      if ((tx as any).amount !== undefined && (tx as any).amount !== null) {
        calculatedAmount = (tx as any).amount;
      } else {
        if (tx.type === TransactionType.BUY || tx.type === TransactionType.TRANSFER_OUT) {
          calculatedAmount = tx.price * tx.quantity + (tx.fees || 0);
        } else if (tx.type === TransactionType.SELL) {
          calculatedAmount = tx.price * tx.quantity - (tx.fees || 0);
        } else {
          calculatedAmount = tx.price * tx.quantity;
        }
      }
      return {
        id: tx.id,
        date: tx.date,
        accountId: tx.accountId,
        type: 'TRANSACTION' as const,
        subType: tx.type,
        ticker: tx.ticker,
        market: tx.market,
        price: tx.price,
        quantity: tx.quantity,
        amount: calculatedAmount,
        fees: tx.fees || 0,
        description: `${tx.market}-${tx.ticker}`,
        originalRecord: tx
      };
    });

    // 2. Transform Cash Flows
    const cashFlowRecords: any[] = [];
    cashFlows.forEach(cf => {
      cashFlowRecords.push({
        id: cf.id,
        date: cf.date,
        accountId: cf.accountId,
        type: 'CASHFLOW' as const,
        subType: cf.type,
        ticker: '',
        market: '',
        price: 0,
        quantity: 0,
        amount: cf.amount,
        fees: 0,
        description: cf.note || cf.type,
        originalRecord: cf,
        targetAccountId: cf.targetAccountId,
        exchangeRate: cf.exchangeRate,
        isSourceRecord: true
      });
      
      if (cf.type === 'TRANSFER' && cf.targetAccountId) {
        const targetAmount = cf.exchangeRate ? cf.amount * cf.exchangeRate : cf.amount;
        cashFlowRecords.push({
          id: `${cf.id}-target`,
          date: cf.date,
          accountId: cf.targetAccountId,
          type: 'CASHFLOW' as const,
          subType: 'TRANSFER_IN' as const,
          ticker: '',
          market: '',
          price: 0,
          quantity: 0,
          amount: targetAmount,
          fees: 0,
          description: `轉入自 ${accounts.find(a => a.id === cf.accountId)?.name || '未知帳戶'}`,
          originalRecord: cf,
          sourceAccountId: cf.accountId,
          exchangeRate: cf.exchangeRate,
          isTargetRecord: true
        });
      }
    });

    // 3. Sorting Function for Display (Date Descending)
    const displayOrderRecords = [...transactionRecords, ...cashFlowRecords].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA;
      
      const getDisplayTypeOrder = (record: any) => {
        if (record.type === 'CASHFLOW') {
          if (record.subType === 'WITHDRAW') return 1;
          if (record.subType === 'TRANSFER') return 1;
          if (record.subType === 'INTEREST') return 3;
          if (record.subType === 'DEPOSIT') return 5;
          if (record.subType === 'TRANSFER_IN') return 5;
        }
        if (record.type === 'TRANSACTION') {
          if (record.subType === 'BUY') return 2;
          if (record.subType === 'CASH_DIVIDEND' || record.subType === 'DIVIDEND') return 3;
          if (record.subType === 'INTEREST') return 3;
          if (record.subType === 'SELL') return 4;
        }
        return 6;
      };
      
      const orderA = getDisplayTypeOrder(a);
      const orderB = getDisplayTypeOrder(b);
      if (orderA !== orderB) return orderA - orderB;
      
      const getNumericId = (id: string) => {
        const match = id.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      };
      return getNumericId(a.id.toString()) - getNumericId(b.id.toString());
    });

    // 4. Calculate Balance Changes
    const calculateBalanceChange = (record: any) => {
      let balanceChange = 0;
      if (record.type === 'TRANSACTION') {
        const tx = record.originalRecord as Transaction;
        const recordAmount = record.amount;
        if (tx.type === TransactionType.BUY) balanceChange = -recordAmount;
        else if (tx.type === TransactionType.SELL) balanceChange = recordAmount;
        else if (tx.type === TransactionType.CASH_DIVIDEND) balanceChange = recordAmount;
        else if (tx.type === TransactionType.DIVIDEND) balanceChange = 0;
        else if (tx.type === TransactionType.TRANSFER_IN) balanceChange = -record.fees; // Only fees affect cash for stock transfer
        else if (tx.type === TransactionType.TRANSFER_OUT) balanceChange = -record.fees; // Only fees affect cash for stock transfer
      } else if (record.type === 'CASHFLOW') {
        if (record.subType === 'DEPOSIT') balanceChange = record.amount;
        else if (record.subType === 'WITHDRAW') balanceChange = -record.amount;
        else if (record.subType === 'TRANSFER') balanceChange = -record.amount;
        else if (record.subType === 'TRANSFER_IN') balanceChange = record.amount;
        else if (record.subType === 'INTEREST') balanceChange = record.amount;
      }
      return balanceChange;
    };
    
    // 5. Calculate Running Balances (Time Ascending)
    const timeOrderRecords = [...displayOrderRecords].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      
      const getCalculationTypeOrder = (record: any) => {
        if (record.type === 'CASHFLOW') {
          if (record.subType === 'DEPOSIT') return 1;
          if (record.subType === 'TRANSFER_IN') return 1;
          if (record.subType === 'INTEREST') return 2;
          if (record.subType === 'WITHDRAW') return 5;
          if (record.subType === 'TRANSFER') return 5;
        }
        if (record.type === 'TRANSACTION') {
          if (record.subType === 'CASH_DIVIDEND' || record.subType === 'DIVIDEND') return 2;
          if (record.subType === 'INTEREST') return 2;
          if (record.subType === 'SELL') return 3;
          if (record.subType === 'BUY') return 4;
        }
        return 6;
      };
      const orderA = getCalculationTypeOrder(a);
      const orderB = getCalculationTypeOrder(b);
      if (orderA !== orderB) return orderA - orderB;
      
      const getNumericId = (id: string) => {
        const match = id.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      };
      return getNumericId(b.id.toString()) - getNumericId(a.id.toString());
    });
    
    const accountBalances: Record<string, number> = {};
    const balanceMap = new Map<string, number>();
    
    timeOrderRecords.forEach(record => {
      const accountId = record.accountId;
      const balanceChange = calculateBalanceChange(record);
      if (!(accountId in accountBalances)) accountBalances[accountId] = 0;
      accountBalances[accountId] += balanceChange;
      balanceMap.set(record.id, accountBalances[accountId]);
    });
    
    // 6. Map balances back to display records
    return displayOrderRecords.map(record => ({
      ...record,
      balance: balanceMap.get(record.id) || 0,
      balanceChange: calculateBalanceChange(record)
    }));

  }, [transactions, cashFlows, accounts]); // Added accounts dependency

  const filteredRecords = useMemo(() => {
    // 使用 combinedRecords 的結果進行過濾，保留其已計算好的正確餘額與排序
    return combinedRecords.filter(record => {
      // 1. Account Filter
      if (filterAccount && record.accountId !== filterAccount) return false;
      
      // 2. Cash Flow Filter
      if (!includeCashFlow && record.type === 'CASHFLOW') return false;
      
      // 3. Ticker Filter
      if (filterTicker && record.type === 'TRANSACTION') {
        if (!record.ticker.toLowerCase().includes(filterTicker.toLowerCase())) return false;
      }
      
      // 4. Date Filter
      if (filterDateFrom || filterDateTo) {
         const recordDate = new Date(record.date);
         if (filterDateFrom && recordDate < new Date(filterDateFrom)) return false;
         if (filterDateTo && recordDate > new Date(filterDateTo)) return false;
      }
      
      return true;
    });
  }, [combinedRecords, filterAccount, filterTicker, filterDateFrom, filterDateTo, includeCashFlow]);

  const clearFilters = () => {
    setFilterAccount('');
    setFilterTicker('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setIncludeCashFlow(true);
  };

  // --- View Logic (Guest vs Member) ---
  const availableViews: View[] = isGuest 
    ? ['dashboard', 'history', 'funds', 'accounts', 'help']
    : ['dashboard', 'history', 'funds', 'accounts', 'rebalance', 'help'];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                T
              </div>
              <h1 className="mt-4 text-2xl font-bold text-slate-800">TradeFolio 登入</h1>
              <p className="mt-2 text-slate-500 text-sm">台美股資產管理系統</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input 
                  type="email" 
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-md p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <input 
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-md p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="授權使用者無需輸入"
                />
              </div>

              <button 
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
              >
                登入
              </button>
            </form>

            <div className="mt-8">
              <div className="p-4 bg-blue-50 border-2 border-dashed border-blue-400 rounded-xl text-center shadow-sm">
                  <p className="text-sm font-bold text-blue-900 flex flex-col items-center gap-1">
                      <span className="flex items-center gap-1 text-blue-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        隱私聲明
                      </span>
                      <span>資料都在個人電腦與手機，系統不涉及個資問題，記得定時備份。</span>
                  </p>
              </div>
            </div>
          </div>
        </div>
        
        {alertDialog.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
              <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
                <h3 className={`text-lg font-bold mb-2 ${alertDialog.type === 'error' ? 'text-red-600' : alertDialog.type === 'success' ? 'text-green-600' : 'text-slate-800'}`}>
                  {alertDialog.title}
                </h3>
                <p className="text-slate-600 mb-6 whitespace-pre-line">{alertDialog.message}</p>
                <button onClick={closeAlert} className="bg-slate-900 text-white px-6 py-2 rounded hover:bg-slate-800">
                  確定
                </button>
              </div>
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header Navigation */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3 shrink-0">
               <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">
                  T
               </div>
               <div className="hidden md:block">
                  <h1 className="font-bold text-lg leading-none bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">TradeFolio</h1>
                  <p className="text-[10px] text-slate-400 leading-none mt-0.5">台美股資產管理</p>
               </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
               {availableViews.map((tab) => (
                 <button
                   key={tab}
                   onClick={() => setView(tab as View)}
                   className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                     view === tab 
                       ? 'bg-indigo-600 text-white shadow' 
                       : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                   }`}
                 >
                   {tab === 'dashboard' && '儀表板'}
                   {tab === 'history' && '交易紀錄'}
                   {tab === 'funds' && '資金管理'}
                   {tab === 'accounts' && '證券戶'}
                   {tab === 'rebalance' && '再平衡'}
                   {tab === 'help' && '系統管理'}
                 </button>
               ))}
            </nav>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
               {/* Guest Upgrade Button */}
               {isGuest && (
                 <button
                   onClick={handleContactAdmin}
                   className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold rounded-full transition shadow-lg shadow-amber-500/20"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                     <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                     <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                   </svg>
                   <span>申請開通</span>
                 </button>
               )}

               {/* Exchange Rate Input */}
               <div className="hidden sm:flex items-center bg-slate-800 rounded-md px-2 py-1 border border-slate-700">
                  <span className="text-xs text-slate-400 mr-2">USD</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(parseFloat(e.target.value))}
                    className="w-14 bg-transparent text-sm text-white font-mono focus:outline-none text-right"
                  />
               </div>
               
               {/* User Profile */}
               <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold ring-2 ring-slate-800 shadow-sm" title={currentUser}>
                     {currentUser.substring(0, 2).toUpperCase()}
                  </div>
                  
                  {/* Logout Button */}
                  <button 
                    onClick={handleLogout} 
                    className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                    title="登出"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
               </div>
            </div>
          </div>

          {/* Mobile Navigation (Horizontal Scroll) */}
          <div className="md:hidden border-t border-slate-800 py-2 overflow-x-auto no-scrollbar">
             <div className="flex space-x-2 px-1">
                {availableViews.map((tab) => (
                 <button
                   key={tab}
                   onClick={() => setView(tab as View)}
                   className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                     view === tab 
                       ? 'bg-indigo-600 text-white' 
                       : 'bg-slate-800 text-slate-300'
                   }`}
                 >
                   {tab === 'dashboard' && '儀表板'}
                   {tab === 'history' && '交易紀錄'}
                   {tab === 'funds' && '資金'}
                   {tab === 'accounts' && '證券戶'}
                   {tab === 'rebalance' && '再平衡'}
                   {tab === 'help' && '系統'}
                 </button>
              ))}
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
         {/* Page Title */}
         <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800 border-l-4 border-indigo-500 pl-3 flex justify-between items-center">
                <span>
                  {view === 'dashboard' && '投資組合儀表板 (Dashboard)'}
                  {view === 'history' && '歷史記錄（交易 + 資金流動）'}
                  {view === 'funds' && '資金存取與管理 (Funds)'}
                  {view === 'accounts' && '證券帳戶管理 (Accounts)'}
                  {view === 'rebalance' && '投資組合再平衡 (Rebalance)'}
                  {view === 'help' && '系統管理與備份 (System)'}
                </span>
                {/* Mobile specific Guest Button */}
                {isGuest && (
                   <button
                     onClick={handleContactAdmin}
                     className="sm:hidden px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full shadow"
                   >
                     申請開通
                   </button>
                )}
            </h2>
         </div>

         {/* View Content */}
         <div className="animate-fade-in">
            {view === 'dashboard' && (
               <Dashboard 
                 summary={summary}
                 holdings={holdings}
                 chartData={chartData}
                 assetAllocation={assetAllocation}
                 annualPerformance={annualPerformance}
                 accountPerformance={accountPerformance}
                 cashFlows={cashFlows}
                 accounts={computedAccounts}
                 onUpdatePrice={updatePrice}
                 onAutoUpdate={handleAutoUpdatePrices}
                 isGuest={isGuest}
                 onUpdateHistorical={handleOpenHistoricalModal}
               />
            )}

            {view === 'history' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-700">操作選項</h3>
                  <div className="flex gap-2">
                     <button onClick={handleClearAllTransactions} className="bg-red-50 text-red-600 px-3 py-1.5 rounded text-sm hover:bg-red-100 border border-red-200">
                        清空所有交易
                     </button>
                     <button onClick={() => setIsImportOpen(true)} className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded text-sm hover:bg-indigo-100 border border-indigo-200">
                        批次匯入
                     </button>
                     <button onClick={() => setIsFormOpen(true)} className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800 shadow-lg shadow-slate-900/20">
                        + 記一筆
                     </button>
                  </div>
                </div>
                
                {/* 篩選器區域 */}
                <div className="bg-white rounded-lg shadow p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-800">查詢/篩選</h3>
                    <button 
                      onClick={clearFilters}
                      className="text-sm text-slate-500 hover:text-slate-700 underline"
                    >
                      清除所有篩選
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 帳戶篩選 */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        帳戶篩選 (Filter by Account)
                      </label>
                      <select
                        value={filterAccount}
                        onChange={(e) => setFilterAccount(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="">所有帳戶</option>
                        {accounts.map(account => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 股票代號篩選 */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        股票代號篩選 (以股票代號篩選)
                      </label>
                      <input
                        type="text"
                        value={filterTicker}
                        onChange={(e) => setFilterTicker(e.target.value)}
                        placeholder="例如: 0050, AAPL"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>

                    {/* 開始日期 */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        開始日期 (依日期篩選)
                      </label>
                      <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>

                    {/* 結束日期 */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        結束日期
                      </label>
                      <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* 現金流勾選區域 */}
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeCashFlow}
                          onChange={(e) => setIncludeCashFlow(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <span className="ml-2 text-sm font-medium text-slate-700">
                          包含現金流記錄 (資金管理)
                        </span>
                      </label>
                      <div className="text-xs text-slate-500">
                        勾選後會顯示資金匯入、提取、轉帳等記錄，方便查看餘額變化
                      </div>
                    </div>
                  </div>
                  
                  {/* 篩選結果統計 */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <div className="text-sm text-slate-600">
                      顯示 <span className="font-semibold text-slate-800">{filteredRecords.length}</span> 筆記錄
                      {filteredRecords.length !== combinedRecords.length && (
                        <span className="text-slate-500">
                          （共 {combinedRecords.length} 筆：{transactions.length} 筆交易{includeCashFlow ? ` + ${cashFlows.length} 筆現金流` : ''}）
                        </span>
                      )}
                      {!includeCashFlow && cashFlows.length > 0 && (
                        <span className="text-amber-600 ml-2">
                          （已隱藏 {cashFlows.length} 筆現金流記錄）
                        </span>
                      )}
                    </div>
                    
                    {/* 快速篩選按鈕 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const thirtyDaysAgo = new Date();
                          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                          setFilterDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
                          setFilterDateTo(new Date().toISOString().split('T')[0]);
                        }}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition"
                      >
                        最近30天
                      </button>
                      <button
                        onClick={() => {
                          const currentYear = new Date().getFullYear();
                          setFilterDateFrom(`${currentYear}-01-01`);
                          setFilterDateTo(`${currentYear}-12-31`);
                        }}
                        className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition"
                      >
                        今年
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow overflow-x-auto">
                   <table className="min-w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 uppercase font-medium">
                       <tr>
                         <th className="px-4 py-3">日期</th>
                         <th className="px-4 py-3">帳戶</th>
                         <th className="px-4 py-3">標的/描述</th>
                         <th className="px-4 py-3">類別</th>
                         <th className="px-4 py-3 text-right">單價</th>
                         <th className="px-4 py-3 text-right">數量</th>
                         <th className="px-4 py-3 text-right">金額</th>
                         <th className="px-4 py-3 text-right">餘額</th>
                         <th className="px-4 py-3 text-right">操作</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {filteredRecords.map(record => {
                         const accName = accounts.find(a => a.id === record.accountId)?.name;
                         
                         // 根據記錄類型設定徽章顏色
                         let badgeColor = 'bg-gray-100 text-gray-700';
                         let displayType: string = record.subType;
                         
                         if (record.type === 'TRANSACTION') {
                           if(record.subType === TransactionType.BUY) badgeColor = 'bg-red-100 text-red-700';
                           else if(record.subType === TransactionType.SELL) badgeColor = 'bg-green-100 text-green-700';
                           else if(record.subType === TransactionType.DIVIDEND || record.subType === TransactionType.CASH_DIVIDEND) badgeColor = 'bg-yellow-100 text-yellow-700';
                           else if(record.subType === TransactionType.TRANSFER_IN) badgeColor = 'bg-blue-100 text-blue-700';
                           else if(record.subType === TransactionType.TRANSFER_OUT) badgeColor = 'bg-orange-100 text-orange-700';
                         } else if (record.type === 'CASHFLOW') {
                           if(record.subType === 'DEPOSIT') {
                             badgeColor = 'bg-emerald-100 text-emerald-700';
                             displayType = '資金匯入';
                           } else if(record.subType === 'WITHDRAW') {
                             badgeColor = 'bg-red-100 text-red-700';
                             displayType = '資金提取';
                           } else if(record.subType === 'TRANSFER') {
                             badgeColor = 'bg-purple-100 text-purple-700';
                             displayType = '帳戶轉出';
                           } else if(record.subType === 'TRANSFER_IN') {
                             badgeColor = 'bg-blue-100 text-blue-700';
                             displayType = '帳戶轉入';
                           }
                         }
                         
                         // 取得目標帳戶名稱（用於轉帳）
                         let targetAccName = null;
                         if (record.type === 'CASHFLOW') {
                           if (record.subType === 'TRANSFER' && record.targetAccountId) {
                             targetAccName = accounts.find(a => a.id === record.targetAccountId)?.name;
                           } else if (record.subType === 'TRANSFER_IN' && (record as any).sourceAccountId) {
                             targetAccName = accounts.find(a => a.id === (record as any).sourceAccountId)?.name;
                           }
                         }

                         return (
                           <tr key={`${record.type}-${record.id}`} className="hover:bg-slate-50">
                             <td className="px-4 py-3 whitespace-nowrap text-slate-600">{record.date}</td>
                             <td className="px-4 py-3 text-slate-500 text-xs">{accName}</td>
                             <td className="px-4 py-3 font-semibold text-slate-700">
                                {record.type === 'TRANSACTION' ? (
                                  <><span className="text-xs text-slate-400 mr-1">{record.market}</span>{record.ticker}</>
                                ) : (
                                  <span className="text-slate-600">
                                    {record.description}
                                    {targetAccName && record.subType === 'TRANSFER' && <span className="text-xs text-slate-400 ml-1">→ {targetAccName}</span>}
                                    {targetAccName && record.subType === 'TRANSFER_IN' && <span className="text-xs text-slate-400 ml-1">← {targetAccName}</span>}
                                  </span>
                                )}
                             </td>
                             <td className="px-4 py-3">
                               <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeColor}`}>
                                 {displayType}
                               </span>
                             </td>
                             <td className="px-4 py-3 text-right font-mono text-slate-600">
                               {record.type === 'TRANSACTION' ? record.price.toFixed(2) : 
                                record.type === 'CASHFLOW' && record.exchangeRate ? record.exchangeRate : '-'}
                             </td>
                             <td className="px-4 py-3 text-right font-mono text-slate-600">
                               {record.type === 'TRANSACTION' ? record.quantity.toLocaleString() : '-'}
                             </td>
                             <td className="px-4 py-3 text-right font-bold font-mono text-slate-700">
                               {record.amount % 1 === 0 ? record.amount.toString() : record.amount.toFixed(2)}
                             </td>
                             <td className="px-4 py-3 text-right">
                                <div className="flex flex-col items-end">
                                  <span className={`font-medium ${
                                    (record as any).balance >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {(record as any).balance?.toFixed(2) || '0.00'}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {accounts.find(a => a.id === record.accountId)?.currency || 'TWD'}
                                  </span>
                                </div>
                             </td>
                             <td className="px-4 py-3 text-right">
                                {!(record.type === 'CASHFLOW' && (record as any).isTargetRecord) && (
                                  <button onClick={() => {
                                    if (record.type === 'TRANSACTION') {
                                      removeTransaction(record.id);
                                    } else {
                                      const originalId = (record as any).isSourceRecord ? record.id : record.id.replace('-target', '');
                                      removeCashFlow(originalId);
                                    }
                                  }} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 border border-red-100 rounded hover:bg-red-50">刪除</button>
                                )}
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                   {filteredRecords.length === 0 && (
                     <div className="p-8 text-center text-slate-400">
                        {transactions.length === 0 ? (
                           <div>
                              <p className="text-lg font-medium text-slate-500 mb-2">尚無交易記錄</p>
                           </div>
                        ) : (
                           <div>
                              <p className="text-lg font-medium text-slate-500 mb-2">找不到符合條件的交易</p>
                           </div>
                        )}
                     </div>
                   )}
                </div>
              </div>
            )}

            {view === 'accounts' && (
              <AccountManager 
                accounts={computedAccounts} 
                onAdd={addAccount}
                onDelete={removeAccount}
              />
            )}

            {view === 'funds' && (
              <FundManager 
                accounts={accounts}
                cashFlows={cashFlows}
                onAdd={addCashFlow}
                onBatchAdd={addBatchCashFlows}
                onDelete={removeCashFlow}
                onClearAll={handleClearAllCashFlows}
                currentExchangeRate={exchangeRate}
              />
            )}

            {view === 'rebalance' && !isGuest && (
               <RebalanceView 
                 summary={summary}
                 holdings={holdings}
                 exchangeRate={exchangeRate}
                 targets={rebalanceTargets}
                 onUpdateTargets={updateRebalanceTargets}
               />
            )}

            {view === 'help' && (
               <HelpView 
                 onExport={handleExportData} 
                 onImport={handleImportData}
                 authorizedUsers={GLOBAL_AUTHORIZED_USERS}
                 currentUser={currentUser}
               />
            )}
         </div>
      </main>

      {/* Modals */}
      {isFormOpen && (
        <TransactionForm 
          accounts={accounts} 
          onAdd={addTransaction} 
          onClose={() => setIsFormOpen(false)} 
        />
      )}
      {isImportOpen && (
        <BatchImportModal 
          accounts={accounts} 
          onImport={addBatchTransactions} 
          onClose={() => setIsImportOpen(false)} 
        />
      )}
      {isHistoricalModalOpen && (
        <HistoricalDataModal
          transactions={transactions}
          cashFlows={cashFlows}
          accounts={accounts}
          historicalData={historicalData}
          onSave={handleSaveHistoricalData}
          onClose={() => setIsHistoricalModalOpen(false)}
        />
      )}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
           <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm">
              <h3 className="text-lg font-bold text-red-600 mb-2">確認清空所有交易？</h3>
              <p className="text-slate-600 mb-6">此操作無法復原，請確認您已備份資料。</p>
              <div className="flex justify-end gap-3">
                 <button onClick={cancelDeleteAllTransactions} className="px-4 py-2 rounded border hover:bg-slate-50">取消</button>
                 <button onClick={confirmDeleteAllTransactions} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">確認清空</button>
              </div>
           </div>
        </div>
      )}
      {isTransactionDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
           <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-2">刪除交易</h3>
              <p className="text-slate-600 mb-6">確定要刪除這筆交易紀錄嗎？</p>
              <div className="flex justify-end gap-3">
                 <button onClick={() => setIsTransactionDeleteConfirmOpen(false)} className="px-4 py-2 rounded border hover:bg-slate-50">取消</button>
                 <button onClick={confirmRemoveTransaction} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">刪除</button>
              </div>
           </div>
        </div>
      )}

      {/* Global Alert Dialog */}
      {alertDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
            <h3 className={`text-lg font-bold mb-2 ${alertDialog.type === 'error' ? 'text-red-600' : alertDialog.type === 'success' ? 'text-green-600' : 'text-slate-800'}`}>
              {alertDialog.title}
            </h3>
            <p className="text-slate-600 mb-6 whitespace-pre-line">{alertDialog.message}</p>
            <button onClick={closeAlert} className="bg-slate-900 text-white px-6 py-2 rounded hover:bg-slate-800">
              確定
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

