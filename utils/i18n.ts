// 語言類型
export type Language = 'zh-TW' | 'en';

// 翻譯鍵值類型
export interface Translations {
  // 通用
  common: {
    confirm: string;
    cancel: string;
    delete: string;
    edit: string;
    save: string;
    close: string;
    loading: string;
    search: string;
  };
  // 導航
  nav: {
    dashboard: string;
    history: string;
    funds: string;
    accounts: string;
    rebalance: string;
    simulator: string;
    help: string;
    logout: string;
  };
  // 頁面標題
  pages: {
    dashboard: string;
    history: string;
    funds: string;
    accounts: string;
    rebalance: string;
    simulator: string;
    help: string;
  };
  // 登入頁
  login: {
    title: string;
    subtitle: string;
    email: string;
    password: string;
    login: string;
    privacy: string;
    privacyDesc: string;
  };
  // 儀表板
  dashboard: {
    netCost: string;
    totalAssets: string;
    totalPL: string;
    annualizedReturn: string;
    detail: string;
    includeCash: string;
    detailedStatistics: string;
    totalCost: string;
    totalPLAmount: string;
    accumulatedCashDividends: string;
    accumulatedStockDividends: string;
    annualizedReturnRate: string;
    avgExchangeRate: string;
    currentExchangeRate: string;
    totalReturnRate: string;
    assetVsCostTrend: string;
    aiCorrectHistory: string;
    allocation: string;
    annualPerformance: string;
    year: string;
    startAssets: string;
    annualNetInflow: string;
    endAssets: string;
    annualProfit: string;
    annualROI: string;
    brokerageAccounts: string;
    accountName: string;
    totalAssetsNT: string;
    marketValueNT: string;
    balanceNT: string;
    profitNT: string;
    annualizedROI: string;
    portfolioHoldings: string;
    mergedDisplay: string;
    detailedDisplay: string;
    aiUpdatePrices: string;
    estimatedGrowth8: string;
    chartLoading: string;
    noChartData: string;
    noHoldings: string;
    noAccounts: string;
    costBreakdown: string;
    netInvestedBreakdown: string;
    calculationFormula: string;
    formulaNote: string;
    attention: string;
    date: string;
    category: string;
    originalAmount: string;
    twdCost: string;
    totalNetInvested: string;
    deposit: string;
    withdraw: string;
    fixedTWD: string;
    historicalRate: string;
    currentRate: string;
    taiwanDollar: string;
    chartLabels: {
      investmentCost: string;
      accumulatedPL: string;
      estimatedAssets: string;
      totalAssets: string;
      realData: string;
      estimated: string;
    };
    aiAdvisor: string;
    aiAdvisorDesc: string;
    startAnalysis: string;
    analyzing: string;
    viewCalculationDetails: string;
  };
  // 資金管理
  funds: {
    title: string;
    operations: string;
    clearAll: string;
    batchImport: string;
    addRecord: string;
    filter: string;
    clearFilters: string;
    accountFilter: string;
    typeFilter: string;
    dateFrom: string;
    dateTo: string;
    allAccounts: string;
    allTypes: string;
    deposit: string;
    withdraw: string;
    transfer: string;
    interest: string;
    showRecords: string;
    totalRecords: string;
    last30Days: string;
    thisYear: string;
  };
  // 交易記錄
  history: {
    operations: string;
    batchUpdateMarket: string;
    clearAll: string;
    batchImport: string;
    addRecord: string;
    filter: string;
    accountFilter: string;
    tickerFilter: string;
    dateFrom: string;
    dateTo: string;
    includeCashFlow: string;
    clearFilters: string;
  };
  // 其他常用文字
  labels: {
    date: string;
    account: string;
    amount: string;
    balance: string;
    action: string;
    type: string;
    price: string;
    quantity: string;
    currency: string;
    fee: string;
    exchangeRate: string;
    totalCost: string;
    category: string;
    description: string;
    note: string;
  };
  // 持倉明細表
  holdings: {
    portfolioHoldings: string;
    mergedDisplay: string;
    detailedDisplay: string;
    aiUpdatePrices: string;
    aiSearching: string;
    market: string;
    ticker: string;
    quantity: string;
    currentPrice: string;
    weight: string;
    cost: string;
    marketValue: string;
    profitLoss: string;
    annualizedROI: string;
    dailyChange: string;
    avgPrice: string;
    noHoldings: string;
  };
}

