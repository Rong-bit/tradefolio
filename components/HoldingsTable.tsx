
import React, { useState, useMemo } from 'react';
import { Holding, Market, Account, Currency } from '../types';
import { formatCurrency } from '../utils/calculations';
import { Language, t } from '../utils/i18n';

interface Props {
  holdings: Holding[];
  accounts: Account[];
  onUpdatePrice: (key: string, price: number) => void;
  onAutoUpdate: () => Promise<void>;
  language: Language;
}

type DisplayMode = 'merged' | 'detailed';

const HoldingsTable: React.FC<Props> = ({ holdings, accounts, onUpdatePrice, onAutoUpdate, language }) => {
  const translations = t(language);
  const [isUpdating, setIsUpdating] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('merged');

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

  // 明細顯示：依帳戶分組
  const groupedByAccount = useMemo(() => {
    const accountMap = new Map<string, { account: Account; holdings: Holding[] }>();
    
    // 建立帳戶映射
    accounts.forEach(acc => {
      accountMap.set(acc.id, { account: acc, holdings: [] });
    });
    
    // 將持倉分配到對應帳戶
    holdings.forEach(h => {
      const group = accountMap.get(h.accountId);
      if (group) {
        group.holdings.push(h);
      } else {
        // 如果找不到帳戶，建立一個臨時群組
        accountMap.set(h.accountId, {
          account: { id: h.accountId, name: h.accountId, currency: Currency.TWD, isSubBrokerage: false, balance: 0 },
          holdings: [h]
        });
      }
    });
    
    // 過濾掉沒有持倉的帳戶，並按帳戶名稱排序
    return Array.from(accountMap.values())
      .filter(group => group.holdings.length > 0)
      .sort((a, b) => a.account.name.localeCompare(b.account.name))
      .map(group => ({
        ...group,
        holdings: group.holdings.sort((a, b) => b.weight - a.weight)
      }));
  }, [holdings, accounts]);

  const handleAutoUpdateClick = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
      try {
      await onAutoUpdate();
      alert(language === 'zh-TW' ? "股價與匯率更新完成！" : "Prices and exchange rates updated successfully!");
    } catch (error) {
      alert(language === 'zh-TW' ? "更新失敗，請確認網路或 API Key。" : "Update failed. Please check your network or API Key.");
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
          {translations.holdings.portfolioHoldings}
        </h3>
        <div className="flex items-center gap-2">
          {/* 切換顯示模式按鈕 */}
          <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1">
            <button
              onClick={() => setDisplayMode('merged')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                displayMode === 'merged'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {translations.holdings.mergedDisplay}
            </button>
            <button
              onClick={() => setDisplayMode('detailed')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                displayMode === 'detailed'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {translations.holdings.detailedDisplay}
            </button>
          </div>
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
                {translations.holdings.aiSearching}
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {translations.holdings.aiUpdatePrices}
              </>
            )}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-white text-slate-500 text-xs uppercase font-bold tracking-wider border-b border-slate-100">
            <tr>
              <th className="px-4 py-3">{translations.holdings.market}</th>
              <th className="px-4 py-3">{translations.holdings.ticker}</th>
              <th className="px-4 py-3 text-right">{translations.holdings.quantity}</th>
              <th className="px-4 py-3 text-right">{translations.holdings.currentPrice} {language === 'zh-TW' ? '(Updated)' : ''}</th>
              <th className="px-4 py-3 w-32 text-left">{translations.holdings.weight} {language === 'zh-TW' ? '(Weight)' : ''}</th>
              <th className="px-4 py-3 text-right">{translations.holdings.cost} {language === 'zh-TW' ? '(Cost)' : ''}</th>
              <th className="px-4 py-3 text-right">{translations.holdings.marketValue} {language === 'zh-TW' ? '(Val)' : ''}</th>
              <th className="px-4 py-3 text-right">{translations.holdings.profitLoss} {language === 'zh-TW' ? '(P/L)' : ''}</th>
              <th className="px-4 py-3 text-right">{translations.holdings.annualizedROI} {language === 'zh-TW' ? '(ROI)' : ''}</th>
              <th className="px-4 py-3 text-right">{translations.holdings.dailyChange}</th>
              <th className="px-4 py-3 text-right">{translations.holdings.avgPrice} {language === 'zh-TW' ? '(Avg)' : ''}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 bg-white">
            {displayMode === 'merged' ? (
              // 合併顯示模式
              mergedHoldings.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-slate-400">
                    {translations.holdings.noHoldings}
                  </td>
                </tr>
              ) : (
                mergedHoldings.map((h) => {
                  return renderHoldingRow(h);
                })
              )
            ) : (
              // 明細顯示模式（依帳戶分組）
              groupedByAccount.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-slate-400">
                    {translations.holdings.noHoldings}
                  </td>
                </tr>
              ) : (
                groupedByAccount.map((group) => {
                  const account = group.account;
                  const accountHoldings = group.holdings;
                  
                  // 計算帳戶小計
                  const accountTotalCost = accountHoldings.reduce((sum, h) => sum + h.totalCost, 0);
                  const accountTotalValue = accountHoldings.reduce((sum, h) => sum + h.currentValue, 0);
                  const accountTotalPL = accountHoldings.reduce((sum, h) => sum + h.unrealizedPL, 0);
                  const accountTotalWeight = accountHoldings.reduce((sum, h) => sum + h.weight, 0);
                  const currency = account.currency === Currency.USD ? 'USD' : 'TWD';
                  
                  return (
                    <React.Fragment key={account.id}>
                      {/* 帳戶標題列 */}
                      <tr className="bg-slate-700 text-white font-bold">
                        <td colSpan={2} className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            {account.name}
                            <span className="text-xs font-normal opacity-75">({account.currency})</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">-</td>
                        <td className="px-4 py-3 text-right">-</td>
                        <td className="px-4 py-3 text-right">{accountTotalWeight.toFixed(1)}%</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(accountTotalCost, currency)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(accountTotalValue, currency)}</td>
                        <td className={`px-4 py-3 text-right ${accountTotalPL >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {formatCurrency(accountTotalPL, currency)}
                        </td>
                        <td className="px-4 py-3 text-right">-</td>
                        <td className="px-4 py-3 text-right">-</td>
                        <td className="px-4 py-3 text-right">-</td>
                      </tr>
                      {/* 該帳戶的持倉明細 */}
                      {accountHoldings.map((h) => renderHoldingRow(h, true))}
                    </React.Fragment>
                  );
                })
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // 渲染持倉行的輔助函數
  function renderHoldingRow(h: Holding, isDetailedMode: boolean = false) {
    const isProfit = h.unrealizedPL >= 0;
    // UK 市場也用 USD（因為是用美金買的）
    const currency = h.market === Market.TW ? 'TWD' : 'USD';
    const plColor = isProfit ? 'text-emerald-600' : 'text-rose-600';
    const roiColor = h.annualizedReturn >= 0 ? 'text-blue-600' : 'text-orange-600';
    // 只有當 dailyChange 不是 undefined/null 時才根據正負值決定顏色，否則保持預設顏色
    const dailyChangeColor = h.dailyChange !== undefined && h.dailyChange !== null 
      ? (h.dailyChange >= 0 ? 'text-emerald-600' : 'text-rose-600')
      : 'text-slate-500';
    const uniqueKey = `${h.accountId}-${h.market}-${h.ticker}`;
    
    return (
      <tr key={uniqueKey} className={`hover:bg-slate-50 transition-colors group ${isDetailedMode ? 'bg-slate-50/30' : ''}`}>
        {/* 1. Market */}
        <td className="px-4 py-3">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border ${
            h.market === Market.US ? 'bg-blue-50 text-blue-600 border-blue-100' : 
            h.market === Market.UK ? 'bg-purple-50 text-purple-600 border-purple-100' : 
            'bg-green-50 text-green-600 border-green-100'
          }`}>
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
                className={`h-full rounded-full ${
                  h.market === Market.US ? 'bg-blue-400' : 
                  h.market === Market.UK ? 'bg-purple-400' : 
                  'bg-green-400'
                }`} 
                style={{ width: `${Math.min(h.weight, 100)}%` }}
              ></div>
            </div>
          </div>
        </td>

        {/* 6. Total Cost (New) */}
        <td className="px-4 py-3 text-right font-medium text-slate-500">
          {formatCurrency(h.totalCost, currency)}
        </td>

        {/* 7. Market Value */}
        <td className="px-4 py-3 text-right font-medium text-slate-800">
          {formatCurrency(h.currentValue, currency)}
        </td>

        {/* 8. P/L */}
        <td className={`px-4 py-3 text-right font-bold ${plColor}`}>
          <div className="flex flex-col items-end leading-tight">
            <span>{formatCurrency(h.unrealizedPL, currency)}</span>
            <span className="text-[10px] opacity-80">{isProfit ? '+' : ''}{h.unrealizedPLPercent.toFixed(2)}%</span>
          </div>
        </td>

        {/* 9. Annualized Return */}
        <td className={`px-4 py-3 text-right font-bold ${roiColor}`}>
          {h.annualizedReturn && h.annualizedReturn !== 0 ? `${h.annualizedReturn.toFixed(1)}%` : '-'}
        </td>

        {/* 10. Daily Change */}
        <td className={`px-4 py-3 text-right text-xs font-bold ${dailyChangeColor}`}>
          {h.dailyChange !== undefined && h.dailyChange !== null ? (
             <div className="flex flex-col items-end">
               <span>{h.dailyChange > 0 ? '+' : ''}{h.dailyChange.toFixed(2)}</span>
               {h.dailyChangePercent !== undefined && h.dailyChangePercent !== null && (
                 <span className="opacity-75">({h.dailyChangePercent > 0 ? '+' : ''}{h.dailyChangePercent.toFixed(2)}%)</span>
               )}
             </div>
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </td>

        {/* 11. Avg Cost */}
        <td className="px-4 py-3 text-right text-slate-500 text-xs">
           {new Intl.NumberFormat('zh-TW', { 
              style: 'currency', 
              currency: currency, 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
           }).format(h.avgCost)}
        </td>
      </tr>
    );
  }
};

export default HoldingsTable;

