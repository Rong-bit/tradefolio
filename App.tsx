import React, { useState, useEffect, useMemo } from 'react';
import { 
  Account, Transaction, CashFlow, PortfolioSummary, 
  Holding, ChartDataPoint, AssetAllocationItem, 
  AnnualPerformanceItem, AccountPerformance, Currency, Market, TransactionType 
} from './types';
import { 
  calculateHoldings, calculateAccountBalances, 
  generateAdvancedChartData, calculateAssetAllocation, 
  calculateAnnualPerformance, calculateAccountPerformance, 
  calculateXIRR
} from './utils/calculations';
import { fetchCurrentPrices } from './services/geminiService';
import Dashboard from './components/Dashboard';
import AccountManager from './components/AccountManager';
import FundManager from './components/FundManager';
import TransactionForm from './components/TransactionForm';
import BatchImportModal from './components/BatchImportModal';
import RebalanceView from './components/RebalanceView';
import HelpView from './components/HelpView';

const DATA_VERSION = '1.0';
const STORAGE_KEY = 'tradefolio_data';

interface AppData {
  version: string;
  accounts: Account[];
  transactions: Transaction[];
  cashFlows: CashFlow[];
  exchangeRate: number; // USD to TWD
  targets: Record<string, number>; // Rebalance targets
  authorizedUsers: string[];
}

const DEFAULT_DATA: AppData = {
  version: DATA_VERSION,
  accounts: [],
  transactions: [],
  cashFlows: [],
  exchangeRate: 32.5,
  targets: {},
  authorizedUsers: []
};