// 繁體中文翻譯
const zhTW: Translations = {
  common: {
    confirm: '確認',
    cancel: '取消',
    delete: '刪除',
    edit: '編輯',
    save: '儲存',
    close: '關閉',
    loading: '載入中...',
    search: '搜尋',
  },
  nav: {
    dashboard: '儀表板',
    history: '交易紀錄',
    funds: '資金管理',
    accounts: '證券戶',
    rebalance: '再平衡',
    simulator: '配置模擬',
    help: '系統管理',
    logout: '登出',
  },
  pages: {
    dashboard: '投資組合儀表板',
    history: '歷史記錄（交易 + 資金流動）',
    funds: '資金存取與管理',
    accounts: '證券帳戶管理',
    rebalance: '投資組合再平衡',
    simulator: '資產配置模擬',
    help: '系統管理與備份',
  },
  login: {
    title: 'TradeFolio 登入',
    subtitle: '台美股資產管理系統',
    email: 'Email',
    password: 'Password',
    login: '登入',
    privacy: '隱私聲明',
    privacyDesc: '資料都在個人電腦與手機，系統不涉及個資問題，記得定時備份。',
  },
  dashboard: {
    netCost: '淨投入成本',
    totalAssets: '目前總資產',
    totalPL: '總損益',
    annualizedReturn: '真實年化',
    detail: '明細',
    includeCash: '含現金',
    detailedStatistics: '詳細統計數據',
    totalCost: '總投資成本',
    totalPLAmount: '總損益金額',
    accumulatedCashDividends: '累積配息現金',
    accumulatedStockDividends: '累積股息再投入',
    annualizedReturnRate: '總市值年化報酬率',
    avgExchangeRate: '平均換匯成本',
    currentExchangeRate: '目前匯率',
    totalReturnRate: '累積總報酬率',
    assetVsCostTrend: '資產與成本趨勢',
    aiCorrectHistory: 'AI 校正歷史資產',
    allocation: '資產配置',
    annualPerformance: '年度績效表',
    year: '年份',
    startAssets: '期初資產',
    annualNetInflow: '年度淨投入',
    endAssets: '期末資產',
    annualProfit: '年度損益',
    annualROI: '年度報酬率',
    brokerageAccounts: '證券戶列表',
    accountName: '證券名稱',
    totalAssetsNT: '總資產',
    marketValueNT: '市值',
    balanceNT: '餘額',
    profitNT: '損益',
    annualizedROI: '年化報酬率',
    portfolioHoldings: '資產配置明細',
    mergedDisplay: '合併顯示 (依標的)',
    detailedDisplay: '明細顯示 (依帳戶)',
    aiUpdatePrices: 'AI 聯網更新股價 & 匯率',
    estimatedGrowth8: '預估 8% 成長',
    chartLoading: '圖表載入中...',
    noChartData: '請先新增資金匯入與交易紀錄',
    noHoldings: '無持倉',
    noAccounts: '尚無證券戶，請至「證券戶管理」新增。',
    costBreakdown: '淨投入成本計算明細',
    netInvestedBreakdown: '淨投入成本計算明細',
    calculationFormula: '計算公式：淨投入 = 匯入資金 - 匯出資金',
    formulaNote: '注意：美金帳戶若有「歷史匯率」則優先使用，否則使用「目前右上角設定匯率」。轉帳與利息不計入成本。',
    attention: '注意',
    date: '日期',
    category: '類別',
    originalAmount: '原始金額',
    twdCost: '台幣成本',
    totalNetInvested: '總計',
    deposit: '匯入 (+)',
    withdraw: '匯出 (-)',
    fixedTWD: '指定台幣金額',
    historicalRate: '歷史匯率',
    currentRate: '目前匯率',
    taiwanDollar: '台幣',
    chartLabels: {
      investmentCost: '投資成本',
      accumulatedPL: '累積損益',
      estimatedAssets: '預估總資產 (8%)',
      totalAssets: '總資產',
      realData: ' (真實股價)',
      estimated: ' (估算)',
    },
    aiAdvisor: 'Gemini AI 投資顧問',
    aiAdvisorDesc: '分析您的投資組合配置、風險與潛在機會。',
    startAnalysis: '開始分析',
    analyzing: '分析中...',
    viewCalculationDetails: '查看計算明細',
  },
  funds: {
    title: '資金管理',
    operations: '操作選項',
    clearAll: '清空所有資金',
    batchImport: '批次匯入',
    addRecord: '記一筆',
    filter: '查詢/篩選',
    clearFilters: '清除所有篩選',
    accountFilter: '帳戶篩選',
    typeFilter: '類別篩選',
    dateFrom: '起始日期',
    dateTo: '結束日期',
    allAccounts: '所有帳戶',
    allTypes: '所有類別',
    deposit: '匯入',
    withdraw: '匯出',
    transfer: '轉帳',
    interest: '利息',
    showRecords: '顯示 {count} 筆記錄',
    totalRecords: '共 {total} 筆',
    last30Days: '最近30天',
    thisYear: '今年',
  },
  history: {
    operations: '操作選項',
    batchUpdateMarket: '批量修改市場',
    clearAll: '清空所有交易',
    batchImport: '批次匯入',
    addRecord: '記一筆',
    filter: '查詢/篩選',
    accountFilter: '帳戶篩選 (Filter by Account)',
    tickerFilter: '股票代號篩選 (以股票代號篩選)',
    dateFrom: '開始日期 (依日期篩選)',
    dateTo: '結束日期',
    includeCashFlow: '包含現金流記錄 (資金管理)',
    clearFilters: '清除所有篩選',
  },
  labels: {
    date: '日期',
    account: '帳戶',
    amount: '金額',
    balance: '餘額',
    action: '操作',
    type: '類別',
    price: '單價',
    quantity: '數量',
    currency: '幣別',
    fee: '手續費',
    exchangeRate: '匯率',
    totalCost: '總計成本',
    category: '類別',
    description: '標的/描述',
    note: '備註',
  },
  holdings: {
    portfolioHoldings: '資產配置明細',
    mergedDisplay: '合併顯示 (依標的)',
    detailedDisplay: '明細顯示 (依帳戶)',
    aiUpdatePrices: 'AI 聯網更新股價 & 匯率',
    aiSearching: 'AI 搜尋中...',
    market: '市場',
    ticker: '代號',
    quantity: '數量',
    currentPrice: '現價',
    weight: '比重',
    cost: '總成本',
    marketValue: '市值',
    profitLoss: '損益',
    annualizedROI: '年化',
    dailyChange: '今日漲跌',
    avgPrice: '均價',
    noHoldings: '尚無持倉資料，請新增交易。',
  },
};

