
import React, { useState, useEffect, useMemo } from 'react';
import { Account, CashFlow, CashFlowType, CashFlowCategory, Currency } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '../utils/calculations';
import BatchCashFlowModal from './BatchCashFlowModal';
import { Language, t } from '../utils/i18n';

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
  language: Language;
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
  currentJpyExchangeRate = 0.21,
  language
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
  const [category, setCategory] = useState<CashFlowCategory>(CashFlowCategory.INVESTMENT);
  
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
      setCategory(editingCashFlow.category || CashFlowCategory.INVESTMENT);
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
      setCategory(CashFlowCategory.INVESTMENT);
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
      note,
      category
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
    setCategory(CashFlowCategory.INVESTMENT);
    setEditingCashFlow(null);
    setIsFormOpen(false); // Close Modal
  };

  const getTypeName = (type: CashFlowType) => {
    switch (type) {
      case CashFlowType.DEPOSIT: return t(language).funds.deposit;
      case CashFlowType.WITHDRAW: return t(language).funds.withdraw;
      case CashFlowType.TRANSFER: return t(language).funds.transfer;
      case CashFlowType.INTEREST: return t(language).funds.interest;
      default: return type;
    }
  };

  const getCategoryName = (category?: CashFlowCategory) => {
    if (!category) return language === 'en' ? 'Investment' : '投資';
    switch (category) {
      case CashFlowCategory.INVESTMENT: return language === 'en' ? 'Investment' : '投資';
      case CashFlowCategory.EDUCATION: return language === 'en' ? 'Education' : '教育資金';
      case CashFlowCategory.TRAVEL: return language === 'en' ? 'Travel' : '旅遊';
      case CashFlowCategory.LIVING: return language === 'en' ? 'Living' : '生活費';
      case CashFlowCategory.EMERGENCY: return language === 'en' ? 'Emergency' : '緊急預備金';
      case CashFlowCategory.OTHER: return language === 'en' ? 'Other' : '其他';
      default: return language === 'en' ? 'Investment' : '投資';
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
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-700">{t(language).funds.operations}</h3>
            <div className="flex flex-wrap gap-2">
               <button onClick={() => setIsClearConfirmOpen(true)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded text-xs sm:text-sm hover:bg-red-100 border border-red-200 whitespace-nowrap">
                  {t(language).funds.clearAll}
               </button>
               <button onClick={() => setIsBatchOpen(true)} className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded text-xs sm:text-sm hover:bg-indigo-100 border border-indigo-200 whitespace-nowrap">
                  {t(language).funds.batchImport}
               </button>
               <button onClick={() => {
                 setEditingCashFlow(null);
                 setIsFormOpen(true);
               }} className="bg-slate-900 text-white px-4 py-2 rounded text-xs sm:text-sm hover:bg-slate-800 shadow-lg shadow-slate-900/20 whitespace-nowrap">
                  {t(language).funds.addRecord}
               </button>
            </div>
          </div>
      </div>

      {/* 2. Filters */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">{t(language).funds.filter}</h3>
            <button 
              onClick={clearFilters}
              className="text-sm text-slate-500 hover:text-slate-700 underline"
            >
              {t(language).funds.clearFilters}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {/* 帳戶篩選 */}
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">
                 {t(language).funds.accountFilter}
               </label>
               <select 
                  value={filterAccount} 
                  onChange={e => setFilterAccount(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
               >
                  <option value="">{t(language).funds.allAccounts}</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
               </select>
             </div>

             {/* 類別篩選 */}
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">
                 {t(language).funds.typeFilter}
               </label>
               <select 
                  value={filterType} 
                  onChange={e => setFilterType(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
               >
                  <option value="">{t(language).funds.allTypes}</option>
                  <option value={CashFlowType.DEPOSIT}>{t(language).funds.deposit}</option>
                  <option value={CashFlowType.WITHDRAW}>{t(language).funds.withdraw}</option>
                  <option value={CashFlowType.TRANSFER}>{t(language).funds.transfer}</option>
                  <option value={CashFlowType.INTEREST}>{t(language).funds.interest}</option>
               </select>
             </div>

             {/* 起始日 */}
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">
                 {t(language).funds.dateFrom}
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
                 {t(language).funds.dateTo}
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
              {language === 'en' 
                ? <>Showing <span className="font-semibold text-slate-800">{filteredFlows.length}</span> records</>
                : <>顯示 <span className="font-semibold text-slate-800">{filteredFlows.length}</span> 筆記錄</>
              }
              {filteredFlows.length !== cashFlows.length && (
                <span className="text-slate-500">
                  {language === 'en' 
                    ? <> (Total {cashFlows.length})</>
                    : <>（共 {cashFlows.length} 筆）</>
                  }
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
                {t(language).funds.last30Days}
              </button>
              <button
                onClick={() => {
                  const currentYear = new Date().getFullYear();
                  setFilterDateFrom(`${currentYear}-01-01`);
                  setFilterDateTo(`${currentYear}-12-31`);
                }}
                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition"
              >
                {t(language).funds.thisYear}
              </button>
            </div>
          </div>
      </div>

      {/* 3. List Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-xs sm:text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase">
            <tr>
              <th className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">{t(language).labels.date}</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap hidden sm:table-cell">{language === 'en' ? 'TWD' : '台幣 (TWD)'}</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap hidden md:table-cell">{language === 'en' ? 'USD' : '美元 (USD)'}</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap hidden md:table-cell">{language === 'en' ? 'JPY' : '日幣 (JPY)'}</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap hidden lg:table-cell">{t(language).labels.exchangeRate}</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap hidden lg:table-cell">{t(language).labels.fee}</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap">{t(language).labels.totalCost}</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">{t(language).labels.account}</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">{t(language).labels.category}</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-center whitespace-nowrap">{t(language).labels.action}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredFlows.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-slate-400">{language === 'en' ? 'No matching records found.' : '沒有符合條件的資金紀錄。'}</td></tr>
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
                       <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-600 whitespace-nowrap">{cf.date}</td>
                       
                       <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-mono text-slate-600 hidden sm:table-cell">
                         {cf.amountTWD ? (
                           <span className="text-slate-800">{cf.amountTWD.toLocaleString()}</span>
                         ) : (
                           isTWD ? cf.amount.toLocaleString() : '-'
                         )}
                       </td>
                       
                       <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-mono text-slate-600 hidden md:table-cell">
                         {isUSD ? cf.amount.toLocaleString() : '-'}
                       </td>
                       
                       <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-mono text-slate-600 hidden md:table-cell">
                         {isJPY ? cf.amount.toLocaleString() : '-'}
                       </td>
                       
                       <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-slate-500 hidden lg:table-cell">
                         {cf.exchangeRate ? cf.exchangeRate : '-'}
                       </td>
                       
                       <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-slate-400 hidden lg:table-cell">
                         {displayFee}
                       </td>
                       
                       <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-bold text-emerald-700">
                         NT${displayTotalTWD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                       </td>
                       
                       <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-700 whitespace-nowrap text-xs sm:text-sm">
                         <div className="flex flex-col">
                           <span>{accountName}</span>
                           {cf.type === CashFlowType.TRANSFER && targetName && <span className="text-slate-400 text-xs">→ {targetName}</span>}
                         </div>
                       </td>
                       
                       <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-600 hidden sm:table-cell">
                         <div className="flex flex-col gap-1">
                           <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold 
                              ${cf.type === CashFlowType.DEPOSIT || cf.type === CashFlowType.INTEREST ? 'bg-green-100 text-green-700' : 
                                cf.type === CashFlowType.WITHDRAW ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                             {getTypeName(cf.type)}
                           </span>
                           {cf.category && (
                             <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                               {getCategoryName(cf.category)}
                             </span>
                           )}
                           {cf.note && (
                             <span className="text-xs text-slate-500">{cf.note.replace(/\(手續費:.*?\)/, '').trim()}</span>
                           )}
                         </div>
                       </td>
                       
                       <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                         <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 justify-end items-end sm:items-center">
                           {onUpdate && (
                             <button 
                               onClick={() => {
                                 setEditingCashFlow(cf);
                                 setIsFormOpen(true);
                               }} 
                               className="text-blue-400 hover:text-blue-600 text-[10px] sm:text-xs border border-blue-200 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded hover:bg-blue-50 whitespace-nowrap"
                             >
                               編輯
                             </button>
                           )}
                           <button onClick={() => onDelete(cf.id)} className="text-red-400 hover:text-red-600 text-[10px] sm:text-xs border border-red-200 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded hover:bg-red-50 whitespace-nowrap">刪除</button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
             <div className="bg-slate-900 p-3 sm:p-4 flex justify-between items-center shrink-0">
                <h2 className="text-white font-bold text-base sm:text-lg">{editingCashFlow ? (language === 'en' ? 'Edit Fund Record' : '編輯資金紀錄') : (language === 'en' ? 'Add Fund Record' : '新增資金紀錄')}</h2>
                <button onClick={() => {
                  setIsFormOpen(false);
                  setEditingCashFlow(null);
                }} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
             </div>
             
             <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                      <label className="block text-sm font-medium text-slate-700">用途類別</label>
                      <select value={category} onChange={e => setCategory(e.target.value as CashFlowCategory)} className="mt-1 w-full border border-slate-300 rounded p-2">
                        <option value={CashFlowCategory.INVESTMENT}>投資</option>
                        <option value={CashFlowCategory.EDUCATION}>教育資金</option>
                        <option value={CashFlowCategory.TRAVEL}>旅遊</option>
                        <option value={CashFlowCategory.LIVING}>生活費</option>
                        <option value={CashFlowCategory.EMERGENCY}>緊急預備金</option>
                        <option value={CashFlowCategory.OTHER}>其他</option>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-slate-50 p-3 sm:p-4 rounded border border-slate-100">
                     {type === CashFlowType.TRANSFER && (
                         <div className="sm:col-span-2">
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

                  <div className="pt-3 sm:pt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsFormOpen(false);
                        setEditingCashFlow(null);
                      }}
                      className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 text-sm sm:text-base"
                    >
                      取消
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 shadow-lg shadow-slate-900/20 text-sm sm:text-base"
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
           <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 max-w-sm w-full mx-4">
              <h3 className="text-base sm:text-lg font-bold text-red-600 mb-2">{language === 'en' ? 'Confirm Clear All Fund Records?' : '確認清空所有資金紀錄？'}</h3>
              <p className="text-sm sm:text-base text-slate-600 mb-6">{language === 'en' ? 'This will delete all deposit, withdrawal, transfer and interest records. This action cannot be undone. Please backup your data first.' : '此操作將刪除所有的入金、出金、轉帳與利息紀錄，且無法復原。建議先備份資料。'}</p>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                 <button onClick={() => setIsClearConfirmOpen(false)} className="px-4 py-2 rounded border hover:bg-slate-50 text-sm sm:text-base">{t(language).common.cancel}</button>
                 <button 
                   onClick={() => {
                       onClearAll();
                       setIsClearConfirmOpen(false);
                   }} 
                   className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm sm:text-base"
                 >
                   {language === 'en' ? 'Confirm Clear' : '確認清空'}
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

