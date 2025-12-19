
export enum Market {
  US = 'US',
  TW = 'TW',
  UK = 'UK',
  JP = 'JP'
}

export enum Currency {
  TWD = 'TWD',
  USD = 'USD'
}

export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
  DIVIDEND = 'DIVIDEND', // Reinvested (Stock dividend)
  CASH_DIVIDEND = 'CASH_DIVIDEND', // Cash payout
  TRANSFER_IN = 'TRANSFER_IN', // Stock Transfer In
  TRANSFER_OUT = 'TRANSFER_OUT' // Stock Transfer Out
}

export enum CashFlowType {
  DEPOSIT = 'DEPOSIT', // Import: Salary, Savings -> Account
  WITHDRAW = 'WITHDRAW', // Export: Account -> Living expenses
  TRANSFER = 'TRANSFER', // Internal: Account A -> Account B
  INTEREST = 'INTEREST' // Interest income
}

export interface Account {
  id: string;
  name: string;
  currency: Currency;
  isSubBrokerage: boolean; // For USD accounts in TW brokers
  balance: number; // Cash balance
}

export interface CashFlow {
  id: string;
  date: string;
  type: CashFlowType;
  amount: number; // Native currency amount (e.g., USD for USD account)
  amountTWD?: number; // Exact TWD value involved (for cost basis accuracy)
  fee?: number; // Fee involved in the transaction (e.g. wire fee)
  accountId: string; // Source account (or Target for Deposit)
  targetAccountId?: string; // Only for Transfer
  exchangeRate?: number; // If transferring between currencies
  note?: string;
}

export interface Transaction {
  id: string;
  date: string; // ISO Date string
  ticker: string;
  market: Market;
  type: TransactionType;
  price: number;
  quantity: number;
  fees: number;
  accountId: string;
  note?: string;
  amount?: number;
}

export interface Holding {
  ticker: string;
  market: Market;
  quantity: number;
  avgCost: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  accountId: string;
  // New fields for Asset Allocation Table
  weight: number; // % of Total Portfolio (Invested + Cash)
  annualizedReturn: number; // CAGR %
  dailyChange?: number; // Price change amount
  dailyChangePercent?: number; // Price change %
  firstBuyDate?: string; // Helper for ROI calc
}

export interface PortfolioSummary {
  totalCostTWD: number;
  totalValueTWD: number;
  totalPLTWD: number;
  totalPLPercent: number;
  cashBalanceTWD: number; // Total cash across accounts converted to TWD
  netInvestedTWD: number; // Total cash deposits - withdrawals
  annualizedReturn: number; // CAGR
  exchangeRateUsdToTwd: number;
  // Detailed fields
  accumulatedCashDividendsTWD: number;
  accumulatedStockDividendsTWD: number;
  avgExchangeRate: number;
}

export interface ChartDataPoint {
  year: string;
  cost: number; // Purple: Cumulative Invested Cost (Principal)
  profit: number; // New: Cumulative Profit/Loss (Assets - Cost)
  totalAssets: number; // Green: Simulated Historical Value
  estTotalAssets: number; // Blue: Projected/Target curve
  assetCostRatio: number; // Red: Ratio (plotted on separate axis usually, or normalized)
  isRealData?: boolean; // New: Indicates if this point uses real historical prices
}

export interface AssetAllocationItem {
  name: string; // Ticker or "Cash" or "Others"
  value: number; // TWD Value
  ratio: number; // Percentage 0-100
  color: string;
}

export interface AnnualPerformanceItem {
  year: string;
  startAssets: number;
  netInflow: number;
  endAssets: number;
  profit: number;
  roi: number;
  isRealData?: boolean;
}

export interface AccountPerformance {
  id: string;
  name: string;
  currency: Currency;
  totalAssetsTWD: number;
  marketValueTWD: number;
  cashBalanceTWD: number;
  profitTWD: number;
  roi: number;
}

// New Interface for Historical Data Storage
export interface HistoricalData {
  [year: string]: {
    prices: Record<string, number>; // Ticker -> Price on Dec 31
    exchangeRate: number; // USD to TWD on Dec 31
  };
}

// 資產配置模擬相關類型
export interface AssetSimulationItem {
  id: string;
  ticker: string;
  market: Market;
  name?: string; // 可選的資產名稱
  annualizedReturn: number; // 年化報酬率 (%)
  allocation: number; // 配置比例 (%)
}

export interface SimulationResult {
  initialAmount: number; // 初始投資金額
  years: number; // 投資年數
  finalValue: number; // 最終價值
  totalReturn: number; // 總報酬
  totalReturnPercent: number; // 總報酬率 (%)
  annualizedReturn: number; // 組合年化報酬率 (%)
  yearlyProjections: YearlyProjection[]; // 年度預測
  regularInvestment?: {
    amount: number; // 定期定額金額
    frequency: 'monthly' | 'yearly'; // 投入頻率
    totalInvested: number; // 總投入金額（包含初始和定期定額）
  };
}

export interface YearlyProjection {
  year: number;
  value: number; // 該年度末的價值
  return: number; // 該年度的報酬
  returnPercent: number; // 該年度的報酬率 (%)
  regularInvestment?: number; // 該年度的定期定額投入
  cumulativeInvestment?: number; // 累積總投入（包含初始和定期定額）
}


