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
    netCost: '淨投入成本 (Net Cost)',
    totalAssets: '目前總資產 (Assets)',
    totalPL: '總損益 (Total P/L)',
    annualizedReturn: '真實年化 (CAGR)',
    detail: '明細',
    includeCash: '含現金',
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

