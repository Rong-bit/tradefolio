
import React, { useState, useEffect, useMemo } from 'react';
import { Account, CashFlow, CashFlowType, Currency } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '../utils/calculations';
import BatchCashFlowModal from './BatchCashFlowModal';

interface Props {
  accounts: Account[];
  cashFlows: CashFlow[];
  onAdd: (cf: CashFlow) => void;
  onUpdate?: (cf: CashFlow) => void;
  onBatchAdd: (cfs: CashFlow[]) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  currentExchangeRate?: number;
  currentJpyExchangeRate?: number;
}

const FundManager: React.FC<Props> = ({ 
  accounts, 
  cashFlows, 
  onAdd, 
  onUpdate,
  onBatchAdd, 
  onDelete, 
  onClearAll, 
  currentExchangeRate = 32,
  currentJpyExchangeRate = 0.21
}) => {
  // Form State
  const [type, setType] = useState<CashFlowType>(CashFlowType.DEPOSIT);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState(''); 
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [note, setNote] = useState('');
  
  // UI State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [editingCashFlow, setEditingCashFlow] = useState<CashFlow | null>(null);

  // Filter State
  const [filterAccount, setFilterAccount] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  // 當帳戶列表變更或初始化時，確保 accountId 有效
  useEffect(() => {
    if (accounts.length > 0 && !accounts.find(a => a.id === accountId)) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  // 當進入編輯模式時，載入現有資金記錄資料
  useEffect(() => {
    if (editingCashFlow) {
      setType(editingCashFlow.type);
      setDate(editingCashFlow.date);
      setAmount(editingCashFlow.amount.toString());
      setFee(editingCashFlow.fee?.toString() || '');
      setAccountId(editingCashFlow.accountId);
      setTargetAccountId(editingCashFlow.targetAccountId || '');
      setExchangeRate(editingCashFlow.exchangeRate?.toString() || '');
      setNote(editingCashFlow.note || '');
    } else {
      // 重置為預設值
      setType(CashFlowType.DEPOSIT);
      setDate(new Date().toISOString().split('T')[0]);
      setAmount('');
      setFee('');
      setAccountId(accounts[0]?.id || '');
      setTargetAccountId('');
      setExchangeRate('');
      setNote('');
    }
  }, [editingCashFlow, accounts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return alert("請先建立帳戶");

    const numAmount = parseFloat(amount);
    const numFee = fee ? parseFloat(fee) : 0;
    
    // Determine Rate logic based on visibility
    let numRate: number | undefined = undefined;
    
    // Logic to calculate final rate and TWD amount
    const account = accounts.find(a => a.id === accountId);
    const targetAccount = accounts.find(a => a.id === targetAccountId);
    
    const isTransfer = type === CashFlowType.TRANSFER;
    const isSameCurrency = isTransfer && account && targetAccount && account.currency === targetAccount.currency;
    
    if (showExchangeRateInput) {
       numRate = exchangeRate ? parseFloat(exchangeRate) : undefined;
    } else if (isSameCurrency) {
       numRate = 1; // Same currency transfer implies rate 1
    } else if (account?.currency === Currency.TWD && !isTransfer) {
       numRate = 1; // TWD Deposit/Withdraw implies rate 1
    }

    // Determine amountTWD
    let calculatedTWD: number | undefined = undefined;
    
    if (account?.currency === Currency.USD && numRate) {
       // Logic: 
       // If Deposit: Total Cost = Principal(TWD) + Fee(TWD)
       // If Withdraw: Total Received = Principal(TWD) - Fee(TWD)
       if (type === CashFlowType.DEPOSIT) {
          calculatedTWD = (numAmount * numRate) + numFee;
       } else if (type === CashFlowType.WITHDRAW) {
          calculatedTWD = (numAmount * numRate) - numFee;
       } else {
          // Transfer from USD -> TWD or USD -> USD
          calculatedTWD = (numAmount * numRate);
       }
    } else if (account?.currency === Currency.JPY && numRate) {
       // JPY Logic: Similar to USD
       if (type === CashFlowType.DEPOSIT) {
          calculatedTWD = (numAmount * numRate) + numFee;
       } else if (type === CashFlowType.WITHDRAW) {
          calculatedTWD = (numAmount * numRate) - numFee;
       } else {
          // Transfer from JPY -> TWD or JPY -> JPY
          calculatedTWD = (numAmount * numRate);
       }
    } else if (account?.currency === Currency.TWD) {
        // TWD Logic
        if (type === CashFlowType.DEPOSIT) calculatedTWD = numAmount + numFee;
        else if (type === CashFlowType.WITHDRAW) calculatedTWD = numAmount - numFee;
        else calculatedTWD = numAmount;
    }
    
    const cashFlow: CashFlow = {
      id: editingCashFlow ? editingCashFlow.id : uuidv4(),
      date,
      type,
      amount: numAmount,
      amountTWD: calculatedTWD,
      fee: numFee > 0 ? numFee : undefined,
      accountId,
      targetAccountId: type === CashFlowType.TRANSFER ? targetAccountId : undefined,
      exchangeRate: numRate,
      note
    };

    if (editingCashFlow && onUpdate) {
      onUpdate(cashFlow);
    } else {
      onAdd(cashFlow);
    }

    // Reset Fields
    setAmount('');
    setFee('');
    setNote('');
    setEditingCashFlow(null);
    setIsFormOpen(false); // Close Modal
  };

  const getTypeName = (t: CashFlowType) => {
    switch (t) {
      case CashFlowType.DEPOSIT: return '匯入';
      case CashFlowType.WITHDRAW: return '匯出';
      case CashFlowType.TRANSFER: return '轉帳';
      case CashFlowType.INTEREST: return '利息';
      default: return t;
    }
  };

  const selectedAccount = accounts.find(a => a.id === accountId);
  const targetAccount = accounts.find(a => a.id === targetAccountId);
  
  // Logic to determine if Exchange Rate Input should be shown
  const isTransfer = type === CashFlowType.TRANSFER;
  const isCrossCurrencyTransfer = isTransfer && selectedAccount && targetAccount && selectedAccount.currency !== targetAccount.currency;
  const isSameCurrencyTransfer = isTransfer && selectedAccount && targetAccount && selectedAccount.currency === targetAccount.currency;

  const showExchangeRateInput = 
    // Case 1: USD/JPY Account doing non-transfer operations (Need rate to calculate TWD cost)
    (!isTransfer && (selectedAccount?.currency === Currency.USD || selectedAccount?.currency === Currency.JPY)) || 
    // Case 2: Transfer between DIFFERENT currencies
    (isTransfer && targetAccountId !== '' && isCrossCurrencyTransfer);

  // Filter Logic
  const filteredFlows = useMemo(() => {
    return cashFlows.filter(cf => {
      const matchAccount = filterAccount ? (cf.accountId === filterAccount || cf.targetAccountId === filterAccount) : true;
      const matchType = filterType ? cf.type === filterType : true;
      const matchDateFrom = filterDateFrom ? cf.date >= filterDateFrom : true;
      const matchDateTo = filterDateTo ? cf.date <= filterDateTo : true;
      return matchAccount && matchType && matchDateFrom && matchDateTo;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [cashFlows, filterAccount, filterType, filterDateFrom, filterDateTo]);

  const clearFilters = () => {
    setFilterAccount('');
    setFilterType('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Operation Options Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-700">操作選項</h3>
          <div className="flex gap-2">
             <button onClick={() => setIsClearConfirmOpen(true)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded text-sm hover:bg-red-100 border border-red-200">
                清空所有資金
             </button>
             <button onClick={() => setIsBatchOpen(true)} className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded text-sm hover:bg-indigo-100 border border-indigo-200">
                批次匯入
             </button>
             <button onClick={() => {
               setEditingCashFlow(null);
               setIsFormOpen(true);
             }} className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800 shadow-lg shadow-slate-900/20">
                + 記一筆
             </button>
          </div>
      </div>

      {/* 2. Filters */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">查詢/篩選</h3>
            <button 
              onClick={clearFilters}
              className="text-sm text-slate-500 hover:text-slate-700 underline"
            >
              清除所有篩選
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {/* 帳戶篩選 */}
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">
                 帳戶篩選
               </label>
               <select 
                  value={filterAccount} 
                  onChange={e => setFilterAccount(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
               >
                  <option value="">所有帳戶</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
               </select>
             </div>

             {/* 類別篩選 */}
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">
                 類別篩選
               </label>
               <select 
                  value={filterType} 
                  onChange={e => setFilterType(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
               >
                  <option value="">所有類別</option>
                  <option value={CashFlowType.DEPOSIT}>匯入</option>
                  <option value={CashFlowType.WITHDRAW}>匯出</option>
                  <option value={CashFlowType.TRANSFER}>轉帳</option>
                  <option value={CashFlowType.INTEREST}>利息</option>
               </select>
             </div>

             {/* 起始日 */}
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">
                 起始日期
               </label>
               <input 
                  type="date" 
                  value={filterDateFrom} 
                  onChange={e => setFilterDateFrom(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
               />
             </div>

             {/* 結束日 */}
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">
                 結束日期
               </label>
               <input 
                  type="date" 
                  value={filterDateTo} 
                  onChange={e => setFilterDateTo(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
               />
             </div>
          </div>
          
          {/* 篩選結果統計與快速按鈕 */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="text-sm text-slate-600">
              顯示 <span className="font-semibold text-slate-800">{filteredFlows.length}</span> 筆記錄
              {filteredFlows.length !== cashFlows.length && (
                <span className="text-slate-500">
                  （共 {cashFlows.length} 筆）
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const thirtyDaysAgo = new Date();
                  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                  setFilterDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
                  setFilterDateTo(new Date().toISOString().split('T')[0]);
                }}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition"
              >
                最近30天
              </button>
              <button
                onClick={() => {
                  const currentYear = new Date().getFullYear();
                  setFilterDateFrom(`${currentYear}-01-01`);
                  setFilterDateTo(`${currentYear}-12-31`);
                }}
                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition"
              >
                今年
              </button>
            </div>
          </div>
      </div>

      {/* 3. List Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase whitespace-nowrap">
            <tr>
              <th className="px-4 py-3">日期</th>
              <th className="px-4 py-3 text-right">台幣 (TWD)</th>
              <th className="px-4 py-3 text-right">美元 (USD)</th>
              <th className="px-4 py-3 text-right">日幣 (JPY)</th>
              <th className="px-4 py-3 text-right">匯率</th>
              <th className="px-4 py-3 text-right">手續費</th>
              <th className="px-4 py-3 text-right">總計成本 (NT$)</th>
              <th className="px-4 py-3">帳戶</th>
              <th className="px-4 py-3">類別</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredFlows.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-slate-400">沒有符合條件的資金紀錄。</td></tr>
            ) : (
                filteredFlows.map(cf => {
                   const account = accounts.find(a => a.id === cf.accountId);
                   const accountName = account?.name || 'Unknown';
                   const targetName = accounts.find(a => a.id === cf.targetAccountId)?.name;
                   
                   const noteFeeMatch = cf.note?.match(/手續費:\s*(\d+(\.\d+)?)/);
                   const displayFee = cf.fee !== undefined ? cf.fee : (noteFeeMatch ? noteFeeMatch[1] : '-');
                   
                   const isTWD = account?.currency === Currency.TWD;
                   const isUSD = account?.currency === Currency.USD;
                   const isJPY = account?.currency === Currency.JPY;

                   // Calculate Total TWD for display
                   let displayTotalTWD = 0;
                   if (cf.amountTWD) {
                       displayTotalTWD = cf.amountTWD;
                   } else {
                       const rate = cf.exchangeRate || (isUSD ? currentExchangeRate : (isJPY ? currentJpyExchangeRate : 1));
                       const baseAmt = (isUSD || isJPY) ? cf.amount * rate : cf.amount;
                       const feeVal = cf.fee || 0;
                       if (cf.type === CashFlowType.DEPOSIT) {
                           displayTotalTWD = baseAmt + feeVal;
                       } else if (cf.type === CashFlowType.WITHDRAW) {
                           displayTotalTWD = baseAmt - feeVal;
                       } else {
                           displayTotalTWD = baseAmt;
                       }
                   }

                   return (
                     <tr key={cf.id} className="hover:bg-slate-50">
                       <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{cf.date}</td>
                       
                       <td className="px-4 py-3 text-right font-mono text-slate-600">
                         {cf.amountTWD ? (
                           <span className="text-slate-800">{cf.amountTWD.toLocaleString()}</span>
                         ) : (
                           isTWD ? cf.amount.toLocaleString() : '-'
                         )}
                       </td>
                       
                       <td className="px-4 py-3 text-right font-mono text-slate-600">
                         {isUSD ? cf.amount.toLocaleString() : '-'}
                       </td>
                       
                       <td className="px-4 py-3 text-right font-mono text-slate-600">
                         {isJPY ? cf.amount.toLocaleString() : '-'}
                       </td>
                       
                       <td className="px-4 py-3 text-right text-slate-500">
                         {cf.exchangeRate ? cf.exchangeRate : '-'}
                       </td>
                       
                       <td className="px-4 py-3 text-right text-slate-400">
                         {displayFee}
                       </td>
                       
                       <td className="px-4 py-3 text-right font-bold text-emerald-700">
                         NT${displayTotalTWD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                       </td>
                       
                       <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                         {accountName} 
                         {cf.type === CashFlowType.TRANSFER && targetName && ` ➔ ${targetName}`}
                       </td>
                       
                       <td className="px-4 py-3 text-slate-600">
                         <span className={`inline-block mr-2 px-1.5 py-0.5 rounded text-[10px] font-bold 
                            ${cf.type === CashFlowType.DEPOSIT || cf.type === CashFlowType.INTEREST ? 'bg-green-100 text-green-700' : 
                              cf.type === CashFlowType.WITHDRAW ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                           {getTypeName(cf.type)}
                         </span>
                         <span className="text-xs">{cf.note?.replace(/\(手續費:.*?\)/, '').trim()}</span>
                       </td>
                       
                       <td className="px-4 py-3 text-right">
                         <div className="flex gap-2 justify-end items-center">
                           {onUpdate && (
                             <button 
                               onClick={() => {
                                 setEditingCashFlow(cf);
                                 setIsFormOpen(true);
                               }} 
                               className="text-blue-400 hover:text-blue-600 text-xs border border-blue-200 px-2 py-1 rounded hover:bg-blue-50"
                             >
                               編輯
                             </button>
                           )}
                           <button onClick={() => onDelete(cf.id)} className="text-red-400 hover:text-red-600 text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50">刪除</button>
                         </div>
                       </td>
                     </tr>
                   );
                })
            )}
          </tbody>
        </table>
      </div>
      
      {/* 4. Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
             <div className="bg-slate-900 p-4 flex justify-between items-center">
                <h2 className="text-white font-bold text-lg">{editingCashFlow ? '編輯資金紀錄' : '新增資金紀錄'}</h2>
                <button onClick={() => {
                  setIsFormOpen(false);
                  setEditingCashFlow(null);
                }} className="text-slate-400 hover:text-white">&times;</button>
             </div>
             
             <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">日期</label>
                      <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="mt-1 w-full border border-slate-300 rounded p-2"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">類型</label>
                      <select value={type} onChange={e => setType(e.target.value as CashFlowType)} className="mt-1 w-full border border-slate-300 rounded p-2">
                        <option value={CashFlowType.DEPOSIT}>匯入資金 (Import/Salary)</option>
                        <option value={CashFlowType.WITHDRAW}>匯出資金 (Export/Living)</option>
                        <option value={CashFlowType.TRANSFER}>內部轉帳 (Transfer)</option>
                        <option value={CashFlowType.INTEREST}>利息收入 (Interest)</option>
                      </select>
                    </div>
                     <div>
                      <label className="block text-sm font-medium text-slate-700">
                        {type === CashFlowType.TRANSFER ? '來源帳戶' : '帳戶'}
                      </label>
                      <select value={accountId} onChange={e => setAccountId(e.target.value)} className="mt-1 w-full border border-slate-300 rounded p-2">
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">金額 ({selectedAccount?.currency || 'TWD'})</label>
                      <input type="number" required min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 w-full border border-slate-300 rounded p-2"/>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded border border-slate-100">
                     {type === CashFlowType.TRANSFER && (
                         <div className="md:col-span-2">
                           <label className="block text-sm font-medium text-slate-700">轉入目標帳戶</label>
                           <select required value={targetAccountId} onChange={e => setTargetAccountId(e.target.value)} className="mt-1 w-full border border-slate-300 rounded p-2 bg-white">
                              <option value="">選擇帳戶...</option>
                              {accounts.filter(a => a.id !== accountId).map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
                           </select>
                         </div>
                     )}

                     {/* Dynamic Fields based on Account Type & Action */}
                     {showExchangeRateInput ? (
                       <div>
                         <label className="block text-sm font-medium text-slate-700">
                            {selectedAccount?.currency === Currency.USD ? '匯率 (TWD/USD)' : 
                             selectedAccount?.currency === Currency.JPY ? '匯率 (TWD/JPY)' : 
                             '匯率'}
                            {isCrossCurrencyTransfer && <span className="text-xs text-blue-600 ml-1">不同幣別轉帳</span>}
                            {!isTransfer && selectedAccount?.currency === Currency.USD && <span className="text-xs text-green-600 ml-1">美金換算</span>}
                            {!isTransfer && selectedAccount?.currency === Currency.JPY && <span className="text-xs text-orange-600 ml-1">日幣換算</span>}
                         </label>
                         <input 
                           type="number" 
                           step="0.0001" 
                           placeholder={
                             selectedAccount?.currency === Currency.USD ? currentExchangeRate.toString() :
                             selectedAccount?.currency === Currency.JPY ? currentJpyExchangeRate.toString() :
                             currentExchangeRate.toString()
                           } 
                           value={exchangeRate} 
                           onChange={e => setExchangeRate(e.target.value)} 
                           className="mt-1 w-full border border-slate-300 rounded p-2"
                           required
                         />
                       </div>
                     ) : (
                        isSameCurrencyTransfer && (
                            <div className="pb-2 flex items-end h-full">
                                <span className="text-sm font-bold text-slate-500 bg-slate-200 px-3 py-1.5 rounded-full">
                                   同幣別轉帳 (匯率 1.0)
                                </span>
                            </div>
                        )
                     )}

                     <div>
                        <label className="block text-sm font-medium text-slate-700">手續費 (TWD) <span className="text-xs text-slate-400 font-normal">匯費/轉帳費</span></label>
                        <input type="number" step="1" placeholder="0" value={fee} onChange={e => setFee(e.target.value)} className="mt-1 w-full border border-slate-300 rounded p-2"/>
                     </div>
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-slate-700">備註</label>
                     <input type="text" value={note} onChange={e => setNote(e.target.value)} className="mt-1 w-full border border-slate-300 rounded p-2"/>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsFormOpen(false);
                        setEditingCashFlow(null);
                      }}
                      className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
                    >
                      取消
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 shadow-lg shadow-slate-900/20"
                    >
                      {editingCashFlow ? '更新記錄' : '確認執行'}
                    </button>
                  </div>
                </form>
             </div>
          </div>
        </div>
      )}
      
      {/* 5. Clear All Confirmation Modal */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
           <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm">
              <h3 className="text-lg font-bold text-red-600 mb-2">確認清空所有資金紀錄？</h3>
              <p className="text-slate-600 mb-6">此操作將刪除所有的入金、出金、轉帳與利息紀錄，且無法復原。建議先備份資料。</p>
              <div className="flex justify-end gap-3">
                 <button onClick={() => setIsClearConfirmOpen(false)} className="px-4 py-2 rounded border hover:bg-slate-50">取消</button>
                 <button 
                   onClick={() => {
                       onClearAll();
                       setIsClearConfirmOpen(false);
                   }} 
                   className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                 >
                   確認清空
                 </button>
              </div>
           </div>
        </div>
      )}

      {isBatchOpen && (
        <BatchCashFlowModal 
          accounts={accounts} 
          onImport={onBatchAdd} 
          onClose={() => setIsBatchOpen(false)} 
        />
      )}
    </div>
  );
};

export default FundManager;

