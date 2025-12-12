
import React, { useState, useEffect, useMemo } from 'react';
import { ChartDataPoint, PortfolioSummary, Holding, AssetAllocationItem, AnnualPerformanceItem, AccountPerformance, CashFlow, Account, CashFlowType, Currency } from '../types';
import { formatCurrency } from '../utils/calculations';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { analyzePortfolio } from '../services/geminiService';
import HoldingsTable from './HoldingsTable';

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
  onAutoUpdate
}) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showCostDetailModal, setShowCostDetailModal] = useState(false);

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
          let rateSource = '台幣';
          let amountTWD = 0;

          // Priority 1: Explicit TWD amount (includes fees/adjustments)
          if (cf.amountTWD && cf.amountTWD > 0) {
             amountTWD = cf.amountTWD;
             rate = cf.amount > 0 ? amountTWD / cf.amount : 0; // Derived effective rate
             rateSource = '指定台幣金額 (Fixed TWD)';
          } 
          // Priority 2: Standard calculation
          else {
             if (isUSD) {
               if (cf.exchangeRate && cf.exchangeRate > 0) {
                   rate = cf.exchangeRate;
                   rateSource = `歷史匯率 (${cf.exchangeRate})`;
               } else {
                   rate = summary.exchangeRateUsdToTwd;
                   rateSource = `目前匯率 (${rate})`;
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-purple-500 relative">
          <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider flex justify-between items-center">
            淨投入成本 (Net Cost)
            <button 
              onClick={() => setShowCostDetailModal(true)}
              className="text-indigo-600 hover:text-indigo-800 text-xs bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100"
              title="查看計算明細"
            >
              🔍 明細
            </button>
          </h4>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {formatCurrency(summary.netInvestedTWD, 'TWD')}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
          <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider">目前總資產 (Assets)</h4>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {formatCurrency(summary.totalValueTWD + summary.cashBalanceTWD, 'TWD')}
          </p>
          <p className="text-xs text-slate-400 mt-1">含現金: {formatCurrency(summary.cashBalanceTWD, 'TWD')}</p>
        </div>
        <div className={`bg-white p-6 rounded-xl shadow border-l-4 ${summary.totalPLTWD >= 0 ? 'border-success' : 'border-danger'}`}>
          <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider">總損益 (Total P/L)</h4>
          <div className="flex items-baseline gap-2 mt-2">
            <p className={`text-2xl font-bold ${summary.totalPLTWD >= 0 ? 'text-success' : 'text-danger'}`}>
               {summary.totalPLTWD >= 0 ? '+' : ''}{formatCurrency(summary.totalPLTWD, 'TWD')}
            </p>
          </div>
          <p className={`text-xs font-bold mt-1 ${summary.totalPLTWD >= 0 ? 'text-success' : 'text-danger'}`}>
             {summary.totalPLPercent.toFixed(2)}%
          </p>
        </div>
         <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
          <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider">真實年化 (CAGR)</h4>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {summary.annualizedReturn.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-400 mt-1">預估 8% 成長: {formatCurrency(summary.netInvestedTWD * 1.08, 'TWD')}</p>
        </div>
      </div>

      {/* Detailed Statistics Toggle */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 transition text-slate-700 font-medium text-sm"
        >
          <span>詳細統計數據 (Detailed Statistics)</span>
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
              <p className="text-xs text-slate-500 mb-1">總投資成本 (Total Cost)</p>
              <p className="text-lg font-bold text-slate-800">{formatCurrency(summary.netInvestedTWD, 'TWD')}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">總損益金額</p>
              <p className={`text-lg font-bold ${summary.totalPLTWD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.totalPLTWD, 'TWD')}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">累積配息現金 (Cash Div)</p>
              <p className="text-lg font-bold text-yellow-600">{formatCurrency(summary.accumulatedCashDividendsTWD, 'TWD')}</p>
            </div>
             <div>
              <p className="text-xs text-slate-500 mb-1">累積股息再投入 (Stock Div)</p>
              <p className="text-lg font-bold text-yellow-600">{formatCurrency(summary.accumulatedStockDividendsTWD, 'TWD')}</p>
            </div>
             <div>
              <p className="text-xs text-slate-500 mb-1">總市值年化報酬率</p>
              <p className={`text-lg font-bold ${summary.annualizedReturn >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {summary.annualizedReturn.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">平均換匯成本 (TWD/USD)</p>
              <p className="text-lg font-bold text-slate-700">{summary.avgExchangeRate > 0 ? summary.avgExchangeRate.toFixed(2) : '-'}</p>
            </div>
             <div>
              <p className="text-xs text-slate-500 mb-1">目前匯率</p>
              <p className="text-lg font-bold text-slate-700">{summary.exchangeRateUsdToTwd.toFixed(2)}</p>
            </div>
             <div>
              <p className="text-xs text-slate-500 mb-1">累積總報酬率 (Total Return)</p>
              <p className={`text-lg font-bold ${summary.totalPLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.totalPLPercent.toFixed(2)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-xl shadow overflow-hidden">
        <h3 className="font-bold text-slate-800 text-lg mb-4">資產與成本趨勢 (Asset vs Cost)</h3>
        {/* 使用 overflow-x-auto 確保小螢幕可捲動，但大螢幕自動適應寬度不超出容器 */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-[800px] h-[450px]">
            {isMounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="year" 
                    stroke="#64748b" 
                    fontSize={12} 
                    padding={{ left: 20, right: 20 }}
                  />
                  {/* Left Axis: Currency */}
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickFormatter={(val) => `${val / 1000}k`} />
                  {/* Right Axis: Percentage */}
                  <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={12} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    formatter={(value: number, name: string) => [
                      name === '資產/成本比' ? `${(value * 100).toFixed(1)}%` : formatCurrency(value, 'TWD'),
                      name
                    ]}
                  />
                  <Legend />
                  {/* Invested Cost: Purple Bar */}
                  <Bar yAxisId="left" dataKey="cost" name="投資成本" fill="#8b5cf6" barSize={20} radius={[4, 4, 0, 0]} />
                  
                  {/* Estimated Assets: Bright Blue Dashed Line */}
                  <Line yAxisId="left" type="monotone" dataKey="estTotalAssets" name="預估總資產 (8%)" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  
                  {/* Total Assets: Cyan Solid Line */}
                  <Line yAxisId="left" type="monotone" dataKey="totalAssets" name="總資產" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4, fill: '#06b6d4', strokeWidth: 0 }} />
                  
                  {/* Ratio: Red Line (Percentage) */}
                  <Line yAxisId="right" type="monotone" dataKey="assetCostRatio" name="資產/成本比" stroke="#ef4444" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-slate-400">
                  {!isMounted ? '圖表載入中...' : chartData.length === 0 ? '請先新增資金匯入與交易紀錄' : '載入圖表...'}
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Allocation Pie Chart */}
      <div className="bg-white p-6 rounded-xl shadow overflow-hidden">
        <h3 className="font-bold text-slate-800 text-lg mb-4">資產配置 (Allocation)</h3>
        <div 
          className="w-full flex justify-center overflow-x-auto" 
        >
          <div style={{ 
            width: '500px', 
            height: '500px', 
            minWidth: '500px',
            minHeight: '500px'
          }}>
            {isMounted && assetAllocation.length > 0 ? (
               <ResponsiveContainer 
                 width={500} 
                 height={500} 
                 minWidth={500} 
                 minHeight={500}
                 aspect={undefined}
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
                       formatter={(value, entry: any) => {
                         const item = assetAllocation.find(a => a.name === value);
                         return <span className="text-xs text-slate-600 ml-1">{value} ({item?.ratio.toFixed(1)}%)</span>;
                       }}
                    />
                 </PieChart>
               </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                {!isMounted ? '圖表載入中...' : '無持倉'}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Annual Performance Table (Below Charts) */}
      {annualPerformance.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
             <h3 className="font-bold text-slate-800 text-lg">年度績效表 (Annual Performance)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-medium">
                <tr>
                  <th className="px-6 py-3">年份</th>
                  <th className="px-6 py-3 text-right">期初資產</th>
                  <th className="px-6 py-3 text-right">年度淨投入</th>
                  <th className="px-6 py-3 text-right">期末資產</th>
                  <th className="px-6 py-3 text-right">年度損益</th>
                  <th className="px-6 py-3 text-right">年度報酬率 (ROI)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {annualPerformance.map(item => (
                  <tr key={item.year} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-bold text-slate-700">{item.year}</td>
                    <td className="px-6 py-3 text-right text-slate-500">{formatCurrency(item.startAssets, 'TWD')}</td>
                    <td className="px-6 py-3 text-right text-slate-500">{formatCurrency(item.netInflow, 'TWD')}</td>
                    <td className="px-6 py-3 text-right font-medium">{formatCurrency(item.endAssets, 'TWD')}</td>
                    <td className={`px-6 py-3 text-right font-bold ${item.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatCurrency(item.profit, 'TWD')}
                    </td>
                    <td className={`px-6 py-3 text-right font-bold ${item.roi >= 0 ? 'text-success' : 'text-danger'}`}>
                      {item.roi.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Account List Card */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">證券戶列表 (Brokerage Accounts)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-medium">
              <tr>
                <th className="px-6 py-3">證券名稱</th>
                <th className="px-6 py-3 text-right">總資產 (NT$)</th>
                <th className="px-6 py-3 text-right">市值 (NT$)</th>
                <th className="px-6 py-3 text-right">餘額 (NT$)</th>
                <th className="px-6 py-3 text-right">損益 (NT$)</th>
                <th className="px-6 py-3 text-right">年化報酬率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accountPerformance.length > 0 ? (
                accountPerformance.map(acc => (
                  <tr key={acc.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-semibold text-slate-700">
                      {acc.name} 
                      <span className="text-xs font-normal text-slate-400 ml-1">({acc.currency})</span>
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-slate-700">
                      {formatCurrency(acc.totalAssetsTWD, 'TWD')}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-600">
                      {formatCurrency(acc.marketValueTWD, 'TWD')}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-600">
                      {formatCurrency(acc.cashBalanceTWD, 'TWD')}
                    </td>
                    <td className={`px-6 py-3 text-right font-bold ${acc.profitTWD >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatCurrency(acc.profitTWD, 'TWD')}
                    </td>
                    <td className={`px-6 py-3 text-right font-bold ${acc.roi >= 0 ? 'text-success' : 'text-danger'}`}>
                      {acc.roi.toFixed(2)}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">尚無證券戶，請至「證券戶管理」新增。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Holdings Table Integration in Dashboard */}
      <HoldingsTable 
        holdings={holdings}
        onUpdatePrice={onUpdatePrice}
        onAutoUpdate={onAutoUpdate}
      />

       {/* AI Advisor Section */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 shadow-xl text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Gemini AI 投資顧問
            </h3>
            <p className="text-slate-300 text-sm mt-1">分析您的投資組合配置、風險與潛在機會。</p>
          </div>
          <button 
            onClick={handleAskAi} 
            disabled={loadingAi}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold rounded-lg transition disabled:opacity-50 text-sm shadow-lg shadow-yellow-500/20"
          >
            {loadingAi ? '分析中...' : '開始分析'}
          </button>
        </div>

        {aiAnalysis && (
          <div className="bg-white/10 p-5 rounded-lg text-slate-100 text-sm leading-relaxed whitespace-pre-wrap border border-white/10 animate-fade-in">
            {aiAnalysis}
          </div>
        )}
      </div>

      {/* Cost Detail Modal */}
      {showCostDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
            <div className="bg-slate-900 p-4 flex justify-between items-center shrink-0">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <span>💰</span> 淨投入成本計算明細 (Net Invested Breakdown)
              </h2>
              <button onClick={() => setShowCostDetailModal(false)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
            </div>
            
            <div className="p-4 bg-blue-50 border-b border-blue-100 text-sm text-blue-800">
              <p>ℹ️ <strong>計算公式：</strong> 淨投入 = 匯入資金 (Deposit) - 匯出資金 (Withdraw)</p>
              <p>⚠️ <strong>注意：</strong> 美金帳戶若有「歷史匯率」則優先使用，否則使用「目前右上角設定匯率」。轉帳 (Transfer) 與利息 (Interest) 不計入成本。</p>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-100 sticky top-0 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2">日期</th>
                    <th className="px-4 py-2">類別</th>
                    <th className="px-4 py-2">帳戶</th>
                    <th className="px-4 py-2 text-right">原始金額</th>
                    <th className="px-4 py-2 text-right">匯率</th>
                    <th className="px-4 py-2 text-right">台幣成本 (TWD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {costDetails.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 whitespace-nowrap">{item.date}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.type === CashFlowType.DEPOSIT ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.type === CashFlowType.DEPOSIT ? '匯入 (+)' : '匯出 (-)'}
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
                    <td colSpan={5} className="px-4 py-3 text-right">總計 (Total Net Invested)</td>
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
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