function App() {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showTxForm, setShowTxForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [priceDetails, setPriceDetails] = useState<Record<string, { change: number, changePercent: number }>>({});
  
  const currentUser = data.authorizedUsers.length > 0 ? data.authorizedUsers[0] : 'admin@example.com';

  // Load Data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData({ ...DEFAULT_DATA, ...parsed });
      } catch (e) {
        console.error("Failed to load data", e);
      }
    }
  }, []);

  // Save Data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // Calculations
  const { holdings, summary, chartData, assetAllocation, annualPerformance, accountPerformance, updatedAccounts } = useMemo(() => {
    // 1. Calculate Holdings (Base)
    const baseHoldings = calculateHoldings(data.transactions, currentPrices, priceDetails);
    
    // 2. Update Account Balances (Cash)
    const updatedAccounts = calculateAccountBalances(data.accounts, data.cashFlows, data.transactions);
    
    // 3. Portfolio Summary
    const totalCashTWD = updatedAccounts.reduce((sum, acc) => {
        const rate = acc.currency === Currency.USD ? data.exchangeRate : 1;
        return sum + (acc.balance * rate);
    }, 0);

    const totalStockValueTWD = baseHoldings.reduce((sum, h) => {
        const rate = h.market === Market.US ? data.exchangeRate : 1;
        return sum + (h.currentValue * rate);
    }, 0);

    const totalAssetsTWD = totalCashTWD + totalStockValueTWD;

    // 4. Apply Weights to Holdings
    const calculatedHoldings = baseHoldings.map(h => {
        const rate = h.market === Market.US ? data.exchangeRate : 1;
        const valTwd = h.currentValue * rate;
        const weight = totalAssetsTWD > 0 ? (valTwd / totalAssetsTWD) * 100 : 0;
        return { ...h, weight };
    });

    const netInvestedTWD = data.cashFlows.reduce((acc, cf) => {
      const account = data.accounts.find(a => a.id === cf.accountId);
      
      let amountTWD = 0;
      if (cf.amountTWD && cf.amountTWD > 0) {
        amountTWD = cf.amountTWD;
      } else {
        const isUSD = account?.currency === Currency.USD;
        let rate = isUSD ? (cf.exchangeRate || data.exchangeRate) : 1;
        amountTWD = cf.amount * rate;
      }
      
      if (cf.type === 'DEPOSIT') return acc + amountTWD;
      if (cf.type === 'WITHDRAW') return acc - amountTWD;
      return acc;
    }, 0);

    const totalPLTWD = (totalStockValueTWD + totalCashTWD) - netInvestedTWD;
    const totalPLPercent = netInvestedTWD > 0 ? (totalPLTWD / netInvestedTWD) * 100 : 0;

    const accumulatedCashDividendsTWD = data.transactions
      .filter(t => t.type === TransactionType.CASH_DIVIDEND)
      .reduce((sum, t) => {
          const amt = t.amount || (t.price * t.quantity);
          const rate = t.market === Market.US ? data.exchangeRate : 1;
          return sum + (amt * rate);
      }, 0);

    const annualizedReturn = calculateXIRR(data.cashFlows, data.accounts, totalStockValueTWD + totalCashTWD, data.exchangeRate);

    const summaryData: PortfolioSummary = {
        totalCostTWD: 0,
        totalValueTWD: totalStockValueTWD,
        totalPLTWD,
        totalPLPercent,
        cashBalanceTWD: totalCashTWD,
        netInvestedTWD,
        annualizedReturn,
        exchangeRateUsdToTwd: data.exchangeRate,
        accumulatedCashDividendsTWD,
        accumulatedStockDividendsTWD: 0,
        avgExchangeRate: 0
    };

    const chart = generateAdvancedChartData(
        data.transactions, data.cashFlows, data.accounts, totalStockValueTWD + totalCashTWD, data.exchangeRate
    );
    
    const allocation = calculateAssetAllocation(calculatedHoldings, totalCashTWD, data.exchangeRate);
    
    const annual = calculateAnnualPerformance(chart);
    
    const accPerf = calculateAccountPerformance(data.accounts, calculatedHoldings, data.cashFlows, data.exchangeRate);

    return {
        holdings: calculatedHoldings,
        summary: summaryData,
        chartData: chart,
        assetAllocation: allocation,
        annualPerformance: annual,
        accountPerformance: accPerf,
        updatedAccounts
    };
  }, [data, currentPrices, priceDetails]);

  // Actions
  const handleUpdatePrice = (key: string, price: number) => {
      setCurrentPrices(prev => ({ ...prev, [key]: price }));
  };

  const handleAutoUpdate = async () => {
      const tickers = Array.from(new Set(data.transactions.map(t => {
          if (t.market === Market.TW) return `TPE:${t.ticker}`;
          return t.ticker;
      })));
      
      try {
          const { prices, exchangeRate } = await fetchCurrentPrices(tickers);
          
          const newPrices: Record<string, number> = {};
          const newDetails: Record<string, any> = {};
          
          Object.entries(prices).forEach(([key, val]) => {
             let internalKey = key;
             if (key.startsWith('TPE:')) {
                 internalKey = `${Market.TW}-${key.replace('TPE:', '')}`;
             } else {
                 internalKey = `${Market.US}-${key}`;
             }
             newPrices[internalKey] = val.price;
             newDetails[internalKey] = { change: val.change, changePercent: val.changePercent };
          });
          
          setCurrentPrices(prev => ({ ...prev, ...newPrices }));
          setPriceDetails(prev => ({ ...prev, ...newDetails }));
          
          if (exchangeRate > 0) {
              setData(prev => ({ ...prev, exchangeRate }));
          }
      } catch (e) {
          console.error(e);
          throw e;
      }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradefolio_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    try {
        const json = JSON.parse(text);
        if (json.accounts && json.transactions) {
            setData({ ...DEFAULT_DATA, ...json });
            alert('匯入成功！');
        } else {
            alert('檔案格式錯誤');
        }
    } catch (e) {
        alert('解析失敗');
    }
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard':
        return <Dashboard 
           summary={summary}
           holdings={holdings}
           chartData={chartData}
           assetAllocation={assetAllocation}
           annualPerformance={annualPerformance}
           accountPerformance={accountPerformance}
           cashFlows={data.cashFlows}
           accounts={updatedAccounts}
           onUpdatePrice={handleUpdatePrice}
           onAutoUpdate={handleAutoUpdate}
        />;
      case 'accounts':
        return <AccountManager 
           accounts={updatedAccounts}
           onAdd={(acc) => setData(prev => ({ ...prev, accounts: [...prev.accounts, acc] }))}
           onDelete={(id) => setData(prev => ({ ...prev, accounts: prev.accounts.filter(a => a.id !== id) }))}
        />;
      case 'funds':
        return <FundManager 
           accounts={updatedAccounts}
           cashFlows={data.cashFlows}
           onAdd={(cf) => setData(prev => ({ ...prev, cashFlows: [...prev.cashFlows, cf] }))}
           onBatchAdd={(cfs) => setData(prev => ({ ...prev, cashFlows: [...prev.cashFlows, ...cfs] }))}
           onDelete={(id) => setData(prev => ({ ...prev, cashFlows: prev.cashFlows.filter(c => c.id !== id) }))}
           currentExchangeRate={data.exchangeRate}
        />;
      case 'transactions':
          return (
             <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">交易紀錄 (Transactions)</h3>
                    <div className="space-x-2">
                       <button onClick={() => setShowTxForm(true)} className="bg-slate-900 text-white px-3 py-1 rounded text-sm">新增交易</button>
                       <button onClick={() => setShowImportModal(true)} className="bg-white border border-slate-300 text-slate-700 px-3 py-1 rounded text-sm">批次匯入</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold">
                            <tr>
                                <th className="px-4 py-3">日期</th>
                                <th className="px-4 py-3">動作</th>
                                <th className="px-4 py-3">標的</th>
                                <th className="px-4 py-3 text-right">單價</th>
                                <th className="px-4 py-3 text-right">數量</th>
                                <th className="px-4 py-3 text-right">總金額</th>
                                <th className="px-4 py-3">帳戶</th>
                                <th className="px-4 py-3 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => {
                                const acc = data.accounts.find(a => a.id === tx.accountId);
                                return (
                                    <tr key={tx.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2">{tx.date}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-0.5 rounded text-xs ${tx.type === TransactionType.BUY ? 'bg-red-100 text-red-700' : tx.type === TransactionType.SELL ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">{tx.ticker}</td>
                                        <td className="px-4 py-2 text-right">{tx.price}</td>
                                        <td className="px-4 py-2 text-right">{tx.quantity}</td>
                                        <td className="px-4 py-2 text-right">
                                            {(tx.amount || (tx.price * tx.quantity)).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2">{acc?.name}</td>
                                        <td className="px-4 py-2 text-right">
                                            <button 
                                              onClick={() => setData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== tx.id) }))}
                                              className="text-red-500 hover:text-red-700"
                                            >刪除</button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
             </div>
          );
      case 'rebalance':
        return <RebalanceView 
           summary={summary}
           holdings={holdings}
           exchangeRate={data.exchangeRate}
           targets={data.targets}
           onUpdateTargets={(targets) => setData(prev => ({ ...prev, targets }))}
        />;
      case 'help':
        return <HelpView 
           onExport={handleExport}
           onImport={handleImport}
           onMigrateLegacy={() => alert('此功能已停用 (Deprecated)')}
           authorizedUsers={data.authorizedUsers}
           onAddUser={(email) => setData(prev => ({ ...prev, authorizedUsers: [...prev.authorizedUsers, email] }))}
           onRemoveUser={(email) => setData(prev => ({ ...prev, authorizedUsers: prev.authorizedUsers.filter(u => u !== email) }))}
           currentUser={currentUser}
        />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      <nav className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
               <div className="flex items-center gap-2">
                  <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">TradeFolio</span>
                  <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400">v{DATA_VERSION}</span>
               </div>
               <div className="hidden md:flex items-center space-x-4">
                  {[
                      { id: 'dashboard', label: '儀表板' },
                      { id: 'transactions', label: '交易紀錄' },
                      { id: 'funds', label: '資金管理' },
                      { id: 'accounts', label: '證券戶' },
                      { id: 'rebalance', label: '再平衡' },
                      { id: 'help', label: '說明 & 備份' },
                  ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition ${activeTab === tab.id ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                      >
                        {tab.label}
                      </button>
                  ))}
               </div>
               
               <div className="flex items-center gap-2">
                   <label className="text-xs text-slate-400">USD/TWD</label>
                   <input 
                      type="number" 
                      value={data.exchangeRate}
                      onChange={(e) => setData(prev => ({ ...prev, exchangeRate: parseFloat(e.target.value) || 32 }))}
                      className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-blue-500"
                   />
                   <button 
                     onClick={() => setShowTxForm(true)}
                     className="ml-4 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg transition transform hover:scale-105"
                   >
                     + 記一筆
                   </button>
               </div>
            </div>
         </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
         {renderContent()}
      </main>

      {showTxForm && (
          <TransactionForm 
             accounts={data.accounts}
             onAdd={(tx) => setData(prev => ({ ...prev, transactions: [...prev.transactions, tx] }))}
             onClose={() => setShowTxForm(false)}
          />
      )}
      
      {showImportModal && (
          <BatchImportModal
             accounts={data.accounts}
             onImport={(txs) => setData(prev => ({ ...prev, transactions: [...prev.transactions, ...txs] }))}
             onClose={() => setShowImportModal(false)}
          />
      )}
    </div>
  );
}

export default App;
