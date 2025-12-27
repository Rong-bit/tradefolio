
import React, { useState, useEffect, useMemo } from 'react';
import { ChartDataPoint, PortfolioSummary, Holding, AssetAllocationItem, AnnualPerformanceItem, AccountPerformance, CashFlow, Account, CashFlowType, CashFlowCategory, Currency } from '../types';
import { formatCurrency } from '../utils/calculations';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { analyzePortfolio } from '../services/geminiService';
import HoldingsTable from './HoldingsTable';
import { Language, t } from '../utils/i18n';

interface Props {
  summary: PortfolioSummary;
  holdings: Holding[];
  chartData: ChartDataPoint[];
  assetAllocation: AssetAllocationItem[];
  annualPerformance: AnnualPerformanceItem[];
  accountPerformance: AccountPerformance[];
  cashFlows: CashFlow[];
  accounts: Account[];
  onUpdatePrice: (key: string, price: number) => void;
  onAutoUpdate: () => Promise<void>;
  isGuest?: boolean;
  onUpdateHistorical?: () => void; // Changed from Promise to void (opens modal)
  language: Language;
}

const Dashboard: React.FC<Props> = ({ 
  summary, 
  chartData, 
  holdings, 
  assetAllocation, 
  annualPerformance, 
  accountPerformance, 
  cashFlows, 
  accounts,
  onUpdatePrice,
  onAutoUpdate,
  isGuest = false,
  onUpdateHistorical,
  language
}) => {
  const translations = t(language);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showCostDetailModal, setShowCostDetailModal] = useState(false);
  const [showAccountInUSD, setShowAccountInUSD] = useState(false); // 證券戶列表切換顯示幣種：false=台幣, true=美金
  const [showAnnualInUSD, setShowAnnualInUSD] = useState(false); // 年度績效表切換顯示幣種：false=台幣, true=美金

  // 計算各類別的資金總額
  const categoryData = useMemo(() => {
    const categoryMap = new Map<CashFlowCategory, number>();
    
    cashFlows.forEach(cf => {
      if (cf.type === CashFlowType.DEPOSIT || cf.type === CashFlowType.WITHDRAW) {
        const category = cf.category || CashFlowCategory.INVESTMENT;
        const account = accounts.find(a => a.id === cf.accountId);
        
        let amountTWD = 0;
        if (cf.amountTWD && cf.amountTWD > 0) {
          amountTWD = cf.amountTWD;
        } else {
          const rate = cf.exchangeRate || (account?.currency === Currency.USD ? summary.exchangeRateUsdToTwd : 
            (account?.currency === Currency.JPY ? (summary.jpyExchangeRate || 0.21) : 1));
          amountTWD = cf.amount * rate;
        }
        
        const current = categoryMap.get(category) || 0;
        if (cf.type === CashFlowType.DEPOSIT) {
          categoryMap.set(category, current + amountTWD);
        } else {
          categoryMap.set(category, current - amountTWD);
        }
      }
    });
    
    const categories = [
      CashFlowCategory.INVESTMENT,
      CashFlowCategory.EDUCATION,
      CashFlowCategory.TRAVEL,
      CashFlowCategory.LIVING,
      CashFlowCategory.EMERGENCY,
      CashFlowCategory.OTHER
    ];
    
    const colors = [
      '#3b82f6', // 投資 - 藍色
      '#10b981', // 教育 - 綠色
      '#f59e0b', // 旅遊 - 橙色
      '#ef4444', // 生活費 - 紅色
      '#8b5cf6', // 緊急預備金 - 紫色
      '#6b7280'  // 其他 - 灰色
    ];
    
    const categoryNames = {
      [CashFlowCategory.INVESTMENT]: language === 'en' ? 'Investment' : '投資',
      [CashFlowCategory.EDUCATION]: language === 'en' ? 'Education' : '教育資金',
      [CashFlowCategory.TRAVEL]: language === 'en' ? 'Travel' : '旅遊',
      [CashFlowCategory.LIVING]: language === 'en' ? 'Living' : '生活費',
      [CashFlowCategory.EMERGENCY]: language === 'en' ? 'Emergency' : '緊急預備金',
      [CashFlowCategory.OTHER]: language === 'en' ? 'Other' : '其他'
    };
    
    const data = categories.map((cat, idx) => {
      const value = categoryMap.get(cat) || 0;
      const total = Array.from(categoryMap.values()).reduce((sum, v) => sum + Math.abs(v), 0);
      return {
        name: categoryNames[cat],
        value: Math.abs(value),
        ratio: total > 0 ? (Math.abs(value) / total) * 100 : 0,
        color: colors[idx]
      };
    }).filter(item => item.value > 0);
    
    return data;
  }, [cashFlows, accounts, summary.exchangeRateUsdToTwd, summary.jpyExchangeRate, language]);

  useEffect(() => {
    // 確保組件完全掛載，防止 hydration 錯誤
    setIsMounted(true);
  }, []);

  const handleAskAi = async () => {
    setLoadingAi(true);
    const result = await analyzePortfolio(holdings, summary);
    setAiAnalysis(result);
    setLoadingAi(false);
  };

  const costDetails = useMemo(() => {
    return cashFlows
      .filter(cf => cf.type === CashFlowType.DEPOSIT || cf.type === CashFlowType.WITHDRAW)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(cf => {
          const account = accounts.find(a => a.id === cf.accountId);
          if (!account) return null;
          const isUSD = account.currency === Currency.USD;
          
          let rate = 1;
          let rateSource = translations.dashboard.taiwanDollar;
          let amountTWD = 0;

          // Priority 1: Explicit TWD amount (includes fees/adjustments)
          if (cf.amountTWD && cf.amountTWD > 0) {
             amountTWD = cf.amountTWD;
             rate = cf.amount > 0 ? amountTWD / cf.amount : 0; // Derived effective rate
             rateSource = translations.dashboard.fixedTWD;
          } 
          // Priority 2: Standard calculation
          else {
             if (isUSD) {
               if (cf.exchangeRate && cf.exchangeRate > 0) {
                   rate = cf.exchangeRate;
                   rateSource = `${translations.dashboard.historicalRate} (${cf.exchangeRate})`;
               } else {
                   rate = summary.exchangeRateUsdToTwd;
                   rateSource = `${translations.dashboard.currentRate} (${rate})`;
               }
             }
             amountTWD = cf.amount * rate;
          }
          
          return {
              ...cf,
              accountName: account.name,
              currency: account.currency,
              rate,
              rateSource,
              amountTWD
          };
      }).filter((item): item is NonNullable<typeof item> => item !== null);
  }, [cashFlows, accounts, summary.exchangeRateUsdToTwd]);

  const verifyTotal = costDetails.reduce((acc, item) => {
      if (item.type === CashFlowType.DEPOSIT) return acc + item.amountTWD;
      if (item.type === CashFlowType.WITHDRAW) return acc - item.amountTWD;
      return acc;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow border-l-4 border-purple-500 relative">
          <h4 className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex justify-between items-center">
            {translations.dashboard.netCost}
            <button 
              onClick={() => setShowCostDetailModal(true)}
              className="text-indigo-600 hover:text-indigo-800 text-[10px] sm:text-xs bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100"
              title={translations.dashboard.viewCalculationDetails}
            >
              🔍 {translations.dashboard.detail}
            </button>
          </h4>
          <p className="text-xl sm:text-2xl font-bold text-slate-800 mt-2">
            {formatCurrency(summary.netInvestedTWD, 'TWD')}
          </p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow border-l-4 border-green-500">
          <h4 className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">{translations.dashboard.totalAssets}</h4>
          <p className="text-xl sm:text-2xl font-bold text-slate-800 mt-2">
            {formatCurrency(summary.totalValueTWD + summary.cashBalanceTWD, 'TWD')}
          </p>
          <div className="flex justify-between items-end mt-1">
             <p className="text-[10px] sm:text-xs text-slate-400">{translations.dashboard.includeCash}: {formatCurrency(summary.cashBalanceTWD, 'TWD')}</p>
    
          </div>
        </div>
        <div className={`bg-white p-4 sm:p-6 rounded-xl shadow border-l-4 ${summary.totalPLTWD >= 0 ? 'border-success' : 'border-danger'}`}>
          <h4 className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">{translations.dashboard.totalPL}</h4>
          <div className="flex items-baseline gap-2 mt-2">
            <p className={`text-xl sm:text-2xl font-bold ${summary.totalPLTWD >= 0 ? 'text-success' : 'text-danger'}`}>
               {summary.totalPLTWD >= 0 ? '+' : ''}{formatCurrency(summary.totalPLTWD, 'TWD')}
            </p>
          </div>
          <p className={`text-[10px] sm:text-xs font-bold mt-1 ${summary.totalPLTWD >= 0 ? 'text-success' : 'text-danger'}`}>
             {summary.totalPLPercent.toFixed(2)}%
          </p>
        </div>
         <div className="bg-white p-4 sm:p-6 rounded-xl shadow border-l-4 border-blue-500">
          <h4 className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">{translations.dashboard.annualizedReturn}</h4>
          <p className="text-xl sm:text-2xl font-bold text-slate-800 mt-2">
            {summary.annualizedReturn.toFixed(1)}%
          </p>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1">{translations.dashboard.estimatedGrowth8}: {formatCurrency(summary.netInvestedTWD * 1.08, 'TWD')}</p>
        </div>
      </div>

      {/* Detailed Statistics Toggle */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 transition text-slate-700 font-medium text-sm"
        >
          <span>{translations.dashboard.detailedStatistics}</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 transition-transform ${showDetails ? 'rotate-180' : ''}`} 
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        {showDetails && (
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 animate-fade-in border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-500 mb-1">{translations.dashboard.totalCost}</p>
              <p className="text-lg font-bold text-slate-800">{formatCurrency(summary.netInvestedTWD, 'TWD')}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">{translations.dashboard.totalPLAmount}</p>
              <p className={`text-lg font-bold ${summary.totalPLTWD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.totalPLTWD, 'TWD')}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">{translations.dashboard.accumulatedCashDividends}</p>
              <p className="text-lg font-bold text-yellow-600">{formatCurrency(summary.accumulatedCashDividendsTWD, 'TWD')}</p>
            </div>
             <div>
              <p className="text-xs text-slate-500 mb-1">{translations.dashboard.accumulatedStockDividends}</p>
              <p className="text-lg font-bold text-yellow-600">{formatCurrency(summary.accumulatedStockDividendsTWD, 'TWD')}</p>
            </div>
             <div>
              <p className="text-xs text-slate-500 mb-1">{translations.dashboard.annualizedReturnRate}</p>
              <p className={`text-lg font-bold ${summary.annualizedReturn >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {summary.annualizedReturn.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">{translations.dashboard.avgExchangeRate}</p>
              <p className="text-lg font-bold text-slate-700">{summary.avgExchangeRate > 0 ? summary.avgExchangeRate.toFixed(2) : '-'}</p>
            </div>
             <div>
              <p className="text-xs text-slate-500 mb-1">{translations.dashboard.currentExchangeRate}</p>
              <p className="text-lg font-bold text-slate-700">{summary.exchangeRateUsdToTwd.toFixed(2)}</p>
            </div>
             <div>
              <p className="text-xs text-slate-500 mb-1">{translations.dashboard.totalReturnRate}</p>
              <p className={`text-lg font-bold ${summary.totalPLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.totalPLPercent.toFixed(2)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Chart (Cost vs Asset) - Only shown if NOT guest */}
      {!isGuest && (
        <div className="bg-white p-6 rounded-xl shadow overflow-hidden">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 text-lg">{translations.dashboard.assetVsCostTrend}</h3>
              {onUpdateHistorical && (
                <button 
                  onClick={onUpdateHistorical}
                  className="text-xs px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200 flex items-center gap-1 transition"
                  title={language === 'zh-TW' ? '手動編輯或使用 AI 修正歷史股價' : 'Manually edit or use AI to correct historical prices'}
                >
                  <span>🤖</span> {translations.dashboard.aiCorrectHistory}
                </button>
              )}
          </div>
          
          <div className="w-full">
            <div className="w-full h-[300px] md:h-[450px]">
              {isMounted && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="year" 
                      stroke="#64748b" 
                      fontSize={10}
                      className="text-xs"
                      padding={{ left: 10, right: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis yAxisId="left" stroke="#64748b" fontSize={10} className="text-xs" tickFormatter={(val) => `${val / 1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      formatter={(value: number, name: string, props: any) => {
                         // Check if this data point is real or simulated
                         const isReal = props.payload.isRealData;
                         let suffix = '';
                         if (name === translations.dashboard.chartLabels.totalAssets && isReal) suffix = translations.dashboard.chartLabels.realData;
                         else if (name === translations.dashboard.chartLabels.totalAssets) suffix = translations.dashboard.chartLabels.estimated;

                         return [formatCurrency(value, 'TWD'), name + suffix];
                      }}
                    />
                    <Legend />
                    {/* Cost Bar */}
                    <Bar yAxisId="left" dataKey="cost" name={translations.dashboard.chartLabels.investmentCost} stackId="a" fill="#8b5cf6" barSize={30} />
                    
                    {/* Profit Bar - Stacked on Cost, Solid with Dynamic Color */}
                    <Bar 
                      yAxisId="left" 
                      dataKey="profit" 
                      name={translations.dashboard.chartLabels.accumulatedPL} 
                      stackId="a" 
                      barSize={30}
                    >
                      {chartData.map((entry: ChartDataPoint, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.profit >= 0 ? "#10b981" : "#ef4444"}
                        />
                      ))}
                    </Bar>

                    {/* Lines */}
                    <Line yAxisId="left" type="monotone" dataKey="estTotalAssets" name={translations.dashboard.chartLabels.estimatedAssets} stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="totalAssets" name={translations.dashboard.chartLabels.totalAssets} stroke="#06b6d4" strokeWidth={3} dot={{ r: 4, fill: '#06b6d4', strokeWidth: 0 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                    {!isMounted ? translations.dashboard.chartLoading : chartData.length === 0 ? translations.dashboard.noChartData : translations.dashboard.chartLoading}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Allocation Pie Chart - Only shown if NOT guest */}
      {!isGuest && (
        <div className="bg-white p-6 rounded-xl shadow overflow-hidden">
          <h3 className="font-bold text-slate-800 text-lg mb-4">{translations.dashboard.allocation}</h3>
          <div 
            className="w-full flex justify-center" 
          >
            <div className="w-full max-w-md md:max-w-lg aspect-square">
              {isMounted && assetAllocation.length > 0 ? (
                 <ResponsiveContainer 
                   width="100%" 
                   height="100%"
                 >
                   <PieChart>
                      <Pie
                        data={assetAllocation as any[]}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={150}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {assetAllocation.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                         formatter={(value: number) => formatCurrency(value, 'TWD')}
                      />
                      <Legend 
                         layout="vertical" 
                         verticalAlign="middle" 
                         align="right"
                         wrapperStyle={{ fontSize: '10px', paddingLeft: '10px' }}
                         formatter={(value, entry: any) => {
                           const item = assetAllocation.find(a => a.name === value);
                           return <span className="text-xs text-slate-600 ml-1">{value} ({item?.ratio.toFixed(1)}%)</span>;
                         }}
                      />
                   </PieChart>
                 </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  {!isMounted ? translations.dashboard.chartLoading : translations.dashboard.noHoldings}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Allocation Pie Charts - Only shown if NOT guest */}
      {!isGuest && categoryData.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow overflow-hidden">
          <h3 className="font-bold text-slate-800 text-lg mb-4">{language === 'en' ? 'Fund Category Allocation' : '資金用途分類'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryData.map((category, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">{category.name}</h4>
                <div className="w-full max-w-xs aspect-square">
                  {isMounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[category]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                        >
                          <Cell fill={category.color} />
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value, 'TWD')}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                      {translations.dashboard.chartLoading}
                    </div>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className="text-lg font-bold text-slate-800">{formatCurrency(category.value, 'TWD')}</p>
                  <p className="text-xs text-slate-500">{category.ratio.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Annual Performance Table (Below Charts) - Only shown if NOT guest */}
      {!isGuest && annualPerformance.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">{translations.dashboard.annualPerformance}</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">{translations.dashboard.displayCurrency}:</span>
                <button
                  onClick={() => setShowAnnualInUSD(false)}
                  className={`px-3 py-1.5 text-sm rounded transition ${
                    !showAnnualInUSD 
                      ? 'bg-indigo-600 text-white font-medium' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {translations.dashboard.ntd}
                </button>
                <button
                  onClick={() => setShowAnnualInUSD(true)}
                  className={`px-3 py-1.5 text-sm rounded transition ${
                    showAnnualInUSD 
                      ? 'bg-indigo-600 text-white font-medium' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {translations.dashboard.usd}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-medium">
                  <tr>
                    <th className="px-6 py-3">{translations.dashboard.year}</th>
                    <th className="px-6 py-3 text-right">{translations.dashboard.startAssets}</th>
                    <th className="px-6 py-3 text-right">{translations.dashboard.annualNetInflow}</th>
                    <th className="px-6 py-3 text-right">{translations.dashboard.endAssets}</th>
                    <th className="px-6 py-3 text-right">{translations.dashboard.annualProfit}</th>
                    <th className="px-6 py-3 text-right">{translations.dashboard.annualROI}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {annualPerformance.map(item => {
                    // 根據切換狀態決定顯示的幣種和數值
                    const displayCurrency = showAnnualInUSD ? 'USD' : 'TWD';
                    const startAssets = showAnnualInUSD ? item.startAssets / summary.exchangeRateUsdToTwd : item.startAssets;
                    const netInflow = showAnnualInUSD ? item.netInflow / summary.exchangeRateUsdToTwd : item.netInflow;
                    const endAssets = showAnnualInUSD ? item.endAssets / summary.exchangeRateUsdToTwd : item.endAssets;
                    const profit = showAnnualInUSD ? item.profit / summary.exchangeRateUsdToTwd : item.profit;
                    
                    return (
                      <tr key={item.year} className="hover:bg-slate-50">
                        <td className="px-6 py-3 font-bold text-slate-700">
                          {item.year}
                          {item.isRealData && <span title={language === 'zh-TW' ? '真實歷史數據' : 'Real historical data'} className="ml-2 text-xs cursor-help">✅</span>}
                        </td>
                        <td className="px-6 py-3 text-right text-slate-500">{formatCurrency(startAssets, displayCurrency)}</td>
                        <td className="px-6 py-3 text-right text-slate-500">{formatCurrency(netInflow, displayCurrency)}</td>
                        <td className="px-6 py-3 text-right font-medium">{formatCurrency(endAssets, displayCurrency)}</td>
                        <td className={`px-6 py-3 text-right font-bold ${profit >= 0 ? 'text-success' : 'text-danger'}`}>
                          {formatCurrency(profit, displayCurrency)}
                        </td>
                        <td className={`px-6 py-3 text-right font-bold ${item.roi >= 0 ? 'text-success' : 'text-danger'}`}>
                          {item.roi.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
      )}

      {/* Account List Card */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-lg">{translations.dashboard.brokerageAccounts}</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">{translations.dashboard.displayCurrency}:</span>
            <button
              onClick={() => setShowAccountInUSD(false)}
              className={`px-3 py-1.5 text-sm rounded transition ${
                !showAccountInUSD 
                  ? 'bg-indigo-600 text-white font-medium' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {translations.dashboard.ntd}
            </button>
            <button
              onClick={() => setShowAccountInUSD(true)}
              className={`px-3 py-1.5 text-sm rounded transition ${
                showAccountInUSD 
                  ? 'bg-indigo-600 text-white font-medium' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {translations.dashboard.usd}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-medium">
              <tr>
                <th className="px-6 py-3">{translations.dashboard.accountName}</th>
                <th className="px-6 py-3 text-right">{translations.dashboard.totalAssetsNT}</th>
                <th className="px-6 py-3 text-right">{translations.dashboard.marketValueNT}</th>
                <th className="px-6 py-3 text-right">{translations.dashboard.balanceNT}</th>
                <th className="px-6 py-3 text-right">{translations.dashboard.profitNT}</th>
                <th className="px-6 py-3 text-right">{translations.dashboard.annualizedROI}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accountPerformance.length > 0 ? (
                accountPerformance.map(acc => {
                  // 根據切換狀態決定顯示的幣種和數值
                  let displayCurrency: string;
                  let totalAssets: number;
                  let marketValue: number;
                  let cashBalance: number;
                  let profit: number;
                  
                  if (showAccountInUSD) {
                    // 切換到美金顯示
                    if (acc.currency === Currency.USD) {
                      // 美金帳戶：顯示原始美金值
                      displayCurrency = 'USD';
                      totalAssets = acc.totalAssetsNative || acc.totalAssetsTWD / summary.exchangeRateUsdToTwd;
                      marketValue = acc.marketValueNative || acc.marketValueTWD / summary.exchangeRateUsdToTwd;
                      cashBalance = acc.cashBalanceNative || acc.cashBalanceTWD / summary.exchangeRateUsdToTwd;
                      profit = acc.profitNative || acc.profitTWD / summary.exchangeRateUsdToTwd;
                    } else if (acc.currency === Currency.JPY) {
                      // 日幣帳戶：轉換為美金顯示
                      const jpyToUsdRate = summary.jpyExchangeRate && summary.exchangeRateUsdToTwd ? summary.jpyExchangeRate / summary.exchangeRateUsdToTwd : 0.0067; // 預設約 1 JPY = 0.0067 USD
                      displayCurrency = 'USD';
                      totalAssets = acc.totalAssetsTWD / summary.exchangeRateUsdToTwd;
                      marketValue = acc.marketValueTWD / summary.exchangeRateUsdToTwd;
                      cashBalance = acc.cashBalanceTWD / summary.exchangeRateUsdToTwd;
                      profit = acc.profitTWD / summary.exchangeRateUsdToTwd;
                    } else {
                      // 台幣帳戶：轉換為美金顯示
                      displayCurrency = 'USD';
                      totalAssets = acc.totalAssetsTWD / summary.exchangeRateUsdToTwd;
                      marketValue = acc.marketValueTWD / summary.exchangeRateUsdToTwd;
                      cashBalance = acc.cashBalanceTWD / summary.exchangeRateUsdToTwd;
                      profit = acc.profitTWD / summary.exchangeRateUsdToTwd;
                    }
                  } else {
                    // 切換到台幣顯示（預設）
                    displayCurrency = 'TWD';
                    totalAssets = acc.totalAssetsTWD;
                    marketValue = acc.marketValueTWD;
                    cashBalance = acc.cashBalanceTWD;
                    profit = acc.profitTWD;
                  }
                  
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-semibold text-slate-700">
                        {acc.name} 
                        <span className="text-xs font-normal text-slate-400 ml-1">({acc.currency})</span>
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-slate-700">
                        {formatCurrency(totalAssets, displayCurrency)}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        {formatCurrency(marketValue, displayCurrency)}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        {formatCurrency(cashBalance, displayCurrency)}
                      </td>
                      <td className={`px-6 py-3 text-right font-bold ${profit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(profit, displayCurrency)}
                      </td>
                      <td className={`px-6 py-3 text-right font-bold ${acc.roi >= 0 ? 'text-success' : 'text-danger'}`}>
                        {acc.roi.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">{translations.dashboard.noAccounts}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Holdings Table Integration in Dashboard */}
      <HoldingsTable 
        holdings={holdings}
        accounts={accounts}
        onUpdatePrice={onUpdatePrice}
        onAutoUpdate={onAutoUpdate}
        language={language}
      />

       {/* AI Advisor Section - Only shown if NOT guest */}
      {!isGuest && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 shadow-xl text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {translations.dashboard.aiAdvisor}
              </h3>
              <p className="text-slate-300 text-sm mt-1">{translations.dashboard.aiAdvisorDesc}</p>
            </div>
            <button 
              onClick={handleAskAi} 
              disabled={loadingAi}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold rounded-lg transition disabled:opacity-50 text-sm shadow-lg shadow-yellow-500/20"
            >
              {loadingAi ? translations.dashboard.analyzing : translations.dashboard.startAnalysis}
            </button>
          </div>

          {aiAnalysis && (
            <div className="bg-white/10 p-5 rounded-lg text-slate-100 text-sm leading-relaxed whitespace-pre-wrap border border-white/10 animate-fade-in">
              {aiAnalysis}
            </div>
          )}
        </div>
      )}

      {/* Cost Detail Modal */}
      {showCostDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
            <div className="bg-slate-900 p-4 flex justify-between items-center shrink-0">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <span>💰</span> {translations.dashboard.netInvestedBreakdown}
              </h2>
              <button onClick={() => setShowCostDetailModal(false)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
            </div>
            
            <div className="p-4 bg-blue-50 border-b border-blue-100 text-sm text-blue-800">
              <p>ℹ️ <strong>{language === 'zh-TW' ? '計算公式：' : 'Formula: '}</strong> {translations.dashboard.calculationFormula}</p>
              <p>⚠️ <strong>{translations.dashboard.attention}：</strong> {translations.dashboard.formulaNote}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-100 sticky top-0 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2">{translations.dashboard.date}</th>
                    <th className="px-4 py-2">{translations.dashboard.category}</th>
                    <th className="px-4 py-2">{translations.labels.account}</th>
                    <th className="px-4 py-2 text-right">{translations.dashboard.originalAmount}</th>
                    <th className="px-4 py-2 text-right">{translations.labels.exchangeRate}</th>
                    <th className="px-4 py-2 text-right">{translations.dashboard.twdCost}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {costDetails.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 whitespace-nowrap">{item.date}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.type === CashFlowType.DEPOSIT ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.type === CashFlowType.DEPOSIT ? translations.dashboard.deposit : translations.dashboard.withdraw}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {item.accountName} <span className="text-xs text-slate-400">({item.currency})</span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {item.currency === Currency.USD ? '$' : 'NT$'}{item.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex flex-col items-end">
                          <span>{item.rate.toFixed(2)}</span>
                          <span className="text-[10px] text-slate-400">{item.rateSource}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-2 text-right font-bold font-mono ${item.type === CashFlowType.DEPOSIT ? 'text-slate-800' : 'text-red-500'}`}>
                        {item.type === CashFlowType.WITHDRAW ? '-' : ''}{formatCurrency(item.amountTWD, 'TWD')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 sticky bottom-0 border-t-2 border-slate-300 font-bold text-slate-800">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right">{translations.dashboard.totalNetInvested}</td>
                    <td className="px-4 py-3 text-right text-lg">{formatCurrency(verifyTotal, 'TWD')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
              <button 
                onClick={() => setShowCostDetailModal(false)}
                className="px-6 py-2 bg-slate-900 text-white rounded hover:bg-slate-800"
              >
                {translations.common.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
