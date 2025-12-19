
import React, { useEffect, useMemo, useState } from 'react';
import { PortfolioSummary, Holding, Market } from '../types';
import { formatCurrency } from '../utils/calculations';

interface Props {
  summary: PortfolioSummary;
  holdings: Holding[];
  exchangeRate: number;
  targets: Record<string, number>;
  onUpdateTargets: (targets: Record<string, number>) => void;
}

const RebalanceView: React.FC<Props> = ({ summary, holdings, exchangeRate, targets, onUpdateTargets }) => {
  const totalPortfolioValue = summary.totalValueTWD + summary.cashBalanceTWD;
  
  // 追蹤哪些項目需要再平衡（包括現金）
  const [enabledItems, setEnabledItems] = useState<Set<string>>(new Set());
  
  const handleTargetChange = (mergedKey: string, val: string, accountIds: string[], ticker: string) => {
    const num = parseFloat(val);
    const newTargets = { ...targets };
    
    if (isNaN(num) || num === 0) {
      // 清除所有相關帳戶的目標
      accountIds.forEach(accountId => {
        const oldKey = `${accountId}-${ticker}`;
        delete newTargets[oldKey];
      });
      delete newTargets[mergedKey];
    } else {
      // 將目標佔比按現值比例分配給各個帳戶
      const mergedHolding = holdings.filter(h => 
        accountIds.includes(h.accountId) && h.ticker === ticker
      );
      const totalValTwd = mergedHolding.reduce((sum, h) => {
        const valTwd = h.market === Market.US ? h.currentValue * exchangeRate : h.currentValue;
        return sum + valTwd;
      }, 0);
      
      if (totalValTwd > 0) {
        mergedHolding.forEach(h => {
          const valTwd = h.market === Market.US ? h.currentValue * exchangeRate : h.currentValue;
          const ratio = valTwd / totalValTwd;
          const oldKey = `${h.accountId}-${h.ticker}`;
          newTargets[oldKey] = parseFloat((num * ratio).toFixed(1));
        });
      }
      // 同時保存合併後的 key 用於顯示
      newTargets[mergedKey] = num;
    }
    
    onUpdateTargets(newTargets);
  };

  const handleResetToCurrent = () => {
    const newTargets: Record<string, number> = {};
    // 先合併 holdings
    const mergedMap = new Map<string, { holdings: Holding[], totalValTwd: number }>();
    holdings.forEach(h => {
      const mergedKey = `${h.market}-${h.ticker}`;
      const valTwd = h.market === Market.US ? h.currentValue * exchangeRate : h.currentValue;
      if (!mergedMap.has(mergedKey)) {
        mergedMap.set(mergedKey, { holdings: [], totalValTwd: 0 });
      }
      const merged = mergedMap.get(mergedKey)!;
      merged.holdings.push(h);
      merged.totalValTwd += valTwd;
    });
    
    // 設置目標佔比
    mergedMap.forEach((merged, mergedKey) => {
      const pct = totalPortfolioValue > 0 ? (merged.totalValTwd / totalPortfolioValue) * 100 : 0;
      newTargets[mergedKey] = parseFloat(pct.toFixed(1));
      
      // 按現值比例分配給各個帳戶
      merged.holdings.forEach(h => {
        const valTwd = h.market === Market.US ? h.currentValue * exchangeRate : h.currentValue;
        const ratio = merged.totalValTwd > 0 ? valTwd / merged.totalValTwd : 0;
        const oldKey = `${h.accountId}-${h.ticker}`;
        newTargets[oldKey] = parseFloat((pct * ratio).toFixed(1));
      });
    });
    
    onUpdateTargets(newTargets);
  };
  
  // 初始化：預設所有項目都啟用（使用合併後的 key）
  useEffect(() => {
    if (enabledItems.size === 0 && holdings.length > 0) {
      const initialEnabled = new Set<string>();
      const mergedKeys = new Set<string>();
      holdings.forEach(h => {
        const mergedKey = `${h.market}-${h.ticker}`;
        if (!mergedKeys.has(mergedKey)) {
          initialEnabled.add(mergedKey);
          mergedKeys.add(mergedKey);
        }
      });
      initialEnabled.add('cash'); // 預設現金也啟用
      setEnabledItems(initialEnabled);
    }
  }, [holdings.length, enabledItems.size]);

  // If targets are completely empty, auto-populate with current weights once
  useEffect(() => {
    if (Object.keys(targets).length === 0 && holdings.length > 0) {
      handleResetToCurrent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings.length]); // Only check when holdings loaded/changed length, avoid loop

  const handleToggleItem = (key: string) => {
    setEnabledItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const rebalanceRows = useMemo(() => {
    // 先合併相同 ticker 和 market 的 holdings
    const mergedMap = new Map<string, {
      holdings: Holding[];
      totalValTwd: number;
      totalQuantity: number;
      accountIds: string[];
      market: Market;
      ticker: string;
      currentPrice: number;
      totalCurrentValue: number;
    }>();
    
    holdings.forEach(h => {
      const mergedKey = `${h.market}-${h.ticker}`;
      const valTwd = h.market === Market.US ? h.currentValue * exchangeRate : h.currentValue;
      
      if (!mergedMap.has(mergedKey)) {
        mergedMap.set(mergedKey, {
          holdings: [],
          totalValTwd: 0,
          totalQuantity: 0,
          accountIds: [],
          market: h.market,
          ticker: h.ticker,
          currentPrice: h.currentPrice,
          totalCurrentValue: 0 // 用於計算加權平均價格
        });
      }
      
      const merged = mergedMap.get(mergedKey)!;
      merged.holdings.push(h);
      merged.totalValTwd += valTwd;
      merged.totalQuantity += h.quantity;
      merged.totalCurrentValue += h.currentValue;
      if (!merged.accountIds.includes(h.accountId)) {
        merged.accountIds.push(h.accountId);
      }
    });
    
    // 轉換為行數據
    return Array.from(mergedMap.entries()).map(([mergedKey, merged]) => {
      const currentPct = totalPortfolioValue > 0 ? (merged.totalValTwd / totalPortfolioValue) * 100 : 0;
      const isEnabled = enabledItems.has(mergedKey);
      
      // 計算加權平均價格（按現值加權，因為不同帳戶可能有不同價格）
      let avgPrice = merged.currentPrice;
      if (merged.holdings.length > 1) {
        const totalValue = merged.holdings.reduce((sum, h) => sum + h.currentValue, 0);
        if (totalValue > 0) {
          avgPrice = merged.holdings.reduce((sum, h) => {
            const weight = h.currentValue / totalValue;
            return sum + (h.currentPrice * weight);
          }, 0);
        }
      }
      
      // 優先使用合併後的 key，如果沒有則從各個帳戶的目標加總
      let targetPct = isEnabled ? (targets[mergedKey] || 0) : 0;
      if (targetPct === 0 && isEnabled) {
        // 如果合併後的 key 沒有值，則從各個帳戶的目標加總
        targetPct = merged.holdings.reduce((sum, h) => {
          const oldKey = `${h.accountId}-${h.ticker}`;
          return sum + (targets[oldKey] || 0);
        }, 0);
      }
      
      const targetValTwd = totalPortfolioValue * (targetPct / 100);
      const diffValTwd = targetValTwd - merged.totalValTwd;
      
      let diffShares = 0;
      if (avgPrice > 0 && isEnabled) {
        if (merged.market === Market.US) {
           diffShares = diffValTwd / exchangeRate / avgPrice;
        } else {
           diffShares = diffValTwd / avgPrice;
        }
      }

      return {
        mergedKey,
        accountIds: merged.accountIds,
        ticker: merged.ticker,
        market: merged.market,
        currentPrice: avgPrice,
        valTwd: merged.totalValTwd,
        quantity: merged.totalQuantity,
        currentPct,
        targetPct,
        targetValTwd,
        diffValTwd,
        diffShares,
        isEnabled,
        holdings: merged.holdings // 保留原始 holdings 用於顯示帳戶資訊
      };
    });
  }, [holdings, targets, totalPortfolioValue, exchangeRate, enabledItems]);

  // Calculate totals - 只計算啟用的項目
  const enabledRows = rebalanceRows.filter(row => row.isEnabled);
  const totalTargetPct = enabledRows.reduce((acc, row) => acc + row.targetPct, 0);
  const isCashEnabled = enabledItems.has('cash');
  const cashTargetPct = isCashEnabled ? (100 - totalTargetPct) : 0;
  const targetCashTwd = isCashEnabled ? (totalPortfolioValue * (cashTargetPct / 100)) : summary.cashBalanceTWD;
  const diffCashTwd = isCashEnabled ? (targetCashTwd - summary.cashBalanceTWD) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-slate-800">個股再平衡 (Stock Rebalancing)</h3>
          <div className="flex flex-col items-end">
             <div className="flex items-center gap-4">
               <button 
                  onClick={handleResetToCurrent}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded border border-slate-300 transition"
               >
                 ↺ 帶入目前比重
               </button>
               <div>
                 <p className="text-xs text-slate-500 text-right">總資產 (含現金)</p>
                 <p className="text-xl font-bold font-mono text-slate-800">
                   {formatCurrency(totalPortfolioValue, 'TWD')}
                 </p>
               </div>
             </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-medium">
              <tr>
                <th className="px-4 py-3 w-12">平衡</th>
                <th className="px-4 py-3">標的 (帳戶)</th>
                <th className="px-4 py-3 text-right">現價</th>
                <th className="px-4 py-3 text-right">現值 (TWD)</th>
                <th className="px-4 py-3 text-right">目前佔比</th>
                <th className="px-4 py-3 text-right w-36">目標佔比 %</th>
                <th className="px-4 py-3 text-right">目標價值</th>
                <th className="px-4 py-3 text-right">調整金額</th>
                <th className="px-4 py-3 text-right">建議操作 (股)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rebalanceRows.map(row => {
                const isBuy = row.diffValTwd > 0;
                const isEnabled = row.isEnabled;
                const accountInfo = row.accountIds.length > 1 
                  ? ` (${row.accountIds.length}個帳戶)` 
                  : '';
                return (
                  <tr key={row.mergedKey} className={`hover:bg-slate-50 ${!isEnabled ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => handleToggleItem(row.mergedKey)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      <div className="flex items-center">
                        <span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${row.market === Market.US ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                          {row.market}
                        </span>
                        <span>{row.ticker}</span>
                        {accountInfo && (
                          <span className="ml-2 text-xs text-slate-500">{accountInfo}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {row.currentPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatCurrency(row.valTwd, 'TWD')}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {row.currentPct.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end items-center">
                        <input 
                          type="number" 
                          className={`w-24 text-right border-2 rounded px-2 py-1 focus:ring-2 focus:ring-accent focus:border-accent font-bold ${
                            isEnabled 
                              ? 'border-indigo-100 text-slate-700 bg-white' 
                              : 'border-slate-200 text-slate-400 bg-slate-50'
                          }`}
                          value={row.targetPct}
                          onChange={(e) => handleTargetChange(row.mergedKey, e.target.value, row.accountIds, row.ticker)}
                          step="0.1"
                          min="0"
                          max="100"
                          disabled={!isEnabled}
                        />
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right ${isEnabled ? 'text-slate-500' : 'text-slate-300'}`}>
                       {formatCurrency(row.targetValTwd, 'TWD')}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${isEnabled ? (isBuy ? 'text-red-600' : 'text-green-600') : 'text-slate-300'}`}>
                      {formatCurrency(row.diffValTwd, 'TWD')}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${isEnabled ? (isBuy ? 'text-red-600' : 'text-green-600') : 'text-slate-300'}`}>
                      {isEnabled ? (
                        <span>
                          {isBuy ? '買' : '賣'} {Math.abs(row.diffShares).toFixed(row.market === Market.US ? 2 : 0)}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              
              {/* Cash Row */}
              <tr className={`bg-slate-50 font-medium border-t-2 border-slate-200 ${!isCashEnabled ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={isCashEnabled}
                    onChange={() => handleToggleItem('cash')}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                </td>
                <td className="px-4 py-3 text-slate-700">現金 (Cash)</td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(summary.cashBalanceTWD, 'TWD')}</td>
                <td className="px-4 py-3 text-right">{((summary.cashBalanceTWD / totalPortfolioValue) * 100).toFixed(1)}%</td>
                <td className={`px-4 py-3 text-right font-bold ${isCashEnabled ? (cashTargetPct < 0 ? 'text-red-500' : 'text-slate-700') : 'text-slate-300'}`}>
                  {isCashEnabled ? cashTargetPct.toFixed(1) : '0.0'}%
                </td>
                <td className={`px-4 py-3 text-right ${isCashEnabled ? '' : 'text-slate-300'}`}>
                  {formatCurrency(targetCashTwd, 'TWD')}
                </td>
                <td className={`px-4 py-3 text-right ${isCashEnabled ? (diffCashTwd > 0 ? 'text-blue-600' : 'text-slate-500') : 'text-slate-300'}`}>
                  {formatCurrency(diffCashTwd, 'TWD')}
                </td>
                <td className="px-4 py-3 text-right text-xs text-slate-400">
                  {isCashEnabled ? '(剩餘資金)' : '(不參與平衡)'}
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
               <tr>
                 <td colSpan={5} className="px-4 py-3 text-right">Total (已啟用項目)</td>
                 <td className={`px-4 py-3 text-right ${Math.abs(totalTargetPct + cashTargetPct - 100) > 0.1 ? 'text-red-600' : 'text-slate-800'}`}>
                   {(totalTargetPct + cashTargetPct).toFixed(0)}%
                 </td>
                 <td colSpan={3}></td>
               </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
           <p className="font-bold mb-1">💡 說明：</p>
           <ul className="list-disc pl-5 space-y-1">
             <li>相同名稱的個股會自動合併顯示，目標佔比會按現值比例分配給各個帳戶。</li>
             <li>勾選「平衡」欄位來選擇哪些股債需要再平衡，未勾選的項目將不參與再平衡計算。</li>
             <li>現金部分也可以勾選，若勾選現金，剩餘比例將自動分配給現金；若不勾選，現金將維持現狀。</li>
             <li>目標佔比會自動儲存。若總和不為 100%，剩餘比例將自動分配給已勾選的現金。</li>
             <li>若「現金」目標比例為負值，代表您的股票目標配置超過 100%，請調降部分持股目標。</li>
             <li>點擊「帶入目前比重」可快速重置所有目標值為當前現況。</li>
           </ul>
        </div>
      </div>
    </div>
  );
};

export default RebalanceView;