// 英文翻譯
const en: Translations = {
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    save: 'Save',
    close: 'Close',
    loading: 'Loading...',
    search: 'Search',
  },
  nav: {
    dashboard: 'Dashboard',
    history: 'Transactions',
    funds: 'Funds',
    accounts: 'Accounts',
    rebalance: 'Rebalance',
    simulator: 'Simulator',
    help: 'System',
    logout: 'Logout',
  },
  pages: {
    dashboard: 'Portfolio Dashboard',
    history: 'History (Transactions + Cash Flow)',
    funds: 'Fund Management',
    accounts: 'Account Management',
    rebalance: 'Portfolio Rebalance',
    simulator: 'Asset Allocation Simulator',
    help: 'System Management & Backup',
  },
  login: {
    title: 'TradeFolio Login',
    subtitle: 'Taiwan & US Stock Portfolio Management',
    email: 'Email',
    password: 'Password',
    login: 'Login',
    privacy: 'Privacy Notice',
    privacyDesc: 'All data is stored locally on your device. The system does not collect personal information. Please remember to backup regularly.',
  },
  dashboard: {
    netCost: 'Net Cost',
    totalAssets: 'Total Assets',
    totalPL: 'Total P/L',
    annualizedReturn: 'Annualized Return (CAGR)',
    detail: 'Detail',
    includeCash: 'Incl. Cash',
    detailedStatistics: 'Detailed Statistics',
    totalCost: 'Total Cost',
    totalPLAmount: 'Total P/L Amount',
    accumulatedCashDividends: 'Accumulated Cash Dividends',
    accumulatedStockDividends: 'Accumulated Stock Dividends',
    annualizedReturnRate: 'Annualized Return Rate',
    avgExchangeRate: 'Avg Exchange Rate (TWD/USD)',
    currentExchangeRate: 'Current Exchange Rate',
    totalReturnRate: 'Total Return Rate',
    assetVsCostTrend: 'Asset vs Cost Trend',
    aiCorrectHistory: 'AI Correct Historical Assets',
    allocation: 'Allocation',
    annualPerformance: 'Annual Performance',
    year: 'Year',
    startAssets: 'Start Assets',
    annualNetInflow: 'Annual Net Inflow',
    endAssets: 'End Assets',
    annualProfit: 'Annual Profit',
    annualROI: 'Annual ROI',
    brokerageAccounts: 'Brokerage Accounts',
    accountName: 'Account Name',
    totalAssetsNT: 'Total Assets (NT$)',
    marketValueNT: 'Market Value (NT$)',
    balanceNT: 'Balance (NT$)',
    profitNT: 'Profit (NT$)',
    annualizedROI: 'Annualized ROI',
    portfolioHoldings: 'Portfolio Holdings',
    mergedDisplay: 'Merged (By Symbol)',
    detailedDisplay: 'Detailed (By Account)',
    aiUpdatePrices: 'AI Update Prices & Exchange Rates',
    estimatedGrowth8: 'Est. 8% Growth',
    chartLoading: 'Loading chart...',
    noChartData: 'Please add fund deposits and transactions first',
    noHoldings: 'No holdings',
    noAccounts: 'No brokerage accounts. Please add accounts in Account Management.',
    costBreakdown: 'Net Invested Cost Breakdown',
    netInvestedBreakdown: 'Net Invested Breakdown',
    calculationFormula: 'Formula: Net Invested = Deposits - Withdrawals',
    formulaNote: 'Note: For USD accounts, historical exchange rate is used if available, otherwise current rate from settings. Transfers and interest are not included in cost.',
    attention: 'Attention',
    date: 'Date',
    category: 'Category',
    originalAmount: 'Original Amount',
    twdCost: 'TWD Cost',
    totalNetInvested: 'Total (Net Invested)',
    deposit: 'Deposit (+)',
    withdraw: 'Withdraw (-)',
    fixedTWD: 'Fixed TWD Amount',
    historicalRate: 'Historical Rate',
    currentRate: 'Current Rate',
    taiwanDollar: 'TWD',
    chartLabels: {
      investmentCost: 'Investment Cost',
      accumulatedPL: 'Accumulated P/L',
      estimatedAssets: 'Est. Total Assets (8%)',
      totalAssets: 'Total Assets',
      realData: ' (Real Price)',
      estimated: ' (Estimated)',
    },
    aiAdvisor: 'Gemini AI Investment Advisor',
    aiAdvisorDesc: 'Analyze your portfolio allocation, risks, and potential opportunities.',
    startAnalysis: 'Start Analysis',
    analyzing: 'Analyzing...',
    viewCalculationDetails: 'View Details',
  },
  funds: {
    title: 'Fund Management',
    operations: 'Operations',
    clearAll: 'Clear All Funds',
    batchImport: 'Batch Import',
    addRecord: '+ Add Record',
    filter: 'Filter',
    clearFilters: 'Clear All Filters',
    accountFilter: 'Account',
    typeFilter: 'Type',
    dateFrom: 'From Date',
    dateTo: 'To Date',
    allAccounts: 'All Accounts',
    allTypes: 'All Types',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    transfer: 'Transfer',
    interest: 'Interest',
    showRecords: 'Showing {count} records',
    totalRecords: 'Total {total}',
    last30Days: 'Last 30 Days',
    thisYear: 'This Year',
  },
  history: {
    operations: 'Operations',
    batchUpdateMarket: 'Batch Update Market',
    clearAll: 'Clear All Transactions',
    batchImport: 'Batch Import',
    addRecord: '+ Add Record',
    filter: 'Filter',
    accountFilter: 'Filter by Account',
    tickerFilter: 'Filter by Ticker',
    dateFrom: 'From Date',
    dateTo: 'To Date',
    includeCashFlow: 'Include Cash Flow Records',
    clearFilters: 'Clear All Filters',
  },
  labels: {
    date: 'Date',
    account: 'Account',
    amount: 'Amount',
    balance: 'Balance',
    action: 'Action',
    type: 'Type',
    price: 'Price',
    quantity: 'Quantity',
    currency: 'Currency',
    fee: 'Fee',
    exchangeRate: 'Exchange Rate',
    totalCost: 'Total Cost',
    category: 'Category',
    description: 'Symbol/Description',
    note: 'Note',
  },
  holdings: {
    portfolioHoldings: 'Portfolio Holdings',
    mergedDisplay: 'Merged by Symbol',
    detailedDisplay: 'Detailed by Account',
    aiUpdatePrices: 'AI Update Prices & Exchange Rates',
    aiSearching: 'AI Searching...',
    market: 'Market',
    ticker: 'Ticker',
    quantity: 'Quantity',
    currentPrice: 'Current Price',
    weight: 'Weight',
    cost: 'Total Cost',
    marketValue: 'Market Value',
    profitLoss: 'P/L',
    annualizedROI: 'Annualized ROI',
    dailyChange: 'Daily Change',
    avgPrice: 'Avg Price',
    noHoldings: 'No holdings. Please add transactions.',
  },
};

// 翻譯映射
const translations: Record<Language, Translations> = {
  'zh-TW': zhTW,
  'en': en,
};

// 獲取當前語言
export const getLanguage = (): Language => {
  const saved = localStorage.getItem('tf_language');
  return (saved === 'en' || saved === 'zh-TW') ? saved : 'zh-TW';
};

// 設置語言
export const setLanguage = (lang: Language) => {
  localStorage.setItem('tf_language', lang);
};

// 獲取翻譯
export const t = (lang: Language): Translations => {
  return translations[lang] || translations['zh-TW'];
};

// 翻譯函數（帶參數替換）
export const translate = (key: string, lang: Language, params?: Record<string, string | number>): string => {
  const keys = key.split('.');
  let value: any = translations[lang] || translations['zh-TW'];
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) return key;
  }
  
  if (typeof value === 'string' && params) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey]?.toString() || match;
    });
  }
  
  return typeof value === 'string' ? value : key;
};

