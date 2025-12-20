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
    showingRecords: string;
    totalRecords: string;
    last30Days: string;
    thisYear: string;
    noTransactions: string;
    noMatchingTransactions: string;
    edit: string;
    delete: string;
    includeCashFlowDesc: string;
    hiddenCashFlowRecords: string;
    cashFlowDeposit: string;
    cashFlowWithdraw: string;
    cashFlowTransfer: string;
    cashFlowTransferIn: string;
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
  // 帳戶管理
  accounts: {
    addAccount: string;
    accountName: string;
    accountNamePlaceholder: string;
    currency: string;
    currencyTWD: string;
    currencyUSD: string;
    currencyJPY: string;
    subBrokerage: string;
    add: string;
    update: string;
    editAccount: string;
    balance: string;
    cancel: string;
    updateAccount: string;
    confirmDelete: string;
    confirmDeleteMessage: string;
    deleteWarning: string;
    deleteAccount: string;
    noAccounts: string;
    cashBalance: string;
    editAccountTitle: string;
  };
  // 再平衡
  rebalance: {
    title: string;
    resetToCurrent: string;
    totalAssets: string;
    enable: string;
    symbol: string;
    currentPrice: string;
    currentValue: string;
    currentWeight: string;
    targetWeight: string;
    targetValue: string;
    adjustAmount: string;
    suggestedAction: string;
    cash: string;
    totalEnabled: string;
    remainingFunds: string;
    notParticipating: string;
    accounts: string;
    description: string;
    description1: string;
    description2: string;
    description3: string;
    description4: string;
    description5: string;
    description6: string;
    buy: string;
    sell: string;
  };
  // 模擬器
  simulator: {
    title: string;
    description: string;
    descriptionWarning: string;
    basicSettings: string;
    initialAmount: string;
    investmentYears: string;
    regularInvestment: string;
    regularAmount: string;
    frequency: string;
    monthly: string;
    quarterly: string;
    yearly: string;
    annualTotal: string;
    setToZero: string;
    importFromHoldings: string;
    importButton: string;
    manualAdd: string;
    ticker: string;
    tickerPlaceholder: string;
    market: string;
    marketTW: string;
    marketUS: string;
    marketUK: string;
    marketJP: string;
    annualReturn: string;
    autoQuery: string;
    querying: string;
    allocation: string;
    add: string;
    assetList: string;
    autoBalance: string;
    clearAll: string;
    allocationSum: string;
    totalInvested: string;
    finalValue: string;
    totalReturn: string;
    portfolioAnnualReturn: string;
    initial: string;
    yearlyProjection: string;
    yearlyReturnAnalysis: string;
    detailedYearlyProjection: string;
    year: string;
    assetValue: string;
    yearlyReturn: string;
    cumulativeInvestment: string;
    yearlyReturnRate: string;
    allocationWarning: string;
    confirmClear: string;
    confirmClearMessage: string;
    dataWarning: string;
    dataWarningDesc: string;
    cagrExplanation: string;
    cagrFormula: string;
    cagrFormulaDesc: string;
    cagrExample: string;
    cagrExampleValue: string;
    errorEnterTicker: string;
    errorAllocationRange: string;
    errorAllocationSum: string;
    errorNoHoldings: string;
    errorEnterTickerFirst: string;
    errorCannotGetReturn: string;
    errorQueryFailed: string;
    close: string;
    cancel: string;
    yearPrefix: string;
    yearSuffix: string;
    queryingReturn: string;
    autoQueryTitle: string;
  };
  // 系統說明
  help: {
    dataManagement: string;
    export: string;
    exportDesc: string;
    downloadBackup: string;
    import: string;
    importWarning: string;
    uploadBackup: string;
    authorizedUsers: string;
    authorizedUsersDesc: string;
    emailAccount: string;
    status: string;
    systemAuthorized: string;
    contact: string;
    contactTitle: string;
    contactDesc: string;
    contactEmail: string;
    documentation: string;
    copyAll: string;
    copied: string;
    print: string;
    confirmImport: string;
    confirmImportMessage: string;
    confirmImportWarning: string;
    confirmOverride: string;
    documentationContent: string;
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
    accountFilter: '帳戶篩選',
    tickerFilter: '股票代號篩選',
    dateFrom: '開始日期',
    dateTo: '結束日期',
    includeCashFlow: '包含現金流記錄',
    clearFilters: '清除所有篩選',
    showingRecords: '顯示 {count} 筆記錄',
    totalRecords: '共 {total} 筆：{transactionCount} 筆交易{hasCashFlow}',
    last30Days: '最近30天',
    thisYear: '今年',
    noTransactions: '尚無交易記錄',
    noMatchingTransactions: '找不到符合條件的交易',
    edit: '編輯',
    delete: '刪除',
    includeCashFlowDesc: '勾選後會顯示資金匯入、提取、轉帳等記錄，方便查看餘額變化',
    hiddenCashFlowRecords: '已隱藏 {count} 筆現金流記錄',
    cashFlowDeposit: '資金匯入',
    cashFlowWithdraw: '資金提取',
    cashFlowTransfer: '帳戶轉出',
    cashFlowTransferIn: '帳戶轉入',
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
  accounts: {
    addAccount: '新增證券戶 / 銀行帳戶',
    accountName: '帳戶名稱',
    accountNamePlaceholder: '例如: 富邦證券, Firstrade',
    currency: '幣別',
    currencyTWD: '台幣',
    currencyUSD: '美金',
    currencyJPY: '日幣',
    subBrokerage: '複委託',
    add: '新增',
    update: '更新',
    editAccount: '編輯帳戶',
    balance: '餘額',
    cancel: '取消',
    updateAccount: '更新帳戶',
    confirmDelete: '確認刪除帳戶',
    confirmDeleteMessage: '您確定要刪除「{name}」嗎？',
    deleteWarning: '注意：這不會刪除該帳戶下的歷史交易紀錄，但在篩選時可能會出現異常。',
    deleteAccount: '確認刪除',
    noAccounts: '尚無帳戶，請上方新增第一個證券戶。',
    cashBalance: '現金餘額',
    editAccountTitle: '編輯帳戶',
  },
  rebalance: {
    title: '個股再平衡',
    resetToCurrent: '帶入目前比重',
    totalAssets: '總資產 (含現金)',
    enable: '平衡',
    symbol: '標的',
    currentPrice: '現價',
    currentValue: '現值',
    currentWeight: '目前佔比',
    targetWeight: '目標佔比',
    targetValue: '目標價值',
    adjustAmount: '調整金額',
    suggestedAction: '建議操作',
    cash: '現金',
    totalEnabled: '已啟用項目',
    remainingFunds: '剩餘資金',
    notParticipating: '不參與平衡',
    accounts: '個帳戶',
    description: '說明：',
    description1: '相同名稱的個股會自動合併顯示，目標佔比會按現值比例分配給各個帳戶。',
    description2: '勾選「平衡」欄位來選擇哪些股債需要再平衡，未勾選的項目將不參與再平衡計算。',
    description3: '現金部分也可以勾選，若勾選現金，剩餘比例將自動分配給現金；若不勾選，現金將維持現狀。',
    description4: '目標佔比會自動儲存。若總和不為 100%，剩餘比例將自動分配給已勾選的現金。',
    description5: '若「現金」目標比例為負值，代表您的股票目標配置超過 100%，請調降部分持股目標。',
    description6: '點擊「帶入目前比重」可快速重置所有目標值為當前現況。',
    buy: '買',
    sell: '賣',
  },
  simulator: {
    title: '資產配置模擬說明',
    description: '此工具可讓您比較不同資產配置的預期獲利。請輸入各種股票或 ETF 的成立以來年化報酬率作為假設值，系統會根據您的配置比例計算組合的預期表現。',
    descriptionWarning: '⚠️ 注意：過往績效不代表未來表現，此模擬僅供參考。',
    basicSettings: '基本設定',
    initialAmount: '初始投資金額',
    investmentYears: '投資年數',
    regularInvestment: '定期定額投資（選填）',
    regularAmount: '定期定額金額',
    frequency: '投入頻率',
    monthly: '每月投入',
    quarterly: '每季投入',
    yearly: '每年投入',
    annualTotal: '年度總投入',
    setToZero: '設定為 0 則不使用定期定額',
    importFromHoldings: '現有持倉導入',
    importButton: '從現有持倉導入',
    manualAdd: '手動添加資產',
    ticker: '股票代號',
    tickerPlaceholder: '例如: 0050',
    market: '市場',
    marketTW: '台股',
    marketUS: '美股',
    marketUK: '英股',
    marketJP: '日股',
    annualReturn: '年化報酬率',
    autoQuery: '🔍 自動查詢',
    querying: '查詢中',
    allocation: '配置比例',
    add: '添加',
    assetList: '資產配置列表',
    autoBalance: '自動平衡',
    clearAll: '清空全部',
    allocationSum: '配置比例總和:',
    totalInvested: '總投入金額',
    finalValue: '最終價值',
    totalReturn: '總報酬',
    portfolioAnnualReturn: '組合年化報酬',
    initial: '初始',
    yearlyProjection: '年度預測趨勢圖',
    yearlyReturnAnalysis: '年度報酬分析',
    detailedYearlyProjection: '詳細年度預測',
    year: '年份',
    assetValue: '資產價值',
    yearlyReturn: '年度報酬',
    cumulativeInvestment: '累積投入',
    yearlyReturnRate: '年度報酬率',
    allocationWarning: '⚠️ 配置比例總和必須等於 100%，目前為',
    confirmClear: '確認清空',
    confirmClearMessage: '確定要清空所有資產配置嗎？此操作無法復原。',
    dataWarning: '⚠️ 數據完整性警告：',
    dataWarningDesc: '建議：如果計算結果明顯低於預期，可能是因為 Yahoo Finance 的歷史數據不完整。您可以參考官方資料或手動輸入更準確的年化報酬率。',
    cagrExplanation: '📊 年化報酬率計算說明：',
    cagrFormula: 'CAGR = ((當前價格 / 初始價格) ^ (1 / 年數)) - 1',
    cagrFormulaDesc: '系統使用 CAGR (複合年成長率) 公式計算：',
    cagrExample: '這表示如果從上市時買入並持有至今，每年的平均複合報酬率。',
    cagrExampleValue: '範例：股票從 100 元漲到 200 元，經過 5 年，年化報酬率約為 14.87%',
    errorEnterTicker: '請輸入股票代號',
    errorAllocationRange: '配置比例必須在 0% 到 100% 之間',
    errorAllocationSum: '配置比例總和不能超過 100%',
    errorNoHoldings: '目前沒有持倉資料可導入',
    errorEnterTickerFirst: '請先輸入股票代號',
    errorCannotGetReturn: '無法取得 {ticker} 的年化報酬率，請手動輸入',
    errorQueryFailed: '查詢年化報酬率失敗，請手動輸入',
    close: '關閉',
    cancel: '取消',
    yearPrefix: '第',
    yearSuffix: '年',
    queryingReturn: '正在查詢 {ticker} 的年化報酬率...',
    autoQueryTitle: '自動查詢上市以來的年化報酬率',
  },
  help: {
    dataManagement: '資料備份與還原',
    export: '備份資料',
    exportDesc: '將您的交易紀錄、帳戶設定與股價資訊匯出為 JSON 檔案，建議定期備份以免資料遺失。',
    downloadBackup: '下載備份檔 (.json)',
    import: '還原資料',
    importWarning: '警告：匯入備份檔將會完全覆蓋您目前的系統資料。',
    uploadBackup: '上傳備份檔',
    authorizedUsers: '使用者授權名單',
    authorizedUsersDesc: '以下為系統預設可免密碼登入的 Email 名單 (已隱碼保護)：',
    emailAccount: 'Email 帳號',
    status: '狀態',
    systemAuthorized: '系統授權',
    contact: '購買授權與聯絡管理員',
    contactTitle: '喜歡這個系統嗎？',
    contactDesc: '如果您是非會員並希望獲得永久使用權限，或是有任何功能建議與 Bug 回報，歡迎聯繫開發者。',
    contactEmail: '聯絡管理員',
    documentation: '使用說明',
    copyAll: '複製全文',
    copied: '已複製!',
    print: '列印',
    confirmImport: '警告：確認覆蓋資料？',
    confirmImportMessage: '您即將匯入 {fileName}。',
    confirmImportWarning: '這將會完全清除目前的交易紀錄與設定，且無法復原。',
    confirmOverride: '確認覆蓋',
    documentationContent: `# TradeFolio 使用說明書

> **隱私與安全聲明** :
> 本系統採用離線優先架構，**所有交易資料皆儲存於您的個人電腦或手機瀏覽器中**，不會上傳至任何伺服器。**系統不涉及收集個人資料**，請安心使用。

## 1. 系統簡介
TradeFolio 是一個支援台股與美股的資產管理工具，協助投資人追蹤資產變化、計算報酬率並管理資金流向。

## 2. 快速開始
1. **建立帳戶**: 前往「證券戶管理」新增您的銀行或證券帳戶。
2. **匯入資金**: 前往「資金管理」，選擇「匯入資金」將薪資或存款記錄到系統中。
3. **新增交易**: 點擊右上角「記一筆」輸入股票買賣紀錄。
4. **查看報表**: 回到「儀表板」查看資產折線圖與績效。

## 3. 功能詳解

### 資金管理 (Fund Management)
* **匯入 (Import)**: 外部資金流入 (如薪資)。
* **匯出 (Export)**: 資金流出 (如生活費提領)。
* **轉帳 (Transfer)**: 不同帳戶間的資金移動 (如銀行轉證券戶)。
* **利息**: 記錄存款或證券戶利息。

### 交易類別
* **Buy/Sell**: 一般買賣。
* **Dividend**: 股票股息 (股數增加)。
* **Cash Dividend**: 現金股息 (餘額增加)。

## 4. 常見問題 (FAQ)
Q: 如何計算年化報酬率？
A: 系統採用資金加權報酬率概念，考慮資金進出的時間點進行估算。

Q: 匯率如何設定？
A: 可在右上角設定全域 USD/TWD 匯率，或在轉帳時指定當下匯率。

Q: 資料儲存與隱私？
A: 如同前述，**資料完全儲存在您個人的裝置（電腦或手機）上**，不涉及個資問題。為了避免裝置損壞或瀏覽器快取被清除導致資料遺失，**強烈建議定期使用下方的「備份資料」功能**自行保存 JSON 檔案。

Q: 無法下載備份檔？
A: 若您是在 LINE 開啟連結，系統可能會阻擋彈跳視窗導致無法正常下載。建議您在瀏覽器 (如 Chrome 或 Safari) 再進行操作。

Q: 為何股價無法更新？
A: 檢查該隻股票市場是否設定正確，若錯誤請在「交易紀錄」裡選擇「批量修改市場」，進行更換市場。

Q: 會員有何優點？
A: 界面會多出再平衡、圖表、年度績效表，讓使用者更加了解自己投資結果。

Q: 會員的年度績效表為何有勾勾？
A: 具勾勾部份是顯示該年度年底的績效表現，無勾勾部份是按你的報酬率反推的你績效表現，僅是預估效果。

Q: 股價與匯率為何與按「AI聯網更新股價&匯率」得到現價為何不同？
A: 股價與匯率因為是抓取網頁現值，故現值會慢三分鐘至五分鐘不等，所以勿拿來當買賣的參考值，建議買賣的參考仍以証券公司為主，此軟體僅適用作統計資產功能，例如有緊急預備金、旅遊基金、退休金、定存、股債券等統計參考，並無証券交易買賣功能；另外投資有賺有賠，記得預留緊急預備金，感謝您的使用。`,
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
    showingRecords: 'Showing {count} records',
    totalRecords: 'Total {total}: {transactionCount} transactions{hasCashFlow}',
    last30Days: 'Last 30 Days',
    thisYear: 'This Year',
    noTransactions: 'No transactions',
    noMatchingTransactions: 'No matching transactions found',
    edit: 'Edit',
    delete: 'Delete',
    includeCashFlowDesc: 'Check to show deposits, withdrawals, transfers, etc. for viewing balance changes',
    hiddenCashFlowRecords: '{count} cash flow records hidden',
    cashFlowDeposit: 'Deposit',
    cashFlowWithdraw: 'Withdrawal',
    cashFlowTransfer: 'Transfer Out',
    cashFlowTransferIn: 'Transfer In',
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
  accounts: {
    addAccount: 'Add Brokerage / Bank Account',
    accountName: 'Account Name',
    accountNamePlaceholder: 'e.g. Fubon Securities, Firstrade',
    currency: 'Currency',
    currencyTWD: 'TWD',
    currencyUSD: 'USD',
    currencyJPY: 'JPY',
    subBrokerage: 'Sub-brokerage',
    add: 'Add',
    update: 'Update',
    editAccount: 'Edit Account',
    balance: 'Balance',
    cancel: 'Cancel',
    updateAccount: 'Update Account',
    confirmDelete: 'Confirm Delete Account',
    confirmDeleteMessage: 'Are you sure you want to delete "{name}"?',
    deleteWarning: 'Note: This will not delete historical transaction records for this account, but may cause issues when filtering.',
    deleteAccount: 'Confirm Delete',
    noAccounts: 'No accounts yet. Please add your first brokerage account above.',
    cashBalance: 'Cash Balance',
    editAccountTitle: 'Edit Account',
  },
  rebalance: {
    title: 'Stock Rebalancing',
    resetToCurrent: 'Reset to Current Weights',
    totalAssets: 'Total Assets (Incl. Cash)',
    enable: 'Enable',
    symbol: 'Symbol (Account)',
    currentPrice: 'Current Price',
    currentValue: 'Current Value',
    currentWeight: 'Current Weight',
    targetWeight: 'Target Weight %',
    targetValue: 'Target Value',
    adjustAmount: 'Adjust Amount',
    suggestedAction: 'Suggested Action (Shares)',
    cash: 'Cash',
    totalEnabled: 'Total (Enabled Items)',
    remainingFunds: 'Remaining Funds',
    notParticipating: 'Not Participating',
    accounts: ' accounts',
    description: 'Description:',
    description1: 'Stocks with the same name are automatically merged and displayed. Target weights are allocated proportionally to each account based on current values.',
    description2: 'Check the "Enable" column to select which stocks/bonds need rebalancing. Unchecked items will not participate in rebalancing calculations.',
    description3: 'Cash can also be checked. If checked, the remaining percentage will be automatically allocated to cash; if not checked, cash will remain unchanged.',
    description4: 'Target weights are automatically saved. If the total is not 100%, the remaining percentage will be automatically allocated to checked cash.',
    description5: 'If the "Cash" target percentage is negative, it means your stock target allocation exceeds 100%. Please reduce some stock target percentages.',
    description6: 'Click "Reset to Current Weights" to quickly reset all target values to current status.',
    buy: 'Buy',
    sell: 'Sell',
  },
  simulator: {
    title: 'Asset Allocation Simulator Description',
    description: 'This tool allows you to compare expected returns of different asset allocations. Enter the annualized return rates since inception for various stocks or ETFs as assumptions, and the system will calculate the expected performance of your portfolio based on your allocation ratios.',
    descriptionWarning: '⚠️ Note: Past performance does not guarantee future results. This simulation is for reference only.',
    basicSettings: 'Basic Settings',
    initialAmount: 'Initial Investment Amount (TWD)',
    investmentYears: 'Investment Years',
    regularInvestment: 'Regular Investment (Optional)',
    regularAmount: 'Regular Investment Amount (TWD)',
    frequency: 'Investment Frequency',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
    annualTotal: 'Annual Total Investment',
    setToZero: 'Set to 0 to disable regular investment',
    importFromHoldings: 'Import from Existing Holdings',
    importButton: 'Import from Existing Holdings',
    manualAdd: 'Manually Add Asset',
    ticker: 'Stock Ticker',
    tickerPlaceholder: 'e.g. 0050',
    market: 'Market',
    marketTW: 'Taiwan (TW)',
    marketUS: 'US (US)',
    marketUK: 'UK (UK)',
    marketJP: 'Japan (JP)',
    annualReturn: 'Annualized Return (%)',
    autoQuery: '🔍 Auto Query',
    querying: 'Querying',
    allocation: 'Allocation (%)',
    add: 'Add',
    assetList: 'Asset Allocation List',
    autoBalance: 'Auto Balance',
    clearAll: 'Clear All',
    allocationSum: 'Total Allocation:',
    totalInvested: 'Total Invested',
    finalValue: 'Final Value',
    totalReturn: 'Total Return',
    portfolioAnnualReturn: 'Portfolio Annualized Return',
    initial: 'Initial',
    yearlyProjection: 'Yearly Projection Trend Chart',
    yearlyReturnAnalysis: 'Yearly Return Analysis',
    detailedYearlyProjection: 'Detailed Yearly Projection',
    year: 'Year',
    assetValue: 'Asset Value',
    yearlyReturn: 'Yearly Return',
    cumulativeInvestment: 'Cumulative Investment',
    yearlyReturnRate: 'Yearly Return Rate',
    allocationWarning: '⚠️ Total allocation must equal 100%, currently',
    confirmClear: 'Confirm Clear',
    confirmClearMessage: 'Are you sure you want to clear all asset allocations? This action cannot be undone.',
    dataWarning: '⚠️ Data Integrity Warning:',
    dataWarningDesc: 'Suggestion: If the calculation results are significantly lower than expected, it may be because Yahoo Finance historical data is incomplete. You can refer to official sources or manually enter a more accurate annualized return rate.',
    cagrExplanation: '📊 Annualized Return Calculation Explanation:',
    cagrFormula: 'CAGR = ((Current Price / Initial Price) ^ (1 / Years)) - 1',
    cagrFormulaDesc: 'The system uses the CAGR (Compound Annual Growth Rate) formula:',
    cagrExample: 'This represents the average compound return rate per year if purchased at IPO and held until now.',
    cagrExampleValue: 'Example: Stock rises from 100 to 200 over 5 years, annualized return is approximately 14.87%',
    errorEnterTicker: 'Please enter stock ticker',
    errorAllocationRange: 'Allocation must be between 0% and 100%',
    errorAllocationSum: 'Total allocation cannot exceed 100%',
    errorNoHoldings: 'No holdings data available to import',
    errorEnterTickerFirst: 'Please enter stock ticker first',
    errorCannotGetReturn: 'Unable to get annualized return for {ticker}, please enter manually',
    errorQueryFailed: 'Failed to query annualized return, please enter manually',
    close: 'Close',
    cancel: 'Cancel',
    yearPrefix: 'Year',
    yearSuffix: '',
    queryingReturn: 'Querying annualized return for {ticker}...',
    autoQueryTitle: 'Auto query annualized return since IPO',
  },
  help: {
    dataManagement: 'Data Management',
    export: 'Export',
    exportDesc: 'Export your transaction records, account settings, and stock price information as a JSON file. Regular backups are recommended to prevent data loss.',
    downloadBackup: 'Download Backup (.json)',
    import: 'Import',
    importWarning: 'Warning: Importing a backup file will completely overwrite your current system data.',
    uploadBackup: 'Upload Backup File',
    authorizedUsers: 'Authorized Users',
    authorizedUsersDesc: 'The following is the system default list of emails that can log in without a password (masked for privacy):',
    emailAccount: 'Email Account',
    status: 'Status',
    systemAuthorized: 'System Authorized',
    contact: 'Purchase Authorization & Contact Administrator',
    contactTitle: 'Like this system?',
    contactDesc: 'If you are a non-member and wish to obtain permanent usage rights, or have any feature suggestions and bug reports, please contact the developer.',
    contactEmail: 'Contact Administrator (Email)',
    documentation: 'Documentation',
    copyAll: 'Copy All',
    copied: 'Copied!',
    print: 'Print',
    confirmImport: 'Warning: Confirm Override Data?',
    confirmImportMessage: 'You are about to import {fileName}.',
    confirmImportWarning: 'This will completely clear your current transaction records and settings, and cannot be undone.',
    confirmOverride: 'Confirm Override',
    documentationContent: `# TradeFolio User Manual

> **Privacy & Security Statement**:
> This system adopts an offline-first architecture. **All transaction data is stored on your personal computer or mobile browser** and is not uploaded to any server. **The system does not involve collecting personal information**. Please use with confidence.

## 1. System Introduction
TradeFolio is an asset management tool that supports Taiwan and US stocks, helping investors track asset changes, calculate returns, and manage fund flows.

## 2. Quick Start
1. **Create Account**: Go to "Account Management" to add your bank or brokerage account.
2. **Import Funds**: Go to "Fund Management", select "Import Funds" to record salary or deposits into the system.
3. **Add Transaction**: Click "Add Transaction" in the top right corner to input stock buy/sell records.
4. **View Reports**: Return to "Dashboard" to view asset line charts and performance.

## 3. Feature Details

### Fund Management
* **Import**: External fund inflow (e.g., salary).
* **Export**: Fund outflow (e.g., living expenses withdrawal).
* **Transfer**: Fund movement between different accounts (e.g., bank to brokerage account).
* **Interest**: Record deposit or brokerage account interest.

### Transaction Types
* **Buy/Sell**: General buy/sell transactions.
* **Dividend**: Stock dividend (number of shares increases).
* **Cash Dividend**: Cash dividend (balance increases).

## 4. Frequently Asked Questions (FAQ)
Q: How is the annualized return rate calculated?
A: The system uses the money-weighted return concept, taking into account the timing of fund inflows and outflows for estimation.

Q: How to set the exchange rate?
A: You can set the global USD/TWD exchange rate in the top right corner, or specify the current exchange rate when transferring funds.

Q: Data storage and privacy?
A: As mentioned above, **data is completely stored on your personal device (computer or mobile)** and does not involve personal information issues. To avoid data loss due to device damage or browser cache clearing, **it is strongly recommended to regularly use the "Backup Data" function below** to save JSON files yourself.

Q: Cannot download backup file?
A: If you open the link in LINE, the system may block pop-up windows, preventing normal downloads. It is recommended to use a browser (such as Chrome or Safari) for operations.

Q: Why can't stock prices be updated?
A: Check if the stock market is set correctly. If incorrect, select "Batch Update Market" in "Transaction History" to change the market.

Q: What are the benefits of membership?
A: The interface will include rebalancing, charts, and annual performance tables, allowing users to better understand their investment results.

Q: Why are there checkmarks in the member's annual performance table?
A: The parts with checkmarks show the performance at the end of that year. The parts without checkmarks are performance estimates calculated by reverse-engineering based on your return rate, which are only estimated effects.

Q: Why are stock prices and exchange rates different from the current prices obtained by clicking "AI Update Prices & Exchange Rates"?
A: Stock prices and exchange rates are scraped from web current values, so the current values may lag by three to five minutes. Therefore, do not use them as references for buying and selling. It is recommended to use securities companies as the main reference for buying and selling. This software is only suitable for statistical asset functions, such as emergency funds, travel funds, retirement funds, fixed deposits, stocks and bonds, etc. It does not have securities trading functions. Additionally, investments have profits and losses. Remember to reserve emergency funds. Thank you for using.`,
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

