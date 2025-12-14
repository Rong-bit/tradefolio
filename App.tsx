
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Holding, PortfolioSummary, ChartDataPoint, Market, Account, CashFlow, TransactionType, AssetAllocationItem, AnnualPerformanceItem, AccountPerformance, CashFlowType, Currency } from './types';
import { calculateHoldings, calculateAccountBalances, generateAdvancedChartData, calculateAssetAllocation, calculateAnnualPerformance, calculateAccountPerformance, calculateXIRR } from './utils/calculations';
import TransactionForm from './components/TransactionForm';
import HoldingsTable from './components/HoldingsTable';
import Dashboard from './components/Dashboard';
import AccountManager from './components/AccountManager';
import FundManager from './components/FundManager';
import RebalanceView from './components/RebalanceView';
import HelpView from './components/HelpView';
import BatchImportModal from './components/BatchImportModal';
import { fetchCurrentPrices } from './services/geminiService';
import { ADMIN_EMAIL, SYSTEM_ACCESS_CODE, GLOBAL_AUTHORIZED_USERS } from './config';

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
  const allAuthorizedUsers = useMemo(() => [ADMIN_EMAIL, ...GLOBAL_AUTHORIZED_USERS], []);

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
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isMigrationConfirmOpen, setIsMigrationConfirmOpen] = useState(false);
  const [isTransactionDeleteConfirmOpen, setIsTransactionDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [alertDialog, setAlertDialog] = useState<{isOpen: boolean, title: string, message: string, type: 'info' | 'success' | 'error'}>({
    isOpen: false, title: '', message: '', type: 'info'
  });
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [view, setView] = useState<View>('dashboard');
  
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
        setCurrentUser('Guest');
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

    // 1. 管理員登入 (需要密碼)
    if (email === ADMIN_EMAIL) {
      if (password === SYSTEM_ACCESS_CODE) {
        loginSuccess(email, false);
        showAlert(`歡迎回來，管理員！`, "登入成功", "success");
        return;
      } else {
        return showAlert("管理員密碼錯誤", "登入失敗", "error");
      }
    }

    // 2. 全域授權名單登入 (不需要密碼)
    // 只要 Email 存在於 GLOBAL_AUTHORIZED_USERS 列表中，即可直接登入
    if (GLOBAL_AUTHORIZED_USERS.includes(email)) {
      loginSuccess(email, false);
      // 如果使用者有輸入密碼，可以忽略，或顯示提示
      return;
    }

    showAlert("此 Email 未獲授權。請使用「訪客試用」登入，或聯繫管理員將您的 Email 加入設定檔。", "權限不足", "error");
  };

  const handleGuestLogin = () => {
    loginSuccess('Guest', true);
    showAlert("已進入訪客模式。部分進階功能 (圖表、再平衡) 將受限。", "訪客登入", "info");
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
  };

  // --- Persistence ---
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    const getKey = (key: string) => `tf_${currentUser}_${key}`;
    const load = (key: string) => JSON.parse(localStorage.getItem(getKey(key)) || '[]');
    
    setTransactions(load('transactions'));
    setAccounts(load('accounts'));
    setCashFlows(load('cashFlows'));
    
    const prices = localStorage.getItem(getKey('prices'));
    if (prices) setCurrentPrices(JSON.parse(prices));
    const pDetails = localStorage.getItem(getKey('priceDetails'));
    if (pDetails) setPriceDetails(JSON.parse(pDetails));
    const rate = localStorage.getItem(getKey('exchangeRate'));
    if (rate) setExchangeRate(parseFloat(rate));
    const targets = localStorage.getItem(getKey('rebalanceTargets'));
    if (targets) setRebalanceTargets(JSON.parse(targets));
  }, [isAuthenticated, currentUser]);

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
  }, [transactions, accounts, cashFlows, currentPrices, priceDetails, exchangeRate, rebalanceTargets, isAuthenticated, currentUser]);

  // --- Alert & Modals ---
  const handleMigrateLegacyData = () => setIsMigrationConfirmOpen(true);
  const showAlert = (message: string, title: string = '提示', type: 'info' | 'success' | 'error' = 'info') => {
    setAlertDialog({ isOpen: true, title, message, type });
  };
  const closeAlert = () => setAlertDialog(prev => ({ ...prev, isOpen: false }));

  // --- Handlers ---
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

  const updatePrice = (key: string, price: number) => setCurrentPrices(prev => ({ ...prev, [key]: price }));
  const updateRebalanceTargets = (newTargets: Record<string, number>) => setRebalanceTargets(newTargets);

  const handleExportData = () => {
    const data = { version: "2.0", user: currentUser, timestamp: new Date().toISOString(), transactions, accounts, cashFlows, currentPrices, priceDetails, exchangeRate, rebalanceTargets };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tradefolio_${currentUser}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        showAlert(`成功還原資料！`, "還原成功", "success");
      } catch (err) {
        showAlert("匯入失敗：檔案格式錯誤。", "匯入失敗", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleAutoUpdatePrices = async () => {
    const holdingKeys = holdings.map(h => ({ market: h.market, ticker: h.ticker, key: `${h.market}-${h.ticker}` }));
    const queryList: string[] = Array.from(new Set(holdingKeys.map(h => {
       let t = h.ticker;
       if (h.market === Market.TW && !t.includes('TPE:') && !/^\d{4}$/.test(t)) t = `TPE:${t}`;
       if (h.market === Market.TW && /^\d{4}$/.test(t)) t = `TPE:${t}`;
       return t;
    })));
    if (queryList.length === 0) return;

    try {
      const result = await fetchCurrentPrices(queryList);
      
      const newPrices: Record<string, number> = {};
      const newDetails: Record<string, { change: number, changePercent: number }> = {};
      
      holdingKeys.forEach(h => {
          // Normalize matching logic
          let match = result.prices[h.ticker] || result.prices[`TPE:${h.ticker}`];
          
          if (!match) {
             // Case-insensitive search
             const foundKey = Object.keys(result.prices).find(k => 
                k.toLowerCase() === h.ticker.toLowerCase() || 
                k.toLowerCase() === `tpe:${h.ticker}`.toLowerCase() ||
                k.endsWith(h.ticker)
             );
             if (foundKey) match = result.prices[foundKey];
          }

          if (match) {
             const price = match.price;
             const change = match.change || 0;
             const changePercent = match.changePercent || 0;
             
             newPrices[h.key] = price;
             newDetails[h.key] = { change, changePercent };
          }
      });
      
      setCurrentPrices(prev => ({ ...prev, ...newPrices }));
      setPriceDetails(prev => ({ ...prev, ...newDetails }));

      if (result.exchangeRate) setExchangeRate(result.exchangeRate);
    } catch (e) { console.error(e); throw e; }
  };

  // --- Helper: Transaction Priority for Calculation vs Display ---
  // Returns a priority value. Smaller number = Happens Earlier in the day (for calculation).
  const getTransactionPriority = (r: any) => {
    // Calculation Order (Time flows ->):
    // 1. Deposits / Transfer In (First, so money is available)
    // 2. Sell / Dividends / Interest (Income)
    // 3. Buy (Spending)
    // 4. Withdraw / Transfer Out (Last, after all activities)
    
    if (r.subType === 'DEPOSIT' || r.subType === 'TRANSFER_IN') return 1;
    if (r.subType === 'SELL' || r.subType === 'CASH_DIVIDEND' || r.subType === 'INTEREST' || r.subType === 'DIVIDEND') return 2;
    if (r.subType === 'BUY') return 3;
    if (r.subType === 'WITHDRAW' || r.subType === 'TRANSFER' || r.subType === 'TRANSFER_OUT') return 4;
    return 5;
  };

  // --- Core Calculation for Records with Balance ---
  const combinedRecords = useMemo(() => {
    // 1. Transactions to Records
    const txRecords = transactions.map(tx => {
      let amount = 0;
      let cashImpact = 0;
      const fee = tx.fees || 0;

      // 優先使用已存在的 amount (Net) 欄位，避免重複計算手續費
      if (tx.amount !== undefined) {
         amount = tx.amount;
         
         if (tx.type === TransactionType.BUY) cashImpact = -amount;
         else if (tx.type === TransactionType.SELL) cashImpact = amount;
         else if (tx.type === TransactionType.CASH_DIVIDEND) cashImpact = amount;
         else if (tx.type === TransactionType.TRANSFER_OUT || tx.type === TransactionType.TRANSFER_IN) cashImpact = -fee; // Transfer amount usually doesn't affect cash except fee
         else cashImpact = 0;

      } else {
         // 若無 amount 則自行計算
         if (tx.type === TransactionType.BUY) {
            amount = (tx.price * tx.quantity) + fee;
            cashImpact = -amount;
         } else if (tx.type === TransactionType.SELL) {
            amount = (tx.price * tx.quantity) - fee;
            cashImpact = amount;
         } else if (tx.type === TransactionType.CASH_DIVIDEND) {
            amount = (tx.price * tx.quantity) - fee;
            cashImpact = amount;
         } else if (tx.type === TransactionType.TRANSFER_OUT || tx.type === TransactionType.TRANSFER_IN) {
            amount = fee; 
            cashImpact = -fee;
         } else {
            // Dividend reinvest - no cash impact
            amount = (tx.price * tx.quantity); 
            cashImpact = 0;
         }
      }

      return {
        id: tx.id, date: tx.date, accountId: tx.accountId, type: 'TRANSACTION', subType: tx.type,
        ticker: tx.ticker, market: tx.market, price: tx.price, quantity: tx.quantity, 
        amount, cashImpact, description: `${tx.market}-${tx.ticker}`, originalRecord: tx
      };
    });

    // 2. CashFlows to Records
    const cfRecords: any[] = [];
    cashFlows.forEach(cf => {
      let cashImpact = 0;
      if (cf.type === CashFlowType.DEPOSIT || cf.type === CashFlowType.INTEREST) cashImpact = cf.amount;
      else if (cf.type === CashFlowType.WITHDRAW || cf.type === CashFlowType.TRANSFER) cashImpact = -cf.amount;

      cfRecords.push({
        id: cf.id, date: cf.date, accountId: cf.accountId, type: 'CASHFLOW', subType: cf.type,
        ticker: '', market: '', price: 0, quantity: 0, 
        amount: cf.amount, cashImpact, description: cf.note || cf.type, originalRecord: cf,
        exchangeRate: cf.exchangeRate
      });

      if (cf.type === 'TRANSFER' && cf.targetAccountId) {
        const targetAmount = cf.exchangeRate ? cf.amount * cf.exchangeRate : cf.amount;
        cfRecords.push({
          id: `${cf.id}-target`, date: cf.date, accountId: cf.targetAccountId, type: 'CASHFLOW', subType: 'TRANSFER_IN',
          ticker: '', market: '', price: 0, quantity: 0,
          amount: targetAmount, cashImpact: targetAmount, description: `轉入自 ${accounts.find(a => a.id === cf.accountId)?.name || '未知'}`,
          originalRecord: cf, isTargetRecord: true
        });
      }
    });

    // 3. Sort Old -> New to calculate Running Balance (Ascending)
    const allRecords = [...txRecords, ...cfRecords].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      // If same date, use Priority Ascending (Deposit -> Sell -> Buy -> Withdraw)
      return getTransactionPriority(a) - getTransactionPriority(b);
    });

    // 4. Calculate Balance
    const balances: Record<string, number> = {};
    return allRecords.map(r => {
      if (!balances[r.accountId]) balances[r.accountId] = 0;
      balances[r.accountId] += r.cashImpact;
      return { ...r, balance: balances[r.accountId] };
    });
  }, [transactions, cashFlows, accounts]);

  // 5. Filter & Reverse for Display (New -> Old)
  const filteredRecords = useMemo(() => {
    return combinedRecords.filter(r => {
      if (filterAccount && r.accountId !== filterAccount) return false;
      if (!includeCashFlow && r.type === 'CASHFLOW') return false;
      if (filterTicker && r.type === 'TRANSACTION' && !r.ticker.includes(filterTicker.toUpperCase())) return false;
      if (filterDateFrom && new Date(r.date) < new Date(filterDateFrom)) return false;
      if (filterDateTo && new Date(r.date) > new Date(filterDateTo)) return false;
      return true;
    }).sort((a, b) => {
       const dateA = new Date(a.date).getTime();
       const dateB = new Date(b.date).getTime();
       // Descending Order (Newest First)
       if (dateA !== dateB) return dateB - dateA; 
       
       // CRITICAL FIX: If same date, use Priority DESCENDING for display.
       // This ensures the list reads from bottom (start of day) to top (end of day).
       // E.g. Top: Withdraw (Last Event) | Bottom: Deposit (First Event)
       return getTransactionPriority(b) - getTransactionPriority(a);
    });
  }, [combinedRecords, filterAccount, filterTicker, filterDateFrom, filterDateTo, includeCashFlow]);

  // Calculations
  const accountsWithBalance = useMemo(() => calculateAccountBalances(accounts, cashFlows, transactions), [accounts, cashFlows, transactions]);
  const baseHoldings = useMemo(() => calculateHoldings(transactions, currentPrices, priceDetails), [transactions, currentPrices, priceDetails]);
  const totalAssetsTWD = useMemo(() => {
    let s = 0; baseHoldings.forEach(h => s += (h.market === Market.US ? h.currentValue * exchangeRate : h.currentValue));
    let c = 0; accountsWithBalance.forEach(a => c += (a.balance * (a.currency === 'USD' ? exchangeRate : 1)));
    return s + c;
  }, [baseHoldings, accountsWithBalance, exchangeRate]);
  const holdings = useMemo(() => baseHoldings.map(h => ({ ...h, weight: totalAssetsTWD > 0 ? ((h.market === Market.US ? h.currentValue * exchangeRate : h.currentValue) / totalAssetsTWD) * 100 : 0 })), [baseHoldings, totalAssetsTWD, exchangeRate]);
  
  const summary = useMemo(() => {
    let tv = 0; holdings.forEach(h => tv += (h.market === Market.US ? h.currentValue * exchangeRate : h.currentValue));
    let cb = 0; accountsWithBalance.forEach(a => cb += (a.balance * (a.currency === 'USD' ? exchangeRate : 1)));
    
    // 1. Calculate Net Invested TWD (ni)
    const ni = cashFlows.reduce((acc, cf) => {
      const a = accounts.find(ac => ac.id === cf.accountId);
      if (!a) return acc;
      
      let amountTWD = 0;
      if (cf.amountTWD && cf.amountTWD > 0) {
        amountTWD = cf.amountTWD;
      } else {
        const isUSD = a.currency === 'USD';
        // Check for historical exchange rate on the cash flow record
        const rate = isUSD ? (cf.exchangeRate && cf.exchangeRate > 0 ? cf.exchangeRate : exchangeRate) : 1;
        amountTWD = cf.amount * rate;
      }

      if (cf.type === CashFlowType.DEPOSIT) return acc + amountTWD;
      if (cf.type === CashFlowType.WITHDRAW) return acc - amountTWD;
      return acc;
    }, 0);

    // 2. Calculate Weighted Average Exchange Rate for USD
    let poolUSD = 0;
    let poolCostTWD = 0;
    
    // Sort by date for accurate running average
    const sortedFlows = [...cashFlows].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    sortedFlows.forEach(cf => {
        const acc = accounts.find(a => a.id === cf.accountId);
        if (!acc) return;
        
        // Deposit into USD Account
        if (acc.currency === Currency.USD && cf.type === CashFlowType.DEPOSIT) {
             const usd = cf.amount;
             let cost = 0;
             if (cf.amountTWD && cf.amountTWD > 0) {
                 cost = cf.amountTWD;
             } else {
                 const rate = (cf.exchangeRate && cf.exchangeRate > 0) ? cf.exchangeRate : exchangeRate;
                 cost = usd * rate;
             }
             poolUSD += usd;
             poolCostTWD += cost;
        }
        // Withdraw from USD Account
        else if (acc.currency === Currency.USD && cf.type === CashFlowType.WITHDRAW) {
             const usd = cf.amount;
             if (poolUSD > 0.001) {
                 const avg = poolCostTWD / poolUSD;
                 poolCostTWD -= (usd * avg);
                 poolUSD -= usd;
             }
        }
        // Transfer
        else if (cf.type === CashFlowType.TRANSFER && cf.targetAccountId) {
             const targetAcc = accounts.find(a => a.id === cf.targetAccountId);
             // TWD -> USD
             if (acc.currency !== Currency.USD && targetAcc?.currency === Currency.USD) {
                 const cost = cf.amount; // Source (TWD)
                 let usd = 0;
                 if (cf.exchangeRate && cf.exchangeRate > 0) {
                     usd = cost / cf.exchangeRate;
                 } else {
                     usd = cost / exchangeRate;
                 }
                 poolUSD += usd;
                 poolCostTWD += cost;
             }
             // USD -> TWD
             else if (acc.currency === Currency.USD && targetAcc?.currency !== Currency.USD) {
                 const usd = cf.amount; // Source (USD)
                 if (poolUSD > 0.001) {
                     const avg = poolCostTWD / poolUSD;
                     poolCostTWD -= (usd * avg);
                     poolUSD -= usd;
                 }
             }
        }
    });

    if (poolUSD < 0) poolUSD = 0;
    if (poolCostTWD < 0) poolCostTWD = 0;
    const calculatedAvgRate = poolUSD > 0 ? poolCostTWD / poolUSD : 0;

    // 3. Dividends & XIRR
    let accCashDivTWD = 0;
    let accStockDivTWD = 0;
    
    transactions.forEach(tx => {
       const acc = accounts.find(a => a.id === tx.accountId);
       if (!acc) return;
       const isUSD = acc.currency === Currency.USD;
       const rate = isUSD ? exchangeRate : 1;
       
       // Calculate value in TWD
       // Use tx.amount if available, else calc price * quantity
       // For Dividend type, amount is usually total value
       const val = tx.amount !== undefined ? tx.amount : (tx.price * tx.quantity);
       const valTWD = val * rate;

       if (tx.type === TransactionType.CASH_DIVIDEND) {
           accCashDivTWD += valTWD;
       } else if (tx.type === TransactionType.DIVIDEND) {
           accStockDivTWD += valTWD;
       }
    });

    const ta = tv + cb;
    const cagr = calculateXIRR(cashFlows, accounts, ta, exchangeRate);

    return {
      totalCostTWD: ni, totalValueTWD: tv, totalPLTWD: ta - ni, totalPLPercent: ni > 0 ? ((ta - ni)/ni)*100 : 0,
      cashBalanceTWD: cb, netInvestedTWD: ni, annualizedReturn: cagr, exchangeRateUsdToTwd: exchangeRate,
      accumulatedCashDividendsTWD: accCashDivTWD, accumulatedStockDividendsTWD: accStockDivTWD, 
      avgExchangeRate: calculatedAvgRate
    };
  }, [holdings, accountsWithBalance, cashFlows, exchangeRate, accounts, transactions]);

  const chartData = useMemo(() => generateAdvancedChartData(transactions, cashFlows, accounts, summary.totalValueTWD + summary.cashBalanceTWD, exchangeRate), [transactions, cashFlows, accounts, summary, exchangeRate]);
  const assetAllocation = useMemo(() => calculateAssetAllocation(holdings, summary.cashBalanceTWD, exchangeRate), [holdings, summary, exchangeRate]);
  const annualPerformance = useMemo(() => calculateAnnualPerformance(chartData), [chartData]);
  const accountPerformance = useMemo(() => calculateAccountPerformance(accountsWithBalance, holdings, cashFlows, exchangeRate), [accountsWithBalance, holdings, cashFlows, exchangeRate]);

  // --- Render ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
           <div className="flex justify-center mb-6">
             <div className="w-12 h-12 bg-gradient-to-tr from-accent to-purple-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold">T</div>
           </div>
           <h1 className="text-2xl font-bold text-center mb-2 text-slate-800">TradeFolio 登入</h1>
           <div className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
               <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full border p-3 rounded" required />
             </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
               <input 
                 type="password" 
                 value={loginPassword} 
                 onChange={e => setLoginPassword(e.target.value)} 
                 className="w-full border p-3 rounded" 
                 placeholder="授權使用者無需輸入"
               />
             </div>
           </div>
           <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded font-bold mt-6">登入</button>
           <button type="button" onClick={handleGuestLogin} className="w-full bg-white border mt-4 py-3 rounded text-slate-700 font-bold">訪客試用</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-accent to-purple-500 rounded-lg flex items-center justify-center font-bold">T</div>
            <div>
              <h1 className="text-lg font-bold tracking-wider leading-none">TradeFolio</h1>
              <span className="text-[10px] text-slate-400">{currentUser} {isGuest && '(Guest)'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-800 py-1 px-3 rounded-full border border-slate-700">
                <span className="text-slate-400">USD</span>
                <input type="number" value={exchangeRate} onChange={(e) => setExchangeRate(parseFloat(e.target.value)||30)} className="w-12 bg-transparent text-right text-white" />
             </div>
             <button onClick={handleLogout} className="text-xs bg-slate-800 px-3 py-1.5 rounded border border-slate-700">登出</button>
          </div>
        </div>
        <div className="bg-slate-800 border-t border-slate-700">
           <nav className="max-w-7xl mx-auto px-4 flex overflow-x-auto no-scrollbar">
             {[
               { id: 'dashboard', label: '儀表板' },
               { id: 'funds', label: '資金管理' },
               { id: 'history', label: '交易紀錄' },
               ...(!isGuest ? [{ id: 'rebalance', label: '再平衡' }] : []),
               { id: 'accounts', label: '證券戶' },
               { id: 'help', label: '說明' }
             ].map(item => (
               <button key={item.id} onClick={() => setView(item.id as View)} className={`px-4 py-3 text-sm font-medium border-b-2 ${view === item.id ? 'border-accent text-white' : 'border-transparent text-slate-400'}`}>{item.label}</button>
             ))}
           </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full animate-fade-in">
        {view === 'dashboard' && (
          <>
             <div className="flex justify-end mb-4"><button onClick={() => setIsFormOpen(true)} className="bg-accent text-white px-4 py-2 rounded shadow">+ 記一筆</button></div>
             <Dashboard 
               summary={summary} chartData={chartData} holdings={holdings} assetAllocation={assetAllocation}
               annualPerformance={annualPerformance} accountPerformance={accountPerformance} cashFlows={cashFlows}
               accounts={accountsWithBalance} onUpdatePrice={updatePrice} onAutoUpdate={handleAutoUpdatePrices} isGuest={isGuest}
             />
          </>
        )}
        {view === 'funds' && <FundManager accounts={accountsWithBalance} cashFlows={cashFlows} onAdd={addCashFlow} onBatchAdd={addBatchCashFlows} onDelete={removeCashFlow} />}
        {view === 'accounts' && <AccountManager accounts={accountsWithBalance} onAdd={addAccount} onDelete={removeAccount} />}
        {view === 'rebalance' && !isGuest && <RebalanceView summary={summary} holdings={holdings} exchangeRate={exchangeRate} targets={rebalanceTargets} onUpdateTargets={updateRebalanceTargets} />}
        {view === 'help' && <HelpView 
             onExport={handleExportData} 
             onImport={handleImportData} 
             onMigrateLegacy={handleMigrateLegacyData} 
             authorizedUsers={allAuthorizedUsers} 
             currentUser={currentUser} 
        />}
        
        {view === 'history' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="text-xl font-bold text-slate-800">歷史記錄 (History)</h2>
              <div className="flex gap-2">
                <button onClick={handleClearAllTransactions} className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700">全部刪除</button>
                <button onClick={() => setIsImportOpen(true)} className="bg-emerald-600 text-white px-3 py-1.5 rounded text-sm hover:bg-emerald-700">匯入</button>
                <button onClick={() => setIsFormOpen(true)} className="bg-slate-900 text-white px-3 py-1.5 rounded text-sm hover:bg-slate-800">新增</button>
              </div>
            </div>

            {/* Filter Panel */}
            <div className="bg-white p-5 rounded-lg shadow border border-slate-200">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                 <div>
                   <label className="text-xs font-bold text-slate-500 block mb-1">帳戶 (Account)</label>
                   <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="w-full border rounded p-2 text-sm">
                     <option value="">全部帳戶</option>
                     {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="text-xs font-bold text-slate-500 block mb-1">代號 (Ticker)</label>
                   <input type="text" value={filterTicker} onChange={e => setFilterTicker(e.target.value)} placeholder="e.g. AAPL" className="w-full border rounded p-2 text-sm" />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-slate-500 block mb-1">起始日期 (From)</label>
                   <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-full border rounded p-2 text-sm" />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-slate-500 block mb-1">結束日期 (To)</label>
                   <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-full border rounded p-2 text-sm" />
                 </div>
               </div>
               <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                 <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                    <input type="checkbox" checked={includeCashFlow} onChange={e => setIncludeCashFlow(e.target.checked)} className="rounded text-blue-600" />
                    包含現金流紀錄 (Cash Flow)
                 </label>
                 <span className="text-xs text-slate-400">顯示 {filteredRecords.length} 筆</span>
               </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
               <table className="min-w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">日期</th>
                      <th className="px-4 py-3">帳戶</th>
                      <th className="px-4 py-3">標的/說明</th>
                      <th className="px-4 py-3">類別</th>
                      <th className="px-4 py-3 text-right">單價</th>
                      <th className="px-4 py-3 text-right">數量</th>
                      <th className="px-4 py-3 text-right">金額</th>
                      <th className="px-4 py-3 text-right">餘額 (Balance)</th>
                      <th className="px-4 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.length === 0 ? (
                      <tr><td colSpan={9} className="text-center py-8 text-slate-400">無符合條件的紀錄</td></tr>
                    ) : (
                      filteredRecords.map(r => {
                        const acc = accounts.find(a => a.id === r.accountId);
                        const isIncome = r.cashImpact > 0;
                        const isExpense = r.cashImpact < 0;
                        
                        let badgeClass = "bg-gray-100 text-gray-700";
                        if (r.subType === 'BUY' || r.subType === 'WITHDRAW') badgeClass = "bg-red-50 text-red-700 border border-red-100";
                        else if (r.subType === 'SELL' || r.subType === 'DEPOSIT' || r.subType === 'DIVIDEND' || r.subType === 'CASH_DIVIDEND') badgeClass = "bg-green-50 text-green-700 border border-green-100";
                        else if (r.subType === 'TRANSFER' || r.subType === 'TRANSFER_IN') badgeClass = "bg-blue-50 text-blue-700 border border-blue-100";

                        return (
                          <tr key={`${r.type}-${r.id}`} className="hover:bg-slate-50">
                            <td className="px-4 py-3 whitespace-nowrap text-slate-600">{r.date}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">{acc?.name}</td>
                            <td className="px-4 py-3 font-medium text-slate-700">
                               {r.type === 'TRANSACTION' ? (
                                 <>{r.market === 'US' ? '🇺🇸' : '🇹🇼'} {r.ticker}</>
                               ) : (
                                 <span className="text-slate-600">{r.description}</span>
                               )}
                            </td>
                            <td className="px-4 py-3">
                               <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>
                                 {r.subType}
                               </span>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-500 text-xs">
                              {r.type === 'TRANSACTION' ? r.price.toFixed(2) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-500 text-xs">
                              {r.type === 'TRANSACTION' ? r.quantity : '-'}
                            </td>
                            <td className={`px-4 py-3 text-right font-bold ${isIncome ? 'text-green-600' : isExpense ? 'text-red-600' : 'text-slate-400'}`}>
                               {r.amount.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-700 bg-slate-50/50">
                               {(r as any).balance.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {!(r as any).isTargetRecord && (
                                <button onClick={() => r.type === 'TRANSACTION' ? removeTransaction(r.id) : removeCashFlow(r.id)} className="text-red-400 hover:text-red-600 text-xs">刪除</button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
               </table>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {isFormOpen && <TransactionForm accounts={accounts} onAdd={addTransaction} onClose={() => setIsFormOpen(false)} />}
      {isImportOpen && <BatchImportModal accounts={accounts} onImport={addBatchTransactions} onClose={() => setIsImportOpen(false)} />}
      {isDeleteConfirmOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
           <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm">
             <h3 className="font-bold text-lg mb-2">確認刪除所有紀錄？</h3>
             <p className="text-slate-600 text-sm mb-4">此動作無法復原。</p>
             <div className="flex justify-end gap-2">
               <button onClick={cancelDeleteAllTransactions} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">取消</button>
               <button onClick={confirmDeleteAllTransactions} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">確認刪除</button>
             </div>
           </div>
         </div>
      )}
      {alertDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm text-center">
             <h3 className="font-bold text-lg mb-2">{alertDialog.title}</h3>
             <p className="text-slate-600 mb-4">{alertDialog.message}</p>
             <button onClick={closeAlert} className="px-6 py-2 bg-slate-900 text-white rounded hover:bg-slate-800">確定</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
