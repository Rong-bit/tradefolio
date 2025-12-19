import React, { useState, useMemo } from 'react';
import { AssetSimulationItem, SimulationResult, Market, YearlyProjection } from '../types';
import { formatCurrency } from '../utils/calculations';
import { v4 as uuidv4 } from 'uuid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { fetchAnnualizedReturn } from '../services/yahooFinanceService';

interface Props {
  holdings?: Array<{ ticker: string; market: Market; annualizedReturn: number }>; // 可選：從現有持倉導入
}

const AssetAllocationSimulator: React.FC<Props> = ({ holdings = [] }) => {
  const [assets, setAssets] = useState<AssetSimulationItem[]>([]);
  const [initialAmount, setInitialAmount] = useState<number>(1000000); // 預設 100 萬
  const [years, setYears] = useState<number>(10); // 預設 10 年
  const [regularInvestment, setRegularInvestment] = useState<number>(0); // 定期定額金額
  const [regularFrequency, setRegularFrequency] = useState<'monthly' | 'yearly'>('monthly'); // 定期定額頻率
  const [newTicker, setNewTicker] = useState<string>('');
  const [newMarket, setNewMarket] = useState<Market>(Market.TW);
  const [newAnnualReturn, setNewAnnualReturn] = useState<number>(8);
  const [newAllocation, setNewAllocation] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [loadingReturn, setLoadingReturn] = useState<boolean>(false);
  const [loadingTicker, setLoadingTicker] = useState<string>(''); // 正在查詢的股票代號

  // 預設的常見資產選項（可擴展）
  const defaultAssets: Array<{ ticker: string; market: Market; name: string; defaultReturn: number }> = [
    { ticker: '0050', market: Market.TW, name: '元大台灣50', defaultReturn: 8.5 },
    { ticker: '0056', market: Market.TW, name: '元大高股息', defaultReturn: 6.5 },
    { ticker: '2330', market: Market.TW, name: '台積電', defaultReturn: 15.0 },
    { ticker: 'SPY', market: Market.US, name: 'S&P 500 ETF', defaultReturn: 10.0 },
    { ticker: 'QQQ', market: Market.US, name: 'NASDAQ 100 ETF', defaultReturn: 12.0 },
    { ticker: 'VTI', market: Market.US, name: 'Vanguard Total Stock Market', defaultReturn: 9.5 },
    { ticker: 'VT', market: Market.US, name: 'Vanguard Total World Stock', defaultReturn: 8.5 },
    { ticker: 'BND', market: Market.US, name: 'Vanguard Total Bond Market', defaultReturn: 4.0 },
  ];

  // 計算模擬結果
  const simulationResult = useMemo<SimulationResult | null>(() => {
    if (assets.length === 0) return null;

    // 檢查配置比例總和
    const totalAllocation = assets.reduce((sum, a) => sum + a.allocation, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) return null; // 配置比例必須等於 100%

    // 計算加權平均年化報酬率
    const weightedReturn = assets.reduce((sum, a) => {
      return sum + (a.annualizedReturn * a.allocation / 100);
    }, 0);

    // 計算年度預測（包含定期定額）
    const yearlyProjections: YearlyProjection[] = [];
    let currentValue = initialAmount;
    let cumulativeInvestment = initialAmount; // 累積總投入
    const monthlyReturn = Math.pow(1 + weightedReturn / 100, 1 / 12) - 1; // 月化報酬率

    // 計算年度定期定額投入
    const annualRegularInvestment = regularFrequency === 'monthly' 
      ? regularInvestment * 12 
      : regularInvestment;

    for (let year = 1; year <= years; year++) {
      const yearStartValue = currentValue;
      let yearRegularInvestment = 0;

      if (regularInvestment > 0) {
        if (regularFrequency === 'monthly') {
          // 每月投入，計算複利效果
          for (let month = 1; month <= 12; month++) {
            // 先投入定期定額
            currentValue += regularInvestment;
            cumulativeInvestment += regularInvestment;
            yearRegularInvestment += regularInvestment;
            
            // 然後計算該月的報酬
            currentValue = currentValue * (1 + monthlyReturn);
          }
        } else {
          // 每年投入一次（在年初投入）
          currentValue += annualRegularInvestment;
          cumulativeInvestment += annualRegularInvestment;
          yearRegularInvestment = annualRegularInvestment;
          
          // 計算整年的報酬
          currentValue = currentValue * (1 + weightedReturn / 100);
        }
      } else {
        // 沒有定期定額，只計算報酬
        currentValue = currentValue * (1 + weightedReturn / 100);
      }

      const yearReturn = currentValue - yearStartValue - yearRegularInvestment;
      const yearReturnPercent = yearStartValue > 0 
        ? (yearReturn / (yearStartValue + yearRegularInvestment)) * 100 
        : 0;

      yearlyProjections.push({
        year,
        value: currentValue,
        return: yearReturn,
        returnPercent: yearReturnPercent,
        regularInvestment: yearRegularInvestment,
        cumulativeInvestment
      });
    }

    const finalValue = currentValue;
    const totalInvested = cumulativeInvestment;
    const totalReturn = finalValue - totalInvested;
    const totalReturnPercent = totalInvested > 0 
      ? (totalReturn / totalInvested) * 100 
      : 0;

    return {
      initialAmount,
      years,
      finalValue,
      totalReturn,
      totalReturnPercent,
      annualizedReturn: weightedReturn,
      yearlyProjections,
      regularInvestment: regularInvestment > 0 ? {
        amount: regularInvestment,
        frequency: regularFrequency,
        totalInvested: totalInvested
      } : undefined
    };
  }, [assets, initialAmount, years, regularInvestment, regularFrequency]);

  // 添加資產
  const addAsset = () => {
    setErrorMessage('');
    if (!newTicker.trim()) {
      setErrorMessage('請輸入股票代號');
      return;
    }
    if (newAllocation <= 0 || newAllocation > 100) {
      setErrorMessage('配置比例必須在 0% 到 100% 之間');
      return;
    }

    const currentTotal = assets.reduce((sum, a) => sum + a.allocation, 0);
    if (currentTotal + newAllocation > 100) {
      setErrorMessage(`配置比例總和不能超過 100%，目前為 ${currentTotal.toFixed(1)}%`);
      return;
    }

    const newAsset: AssetSimulationItem = {
      id: uuidv4(),
      ticker: newTicker.trim().toUpperCase(),
      market: newMarket,
      annualizedReturn: newAnnualReturn,
      allocation: newAllocation
    };

    setAssets([...assets, newAsset]);
    setNewTicker('');
    setNewAllocation(0);
  };

  // 從預設選項快速添加
  const addDefaultAsset = (asset: typeof defaultAssets[0]) => {
    setErrorMessage('');
    const currentTotal = assets.reduce((sum, a) => sum + a.allocation, 0);
    const remaining = 100 - currentTotal;
    if (remaining <= 0) {
      setErrorMessage('配置比例已達 100%');
      return;
    }

    const suggestedAllocation = Math.min(remaining, 20); // 建議配置 20%，但不超過剩餘比例

    const newAsset: AssetSimulationItem = {
      id: uuidv4(),
      ticker: asset.ticker,
      market: asset.market,
      name: asset.name,
      annualizedReturn: asset.defaultReturn,
      allocation: suggestedAllocation
    };

    setAssets([...assets, newAsset]);
  };

  // 從現有持倉導入
  const importFromHoldings = () => {
    setErrorMessage('');
    if (holdings.length === 0) {
      setErrorMessage('目前沒有持倉資料可導入');
      return;
    }

    const newAssets: AssetSimulationItem[] = holdings.map(h => ({
      id: uuidv4(),
      ticker: h.ticker,
      market: h.market,
      annualizedReturn: h.annualizedReturn || 8, // 如果沒有年化報酬，預設 8%
      allocation: 0 // 需要手動設定配置比例
    }));

    setAssets([...assets, ...newAssets]);
  };

  // 自動查詢年化報酬率
  // 
  // 年化報酬率計算說明：
  // 系統會查詢股票上市以來的歷史數據，使用 CAGR (Compound Annual Growth Rate) 公式計算：
  // CAGR = ((當前價格 / 初始價格) ^ (1 / 年數)) - 1
  // 
  // 這表示如果從上市時買入並持有至今，每年的平均複合報酬率。
  // 例如：股票從 100 元漲到 200 元，經過 5 年，年化報酬率約為 14.87%
  //
  const fetchReturnForTicker = async () => {
    if (!newTicker.trim()) {
      setErrorMessage('請先輸入股票代號');
      return;
    }

    setErrorMessage('');
    setLoadingReturn(true);
    setLoadingTicker(newTicker.trim().toUpperCase());

    try {
      // 查詢股票上市以來的年化報酬率（CAGR）
      const annualReturn = await fetchAnnualizedReturn(newTicker.trim().toUpperCase(), newMarket);
      
      if (annualReturn !== null) {
        setNewAnnualReturn(annualReturn);
        setErrorMessage(''); // 清除錯誤訊息
      } else {
        setErrorMessage(`無法取得 ${newTicker.trim().toUpperCase()} 的年化報酬率，請手動輸入`);
      }
    } catch (error) {
      console.error('查詢年化報酬率時發生錯誤:', error);
      setErrorMessage(`查詢年化報酬率失敗，請手動輸入`);
    } finally {
      setLoadingReturn(false);
      setLoadingTicker('');
    }
  };

  // 更新資產
  const updateAsset = (id: string, field: keyof AssetSimulationItem, value: any) => {
    setErrorMessage('');
    setAssets(assets.map(a => {
      if (a.id === id) {
        // 如果更新配置比例，檢查總和
        if (field === 'allocation') {
          const currentTotal = assets.reduce((sum, item) => {
            if (item.id === id) return sum;
            return sum + item.allocation;
          }, 0);
          if (currentTotal + value > 100) {
            setErrorMessage('配置比例總和不能超過 100%');
            return a;
          }
        }
        return { ...a, [field]: value };
      }
      return a;
    }));
  };

  // 刪除資產
  const removeAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  // 自動平衡配置（平均分配）
  const autoBalance = () => {
    if (assets.length === 0) return;
    const equalAllocation = 100 / assets.length;
    setAssets(assets.map(a => ({ ...a, allocation: equalAllocation })));
  };

  // 清空所有資產
  const clearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = () => {
    setAssets([]);
    setShowClearConfirm(false);
    setErrorMessage('');
  };

  // 準備圖表數據
  const chartData = simulationResult?.yearlyProjections.map(yp => ({
    年份: yp.year,
    資產價值: Math.round(yp.value),
    年度報酬: Math.round(yp.return),
    累積投入: yp.cumulativeInvestment ? Math.round(yp.cumulativeInvestment) : initialAmount,
    初始金額: initialAmount
  })) || [];

  return (
    <div className="space-y-6">
      {/* 說明區塊 */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
        <h3 className="font-bold text-blue-900 mb-2">📊 資產配置模擬說明</h3>
        <p className="text-sm text-blue-800 mb-2">
          此工具可讓您比較不同資產配置的預期獲利。請輸入各種股票或 ETF 的成立以來年化報酬率作為假設值，
          系統會根據您的配置比例計算組合的預期表現。
        </p>
        <p className="text-xs text-blue-700 mt-2">
          ⚠️ 注意：過往績效不代表未來表現，此模擬僅供參考。
        </p>
      </div>

      {/* 基本設定 */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="font-bold text-slate-800 text-lg mb-4">基本設定</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              初始投資金額 (TWD)
            </label>
            <input
              type="number"
              value={initialAmount}
              onChange={(e) => setInitialAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="0"
              step="1000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              投資年數
            </label>
            <input
              type="number"
              value={years}
              onChange={(e) => setYears(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
              max="50"
            />
          </div>
        </div>
        
        {/* 定期定額設定 */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h4 className="text-sm font-semibold text-slate-700 mb-4">定期定額投資（選填）</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                定期定額金額 (TWD)
              </label>
              <input
                type="number"
                value={regularInvestment}
                onChange={(e) => setRegularInvestment(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                step="1000"
                placeholder="0"
              />
              <p className="text-xs text-slate-500 mt-1">設定為 0 則不使用定期定額</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                投入頻率
              </label>
              <select
                value={regularFrequency}
                onChange={(e) => setRegularFrequency(e.target.value as 'monthly' | 'yearly')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={regularInvestment === 0}
              >
                <option value="monthly">每月投入</option>
                <option value="yearly">每年投入</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="w-full p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">年度總投入</p>
                <p className="text-lg font-bold text-slate-800">
                  {regularInvestment > 0 
                    ? formatCurrency(
                        regularFrequency === 'monthly' ? regularInvestment * 12 : regularInvestment,
                        'TWD'
                      )
                    : formatCurrency(0, 'TWD')
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 快速添加預設資產 */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="font-bold text-slate-800 text-lg mb-4">快速添加常見資產</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {defaultAssets.map(asset => (
            <button
              key={`${asset.market}-${asset.ticker}`}
              onClick={() => addDefaultAsset(asset)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 active:bg-slate-100 active:scale-95 active:shadow-inner transition-all duration-150 text-left"
            >
              <div className="font-semibold text-slate-800">{asset.ticker}</div>
              <div className="text-xs text-slate-500">{asset.name}</div>
              <div className="text-xs text-blue-600 mt-1">預設報酬: {asset.defaultReturn}%</div>
            </button>
          ))}
        </div>
        {holdings.length > 0 && (
          <button
            onClick={importFromHoldings}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 active:scale-95 active:shadow-inner transition-all duration-150 text-sm font-medium shadow-md hover:shadow-lg"
          >
            從現有持倉導入
          </button>
        )}
      </div>

      {/* 錯誤訊息顯示 */}
      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-red-800 font-medium">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage('')}
            className="mt-2 text-sm text-red-600 hover:text-red-800 active:text-red-900 active:scale-95 transition-all duration-150 underline"
          >
            關閉
          </button>
        </div>
      )}

      {/* 手動添加資產 */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="font-bold text-slate-800 text-lg mb-4">手動添加資產</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">股票代號</label>
            <input
              type="text"
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value)}
              placeholder="例如: 0050"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">市場</label>
            <select
              value={newMarket}
              onChange={(e) => setNewMarket(e.target.value as Market)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={Market.TW}>台股 (TW)</option>
              <option value={Market.US}>美股 (US)</option>
              <option value={Market.UK}>英股 (UK)</option>
              <option value={Market.JP}>日股 (JP)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              年化報酬率 (%)
              {newTicker.trim() && (
                <button
                  onClick={fetchReturnForTicker}
                  disabled={loadingReturn}
                  className="ml-2 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 active:bg-blue-200 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="自動查詢上市以來的年化報酬率"
                >
                  {loadingReturn && loadingTicker === newTicker.trim().toUpperCase() ? (
                    <span className="flex items-center gap-1">
                      <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      查詢中
                    </span>
                  ) : (
                    '🔍 自動查詢'
                  )}
                </button>
              )}
            </label>
            <input
              type="number"
              value={newAnnualReturn}
              onChange={(e) => setNewAnnualReturn(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="0.1"
              min="0"
              max="100"
            />
            {loadingReturn && loadingTicker === newTicker.trim().toUpperCase() && (
              <p className="text-xs text-blue-600 mt-1">正在查詢 {newTicker.trim().toUpperCase()} 的年化報酬率...</p>
            )}
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
              <p className="font-semibold mb-1">📊 年化報酬率計算說明：</p>
              <p className="mb-1">
                系統使用 <strong>CAGR (複合年成長率)</strong> 公式計算：
              </p>
              <p className="font-mono bg-white px-2 py-1 rounded mb-1 text-blue-900">
                CAGR = ((當前價格 / 初始價格) ^ (1 / 年數)) - 1
              </p>
              <p className="mb-1">
                這表示如果從<strong>上市時買入並持有至今</strong>，每年的平均複合報酬率。
              </p>
              <p className="text-blue-700">
                <strong>範例：</strong>股票從 100 元漲到 200 元，經過 5 年，年化報酬率約為 <strong>14.87%</strong>
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">配置比例 (%)</label>
            <input
              type="number"
              value={newAllocation}
              onChange={(e) => setNewAllocation(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="0.1"
              min="0"
              max="100"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={addAsset}
              className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 active:bg-slate-950 active:scale-95 active:shadow-inner transition-all duration-150 font-medium shadow-md hover:shadow-lg"
            >
              添加
            </button>
          </div>
        </div>
      </div>

      {/* 資產配置列表 */}
      {assets.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-lg">資產配置列表</h3>
            <div className="flex gap-2">
              <button
                onClick={autoBalance}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 active:bg-blue-200 active:scale-95 active:shadow-inner transition-all duration-150 text-sm font-medium border border-blue-200 hover:border-blue-300"
              >
                自動平衡
              </button>
              <button
                onClick={clearAll}
                className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 active:bg-red-200 active:scale-95 active:shadow-inner transition-all duration-150 text-sm font-medium border border-red-200 hover:border-red-300"
              >
                清空全部
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase font-medium">
                <tr>
                  <th className="px-4 py-3 text-left">股票代號</th>
                  <th className="px-4 py-3 text-left">市場</th>
                  <th className="px-4 py-3 text-right">年化報酬率 (%)</th>
                  <th className="px-4 py-3 text-right">配置比例 (%)</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.map(asset => {
                  const currentTotal = assets.reduce((sum, a) => sum + a.allocation, 0);
                  return (
                    <tr key={asset.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {asset.ticker}
                        {asset.name && <span className="text-xs text-slate-500 ml-2">({asset.name})</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{asset.market}</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          value={asset.annualizedReturn}
                          onChange={(e) => updateAsset(asset.id, 'annualizedReturn', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-slate-300 rounded text-right focus:ring-2 focus:ring-blue-500"
                          step="0.1"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          value={asset.allocation}
                          onChange={(e) => updateAsset(asset.id, 'allocation', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-slate-300 rounded text-right focus:ring-2 focus:ring-blue-500"
                          step="0.1"
                          min="0"
                          max="100"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => removeAsset(asset.id)}
                          className="text-red-500 hover:text-red-700 active:text-red-900 active:scale-95 transition-all duration-150 text-sm px-2 py-1 rounded hover:bg-red-50 active:bg-red-100"
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-bold">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right">配置比例總和:</td>
                  <td className="px-4 py-3 text-right">
                    <span className={Math.abs(assets.reduce((sum, a) => sum + a.allocation, 0) - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}>
                      {assets.reduce((sum, a) => sum + a.allocation, 0).toFixed(1)}%
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 模擬結果 */}
      {simulationResult && (
        <>
          {/* 結果摘要卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow border-l-4 border-purple-500">
              <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                {simulationResult.regularInvestment ? '總投入金額' : '初始投資'}
              </h4>
              <p className="text-2xl font-bold text-slate-800 mt-2">
                {formatCurrency(
                  simulationResult.regularInvestment 
                    ? simulationResult.regularInvestment.totalInvested 
                    : simulationResult.initialAmount,
                  'TWD'
                )}
              </p>
              {simulationResult.regularInvestment && (
                <p className="text-xs text-slate-500 mt-1">
                  初始: {formatCurrency(simulationResult.initialAmount, 'TWD')}
                </p>
              )}
            </div>
            <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
              <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider">最終價值</h4>
              <p className="text-2xl font-bold text-slate-800 mt-2">
                {formatCurrency(simulationResult.finalValue, 'TWD')}
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
              <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider">總報酬</h4>
              <p className="text-2xl font-bold text-slate-800 mt-2">
                {formatCurrency(simulationResult.totalReturn, 'TWD')}
              </p>
              <p className="text-sm font-bold text-blue-600 mt-1">
                {simulationResult.totalReturnPercent.toFixed(2)}%
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow border-l-4 border-indigo-500">
              <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider">組合年化報酬</h4>
              <p className="text-2xl font-bold text-slate-800 mt-2">
                {simulationResult.annualizedReturn.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* 年度預測圖表 */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="font-bold text-slate-800 text-lg mb-4">年度預測趨勢圖</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="年份" stroke="#64748b" fontSize={12} />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    formatter={(value: number) => formatCurrency(value, 'TWD')}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="資產價值" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={{ r: 4 }} 
                    name="資產價值"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="累積投入" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    strokeDasharray="3 3" 
                    dot={false}
                    name="累積投入"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="初始金額" 
                    stroke="#8b5cf6" 
                    strokeWidth={2} 
                    strokeDasharray="5 5" 
                    dot={false}
                    name="初始投資"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 年度報酬圖表 */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="font-bold text-slate-800 text-lg mb-4">年度報酬分析</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="年份" stroke="#64748b" fontSize={12} />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    formatter={(value: number) => formatCurrency(value, 'TWD')}
                  />
                  <Legend />
                  <Bar dataKey="年度報酬" fill="#10b981" name="年度報酬" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 詳細年度預測表 */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">詳細年度預測</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-medium">
                  <tr>
                    <th className="px-6 py-3">年份</th>
                    <th className="px-6 py-3 text-right">資產價值</th>
                    {simulationResult.regularInvestment && (
                      <th className="px-6 py-3 text-right">年度投入</th>
                    )}
                    <th className="px-6 py-3 text-right">累積投入</th>
                    <th className="px-6 py-3 text-right">年度報酬</th>
                    <th className="px-6 py-3 text-right">年度報酬率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {simulationResult.yearlyProjections.map(yp => (
                    <tr key={yp.year} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-bold text-slate-700">第 {yp.year} 年</td>
                      <td className="px-6 py-3 text-right font-medium">
                        {formatCurrency(yp.value, 'TWD')}
                      </td>
                      {simulationResult.regularInvestment && (
                        <td className="px-6 py-3 text-right text-slate-600">
                          {yp.regularInvestment ? formatCurrency(yp.regularInvestment, 'TWD') : '-'}
                        </td>
                      )}
                      <td className="px-6 py-3 text-right text-slate-600">
                        {yp.cumulativeInvestment ? formatCurrency(yp.cumulativeInvestment, 'TWD') : formatCurrency(initialAmount, 'TWD')}
                      </td>
                      <td className={`px-6 py-3 text-right font-bold ${yp.return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(yp.return, 'TWD')}
                      </td>
                      <td className={`px-6 py-3 text-right font-bold ${yp.returnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {yp.returnPercent.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 配置比例未達 100% 的提示 */}
      {assets.length > 0 && simulationResult === null && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
          <p className="text-amber-800 font-medium">
            ⚠️ 配置比例總和必須等於 100%，目前為 {assets.reduce((sum, a) => sum + a.allocation, 0).toFixed(1)}%
          </p>
        </div>
      )}

      {/* 清空確認對話框 */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-2">確認清空</h3>
            <p className="text-slate-600 mb-6">確定要清空所有資產配置嗎？此操作無法復原。</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded border hover:bg-slate-50 active:bg-slate-100 active:scale-95 active:shadow-inner transition-all duration-150"
              >
                取消
              </button>
              <button
                onClick={confirmClearAll}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 active:bg-red-800 active:scale-95 active:shadow-inner transition-all duration-150 shadow-md hover:shadow-lg"
              >
                確認清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetAllocationSimulator;

