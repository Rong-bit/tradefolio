
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, CashFlow, Account, HistoricalData, Market } from '../types';
import { getPortfolioStateAtDate } from '../utils/calculations';
import { fetchHistoricalYearEndData } from '../services/yahooFinanceService';

interface Props {
  transactions: Transaction[];
  cashFlows: CashFlow[];
  accounts: Account[];
  historicalData: HistoricalData;
  onSave: (data: HistoricalData) => void;
  onClose: () => void;
}

const HistoricalDataModal: React.FC<Props> = ({ 
  transactions, 
  cashFlows, 
  accounts, 
  historicalData, 
  onSave, 
  onClose 
}) => {
  // Identify available years from data
  const years = useMemo(() => {
    const allYears = new Set([
        ...transactions.map(t => new Date(t.date).getFullYear()),
        ...cashFlows.map(c => new Date(c.date).getFullYear())
    ]);
    const currentYear = new Date().getFullYear();
    // Filter out current year and future years
    return Array.from(allYears).filter(y => y < currentYear).sort((a, b) => b - a);
  }, [transactions, cashFlows]);

  const [selectedYear, setSelectedYear] = useState<number>(years[0] || new Date().getFullYear() - 1);
  const [localData, setLocalData] = useState<HistoricalData>(historicalData);
  const [loading, setLoading] = useState(false);

  // Determine tickers for selected year
  const activeTickers = useMemo(() => {
      const yearEndDate = new Date(`${selectedYear}-12-31`);
      const { holdings } = getPortfolioStateAtDate(yearEndDate, transactions, cashFlows, accounts);
      return Object.keys(holdings).filter(k => holdings[k] > 0.000001).map(k => {
          const [market, ticker] = k.split('-');
          return { market, ticker };
      });
  }, [selectedYear, transactions, cashFlows, accounts]);

  // Handle data updates
  const handlePriceChange = (ticker: string, value: string) => {
      const num = parseFloat(value);
      setLocalData(prev => ({
          ...prev,
          [selectedYear]: {
              ...prev[selectedYear],
              prices: {
                  ...prev[selectedYear]?.prices,
                  [ticker]: isNaN(num) ? 0 : num
              },
              exchangeRate: prev[selectedYear]?.exchangeRate || 30
          }
      }));
  };

  const handleRateChange = (value: string) => {
      const num = parseFloat(value);
      setLocalData(prev => ({
          ...prev,
          [selectedYear]: {
              ...prev[selectedYear],
              prices: prev[selectedYear]?.prices || {},
              exchangeRate: isNaN(num) ? 30 : num
          }
      }));
  };

  const handleAiFetch = async () => {
      // 1. Get current data for selected year
      const currentYearData = localData[selectedYear] || { prices: {}, exchangeRate: 0 };

      // 2. Filter out tickers that already have non-zero data
      const missingTickers = activeTickers.filter(t => {
          // 移除 (BAK) 後綴以進行比對
          const cleanTicker = t.ticker.replace(/\(BAK\)/gi, '');
          const displayTicker = t.market === Market.TW && !cleanTicker.includes('TPE:') ? `TPE:${cleanTicker}` : cleanTicker;
          
          // Check if price exists and is non-zero (檢查多種可能的 key 格式)
          // 注意：需要明確檢查 undefined，因為 0 也是有效值（表示需要更新）
          const val1 = currentYearData.prices[displayTicker];
          const val2 = currentYearData.prices[cleanTicker];
          const val3 = currentYearData.prices[t.ticker];
          const val = val1 !== undefined ? val1 : (val2 !== undefined ? val2 : val3);
          
          // 如果值為 undefined、null 或 0，則需要更新
          const needsUpdate = val === undefined || val === null || val === 0;
          
          if (!needsUpdate) {
              console.log(`已找到 ${t.ticker} 的價格: ${val} (key: ${displayTicker})`);
          } else {
              console.log(`需要更新 ${t.ticker}，當前值: ${val} (檢查的 keys: ${displayTicker}, ${cleanTicker}, ${t.ticker})`);
          }
          
          return needsUpdate;
      });

      // 3. Check if exchange rate needs update
      // Rule: Allow update if it's missing (0/undefined) OR it is exactly 30 (default).
      // If it is any other number (e.g. 32.5), assume user set it and do not overwrite.
      const rateNeedsUpdate = !currentYearData.exchangeRate || currentYearData.exchangeRate === 0 || currentYearData.exchangeRate === 30;

      if (missingTickers.length === 0 && !rateNeedsUpdate) {
          alert('所有持股與匯率皆已有數據，無須 AI 更新。\n若需重新抓取，請先將數值歸零或設為 30。');
          return;
      }

      setLoading(true);
      try {
          // If no tickers are missing but rate needs update, we still need to call API.
          // We'll query one ticker to trigger the prompt logic if list is empty.
          let queryTickers: string[] = [];
          let queryMarkets: ('US' | 'TW' | 'UK' | 'JP')[] = [];
          if (missingTickers.length > 0) {
              queryTickers = missingTickers.map(t => {
                  // 移除 (BAK) 後綴
                  const cleanTicker = t.ticker.replace(/\(BAK\)/gi, '');
                  return t.market === Market.TW && !cleanTicker.includes('TPE:') ? `TPE:${cleanTicker}` : cleanTicker;
              });
              queryMarkets = missingTickers.map(t => {
                if (t.market === Market.TW) return 'TW' as const;
                if (t.market === Market.UK) return 'UK' as const;
                if (t.market === Market.JP) return 'JP' as const;
                return 'US' as const;
              });
          } else if (activeTickers.length > 0) {
              // Fetch rate only case: query first ticker
              const t = activeTickers[0];
              const cleanTicker = t.ticker.replace(/\(BAK\)/gi, '');
              queryTickers = [t.market === Market.TW && !cleanTicker.includes('TPE:') ? `TPE:${cleanTicker}` : cleanTicker];
              queryMarkets = [
                t.market === Market.TW ? 'TW' as const : 
                t.market === Market.UK ? 'UK' as const : 
                t.market === Market.JP ? 'JP' as const : 
                'US' as const
              ];
          }
          
          const result = await fetchHistoricalYearEndData(selectedYear, queryTickers, queryMarkets);
          
          // 檢查是否有成功取得數據
          const successCount = Object.keys(result.prices).length;
          if (successCount === 0 && missingTickers.length > 0) {
              alert(`無法取得 ${missingTickers.length} 筆股票的歷史股價，請檢查網路連線或稍後再試。\n\n查詢的代號：${queryTickers.join(', ')}`);
          } else if (successCount < missingTickers.length) {
              const failedTickers = missingTickers.filter(t => {
                  const displayTicker = t.market === Market.TW && !t.ticker.includes('TPE:') ? `TPE:${t.ticker}` : t.ticker;
                  return !result.prices[displayTicker] && !result.prices[t.ticker];
              });
              console.warn('部分股票無法取得歷史股價：', failedTickers.map(t => t.ticker));
          }
          
          setLocalData(prev => {
              const prevData = prev[selectedYear] || { prices: {}, exchangeRate: 0 };
              
              // Only update exchange rate if it was missing (0) or default (30)
              const currentRate = prevData.exchangeRate;
              const shouldUpdateRate = !currentRate || currentRate === 0 || currentRate === 30;
              
              const newRate = shouldUpdateRate 
                  ? (result.exchangeRate || 30) 
                  : currentRate;

              // 合併價格數據，確保兩種格式的 key 都能正確對應
              const mergedPrices = { ...prevData.prices };
              console.log(`合併前的價格數據:`, prevData.prices);
              console.log(`API 返回的價格數據:`, result.prices);
              
              Object.entries(result.prices).forEach(([key, price]) => {
                  mergedPrices[key] = price;
                  console.log(`儲存價格: ${key} = ${price}`);
                  // 如果是 TPE: 格式，也同時儲存不帶前綴的版本
                  if (key.startsWith('TPE:')) {
                      const cleanKey = key.replace(/^TPE:/i, '');
                      mergedPrices[cleanKey] = price;
                      console.log(`同時儲存: ${cleanKey} = ${price}`);
                  } else if (key.match(/^\d{4}$/)) {
                      // 如果是純數字，也同時儲存 TPE: 前綴版本
                      mergedPrices[`TPE:${key}`] = price;
                      console.log(`同時儲存: TPE:${key} = ${price}`);
                  }
              });
              
              console.log(`合併後的價格數據:`, mergedPrices);

              return {
                  ...prev,
                  [selectedYear]: {
                      ...prevData,
                      prices: mergedPrices,
                      exchangeRate: newRate
                  }
              };
          });
      } catch (e) {
          alert('AI 更新失敗，請稍後再試');
      } finally {
          setLoading(false);
      }
  };

  const handleSave = () => {
      onSave(localData);
      onClose();
  };

  const currentYearData = localData[selectedYear] || { prices: {}, exchangeRate: 30 };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden">
        <div className="bg-slate-900 p-4 flex justify-between items-center shrink-0">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <span>🕰️</span> 歷史股價校正 (Time Machine)
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
           <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
               <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">選擇年份</label>
                   <select 
                     value={selectedYear} 
                     onChange={(e) => setSelectedYear(Number(e.target.value))}
                     className="border border-slate-300 rounded p-2 text-sm font-bold min-w-[100px]"
                   >
                       {years.map(y => <option key={y} value={y}>{y} 年</option>)}
                       {years.length === 0 && <option disabled>無歷史資料</option>}
                   </select>
               </div>
               
               <div className="flex-1 text-right">
                   <button 
                     onClick={handleAiFetch}
                     disabled={loading || years.length === 0}
                     className={`px-4 py-2 rounded shadow text-sm font-bold text-white transition flex items-center gap-2 ml-auto
                       ${loading ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                   >
                       {loading ? 'AI 搜尋中...' : '🤖 AI 自動補齊缺漏數據'}
                   </button>
               </div>
           </div>

           <div className="bg-white border rounded-lg overflow-hidden">
               <div className="p-4 bg-slate-100 border-b flex justify-between items-center">
                   <h3 className="font-bold text-slate-700">{selectedYear} 年底數據</h3>
                   <div className="flex items-center gap-2">
                       <label className="text-sm text-slate-600">匯率 (USD/TWD):</label>
                       <input 
                         type="number" 
                         step="0.1"
                         value={currentYearData.exchangeRate}
                         onChange={(e) => handleRateChange(e.target.value)}
                         className="w-20 border rounded p-1 text-right font-mono"
                       />
                   </div>
               </div>
               
               <table className="min-w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-500">
                       <tr>
                           <th className="px-4 py-2">市場</th>
                           <th className="px-4 py-2">代號</th>
                           <th className="px-4 py-2 text-right">收盤價 ({selectedYear}/12/31)</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                       {activeTickers.length === 0 ? (
                           <tr><td colSpan={3} className="p-8 text-center text-slate-400">該年份無持股</td></tr>
                       ) : (
                           activeTickers.map(t => {
                               // 移除 (BAK) 後綴以進行比對（與過濾邏輯保持一致）
                               const cleanTicker = t.ticker.replace(/\(BAK\)/gi, '');
                               const displayTicker = t.market === Market.TW && !cleanTicker.includes('TPE:') ? `TPE:${cleanTicker}` : cleanTicker;
                               const priceKey = t.market === Market.TW ? displayTicker : cleanTicker;
                               
                               // 檢查多種可能的 key 格式
                               const val1 = currentYearData.prices[priceKey];
                               const val2 = currentYearData.prices[displayTicker];
                               const val3 = currentYearData.prices[cleanTicker];
                               const val4 = currentYearData.prices[t.ticker];
                               const val = val1 !== undefined ? val1 : (val2 !== undefined ? val2 : (val3 !== undefined ? val3 : val4)) || 0;
                               const hasData = val > 0;
                               
                               return (
                                   <tr key={t.ticker} className="hover:bg-slate-50">
                                       <td className="px-4 py-2">
                                           <span className={`px-2 py-0.5 rounded text-xs ${
                                             t.market === Market.US ? 'bg-blue-100 text-blue-700' : 
                                             t.market === Market.UK ? 'bg-purple-100 text-purple-700' : 
                                             t.market === Market.JP ? 'bg-red-100 text-red-700' : 
                                             'bg-green-100 text-green-700'
                                           }`}>
                                               {t.market}
                                           </span>
                                       </td>
                                       <td className="px-4 py-2 font-bold text-slate-700">
                                           {t.ticker.replace(/\(BAK\)/gi, '')}
                                           {hasData && <span className="text-green-500 ml-1 text-xs">✓</span>}
                                       </td>
                                       <td className="px-4 py-2 text-right">
                                           <input 
                                             type="number" 
                                             step="0.01"
                                             value={val}
                                             onChange={(e) => handlePriceChange(priceKey, e.target.value)}
                                             className={`w-32 border rounded p-1 text-right focus:ring-2 focus:ring-accent ${hasData ? 'border-green-200 bg-green-50' : 'border-slate-300'}`}
                                             placeholder="輸入股價"
                                           />
                                       </td>
                                   </tr>
                               );
                           })
                       )}
                   </tbody>
               </table>
           </div>
           
           <div className="text-xs text-slate-500 bg-yellow-50 p-3 rounded border border-yellow-100">
               💡 說明：
               <ul className="list-disc pl-5 mt-1 space-y-1">
                   <li>AI 僅會自動補齊<strong className="text-slate-800">數值為 0</strong> 的缺漏資料，已存在的數據不會被覆蓋。</li>
                   <li>若匯率為預設值 (30)，AI 會嘗試更新；若您已手動設定其他匯率，則不會被覆蓋。</li>
               </ul>
           </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition">取消</button>
          <button onClick={handleSave} className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition shadow-lg">儲存並更新圖表</button>
        </div>
      </div>
    </div>
  );
};

export default HistoricalDataModal;


