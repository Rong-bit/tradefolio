
import React, { useState, useMemo } from 'react';
import { Holding, Market } from '../types';
import { formatCurrency } from '../utils/calculations';

interface Props {
  holdings: Holding[];
  onUpdatePrice: (key: string, price: number) => void;
  onAutoUpdate: () => Promise<void>;
}

const HoldingsTable: React.FC<Props> = ({ holdings, onUpdatePrice, onAutoUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  // 合併相同標的 (Ticker + Market) 的持倉
  const mergedHoldings = useMemo(() => {
    const map = new Map<string, Holding>();

    holdings.forEach(h => {
      const key = `${h.market}-${h.ticker}`;
      if (!map.has(key)) {
        // Clone to avoid mutation
        map.set(key, { ...h, accountId: 'merged' });
      } else {
        const existing = map.get(key)!;
        
        const newQuantity = existing.quantity + h.quantity;
        const newTotalCost = existing.totalCost + h.totalCost;
        const newCurrentValue = existing.currentValue + h.currentValue;
        const newUnrealizedPL = existing.unrealizedPL + h.unrealizedPL;
        const newWeight = existing.weight + h.weight;
        
        // Recalculate derived fields
        const newAvgCost = newQuantity > 0 ? newTotalCost / newQuantity : 0;
        const newUnrealizedPLPercent = newTotalCost > 0 ? (newUnrealizedPL / newTotalCost) * 100 : 0;

        // Weighted Average for Annualized Return (by Cost, or Value?)
        // Standard practice for Portfolio level XIRR is complex. 
        // For simple display, weighted average of individual XIRRs by current value is a reasonable approximation for UI if not strictly calculating flow.
        let newAnnualizedReturn = existing.annualizedReturn;
        const combinedValue = existing.currentValue + h.currentValue;
        if (combinedValue > 0) {
            newAnnualizedReturn = (
                (existing.annualizedReturn * existing.currentValue) + 
                (h.annualizedReturn * h.currentValue)
            ) / combinedValue;
        }

        // Daily Change should be the same for same ticker. 
        // Take from existing (or new, they should match).
        
        map.set(key, {
          ...existing,
          quantity: newQuantity,
          totalCost: newTotalCost,
          currentValue: newCurrentValue,
          unrealizedPL: newUnrealizedPL,
          weight: newWeight,
          avgCost: newAvgCost,
          unrealizedPLPercent: newUnrealizedPLPercent,
          annualizedReturn: newAnnualizedReturn
        });
      }
    });

    // Sort by Weight Descending
    return Array.from(map.values()).sort((a, b) => b.weight - a.weight);
  }, [holdings]);

  const handleAutoUpdateClick = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onAutoUpdate();
      alert("股價與匯率更新完成！");
    } catch (error) {
      alert("更新失敗，請確認網路或 API Key。");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden border border-slate-100">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center flex-wrap gap-2 bg-slate-50">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          資產配置明細 (Portfolio Holdings)
        </h3>
        <button 
          onClick={handleAutoUpdateClick}
          disabled={isUpdating}
          className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition text-white shadow-sm
            ${isUpdating ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {isUpdating ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              AI 搜尋中...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              AI 聯網更新股價 & 匯率
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-white text-slate-500 text-xs uppercase font-bold tracking-wider border-b border-slate-100">
            <tr>
              <th className="px-4 py-3">市場</th>
              <th className="px-4 py-3">代號</th>
              <th className="px-4 py-3 text-right">數量</th>
              <th className="px-4 py-3 text-right">現價 (Updated)</th>
              <th className="px-4 py-3 w-32 text-left">比重 (Weight)</th>
              <th className="px-4 py-3 text-right">市值 (Val)</th>
              <th className="px-4 py-3 text-right">損益 (P/L)</th>
              <th className="px-4 py-3 text-right">年化 (ROI)</th>
              <th className="px-4 py-3 text-right">今日漲跌</th>
              <th className="px-4 py-3 text-right">均價 (Avg)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 bg-white">
            {mergedHoldings.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                  尚無持倉資料，請新增交易。
                </td>
              </tr>
            ) : (
              mergedHoldings.map((h) => {
                const isProfit = h.unrealizedPL >= 0;
                const currency = h.market === Market.TW ? 'TWD' : 'USD';
                const plColor = isProfit ? 'text-emerald-600' : 'text-rose-600';
                const roiColor = h.annualizedReturn >= 0 ? 'text-blue-600' : 'text-orange-600';
                const dailyChangeColor = (h.dailyChange || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600';
                const uniqueKey = `${h.market}-${h.ticker}`;
                
                return (
                  <tr key={uniqueKey} className="hover:bg-slate-50 transition-colors group">
                    {/* 1. Market */}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border ${h.market === Market.US ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                        {h.market}
                      </span>
                    </td>
                    
                    {/* 2. Ticker */}
                    <td className="px-4 py-3 font-bold text-slate-700">{h.ticker}</td>
                    
                    {/* 3. Quantity */}
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      {h.quantity.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
                    </td>
                    
                    {/* 4. Current Price */}
                    <td className="px-4 py-3 text-right">
                       <div className="flex items-center justify-end gap-1 group-hover:bg-white bg-slate-50/50 rounded px-1 transition-colors">
                         <span className="text-slate-400 text-xs">$</span>
                         <input 
                          type="number"
                          className="w-20 text-right bg-transparent border-none focus:ring-0 p-0 font-medium text-slate-700"
                          value={h.currentPrice}
                          onChange={(e) => onUpdatePrice(`${h.market}-${h.ticker}`, parseFloat(e.target.value) || 0)}
                          step="0.01"
                         />
                       </div>
                    </td>

                    {/* 5. Weight */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600 text-right">{h.weight.toFixed(1)}%</span>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${h.market === Market.US ? 'bg-blue-400' : 'bg-green-400'}`} 
                            style={{ width: `${Math.min(h.weight, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* 6. Market Value */}
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatCurrency(h.currentValue, currency)}
                    </td>

                    {/* 7. P/L */}
                    <td className={`px-4 py-3 text-right font-bold ${plColor}`}>
                      <div className="flex flex-col items-end leading-tight">
                        <span>{formatCurrency(h.unrealizedPL, currency)}</span>
                        <span className="text-[10px] opacity-80">{isProfit ? '+' : ''}{h.unrealizedPLPercent.toFixed(2)}%</span>
                      </div>
                    </td>

                    {/* 8. Annualized Return */}
                    <td className={`px-4 py-3 text-right font-bold ${roiColor}`}>
                      {h.annualizedReturn && h.annualizedReturn !== 0 ? `${h.annualizedReturn.toFixed(1)}%` : '-'}
                    </td>

                    {/* 9. Daily Change */}
                    <td className={`px-4 py-3 text-right text-xs font-bold ${dailyChangeColor}`}>
                      {h.dailyChange !== undefined && h.dailyChange !== 0 ? (
                         <div className="flex flex-col items-end">
                           <span>{h.dailyChange > 0 ? '+' : ''}{h.dailyChange.toFixed(2)}</span>
                           <span className="opacity-75">{h.dailyChangePercent ? `(${h.dailyChangePercent > 0 ? '+' : ''}${h.dailyChangePercent.toFixed(2)}%)` : ''}</span>
                         </div>
                      ) : '-'}
                    </td>

                    {/* 10. Avg Cost */}
                    <td className="px-4 py-3 text-right text-slate-500 text-xs">
                       {formatCurrency(h.avgCost, currency)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HoldingsTable;

