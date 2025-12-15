
import React, { useState, useEffect } from 'react';
import { Account, CashFlow, CashFlowType, Currency } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '../utils/calculations';
import BatchCashFlowModal from './BatchCashFlowModal';

interface Props {
  accounts: Account[];
  cashFlows: CashFlow[];
  onAdd: (cf: CashFlow) => void;
  onBatchAdd: (cfs: CashFlow[]) => void;
  onDelete: (id: string) => void;
  currentExchangeRate?: number; // Added to fallback calculation
}

const FundManager: React.FC<Props> = ({ accounts, cashFlows, onAdd, onBatchAdd, onDelete, currentExchangeRate = 32 }) => {
  const [type, setType] = useState<CashFlowType>(CashFlowType.DEPOSIT);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState(''); // New Fee state
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [note, setNote] = useState('');
  const [isBatchOpen, setIsBatchOpen] = useState(false);

  // 當帳戶列表變更或初始化時，確保 accountId 有效
  useEffect(() => {
    if (accounts.length > 0 && !accounts.find(a => a.id === accountId)) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

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
    } else if (account?.currency === Currency.TWD) {
        // TWD Logic
        if (type === CashFlowType.DEPOSIT) calculatedTWD = numAmount + numFee;
        else if (type === CashFlowType.WITHDRAW) calculatedTWD = numAmount - numFee;
        else calculatedTWD = numAmount;
    }
    
    onAdd({
      id: uuidv4(),
      date,
      type,
      amount: numAmount,
      amountTWD: calculatedTWD,
      fee: numFee > 0 ? numFee : undefined,
      accountId,
      targetAccountId: type === CashFlowType.TRANSFER ? targetAccountId : undefined,
      exchangeRate: numRate,
      note
    });

    setAmount('');
    setFee('');
    setNote('');
    // Do not reset exchange rate, convenient for multiple entries
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
    // Case 1: USD Account doing non-transfer operations (Need rate to calculate TWD cost)
    (!isTransfer && selectedAccount?.currency === Currency.USD) || 
    // Case 2: Transfer between DIFFERENT currencies
    (isTransfer && targetAccountId !== '' && isCrossCurrencyTransfer);

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
           <h3 className="font-bold text-lg">資金管理 (Fund Management)</h3>
           <button 
             onClick={() => setIsBatchOpen(true)}
             className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 shadow-sm transition"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
             </svg>
             批次匯入資金
           </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded border border-slate-100 items-end">
             {type === CashFlowType.TRANSFER && (
                 <div>
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
                    匯率 (TWD/USD) 
                    {isCrossCurrencyTransfer && <span className="text-xs text-blue-600 ml-1">不同幣別轉帳</span>}
                    {!isTransfer && selectedAccount?.currency === Currency.USD && <span className="text-xs text-green-600 ml-1">美金換算</span>}
                 </label>
                 <input 
                   type="number" 
                   step="0.0001" 
                   placeholder={currentExchangeRate.toString()} 
                   value={exchangeRate} 
                   onChange={e => setExchangeRate(e.target.value)} 
                   className="mt-1 w-full border border-slate-300 rounded p-2"
                   required
                 />
               </div>
             ) : (
                isSameCurrencyTransfer && (
                    <div className="pb-2">
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

          <div className="pt-2">
            <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded hover:bg-slate-800 shadow-lg shadow-slate-900/20">確認執行</button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase whitespace-nowrap">
            <tr>
              <th className="px-4 py-3">日期</th>
              <th className="px-4 py-3 text-right">台幣 (TWD)</th>
              <th className="px-4 py-3 text-right">美元 (USD)</th>
              <th className="px-4 py-3 text-right">匯率</th>
              <th className="px-4 py-3 text-right">手續費</th>
              <th className="px-4 py-3 text-right">總計成本 (NT$)</th>
              <th className="px-4 py-3">帳戶</th>
              <th className="px-4 py-3">類別</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cashFlows.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(cf => {
               const account = accounts.find(a => a.id === cf.accountId);
               const accountName = account?.name || 'Unknown';
               const targetName = accounts.find(a => a.id === cf.targetAccountId)?.name;
               
               const noteFeeMatch = cf.note?.match(/手續費:\s*(\d+(\.\d+)?)/);
               const displayFee = cf.fee !== undefined ? cf.fee : (noteFeeMatch ? noteFeeMatch[1] : '-');
               
               const isTWD = account?.currency === Currency.TWD;
               const isUSD = account?.currency === Currency.USD;

               // Calculate Total TWD for display
               let displayTotalTWD = 0;
               if (cf.amountTWD) {
                   displayTotalTWD = cf.amountTWD;
               } else {
                   const rate = cf.exchangeRate || currentExchangeRate;
                   const baseAmt = isUSD ? cf.amount * rate : cf.amount;
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
                   
                   {/* TWD Column */}
                   <td className="px-4 py-3 text-right font-mono text-slate-600">
                     {cf.amountTWD ? (
                       <span className="text-slate-800">{cf.amountTWD.toLocaleString()}</span>
                     ) : (
                       isTWD ? cf.amount.toLocaleString() : '-'
                     )}
                   </td>
                   
                   {/* USD Column */}
                   <td className="px-4 py-3 text-right font-mono text-slate-600">
                     {isUSD ? cf.amount.toLocaleString() : '-'}
                   </td>
                   
                   {/* Rate Column */}
                   <td className="px-4 py-3 text-right text-slate-500">
                     {cf.exchangeRate ? cf.exchangeRate : '-'}
                   </td>
                   
                   {/* Fee Column */}
                   <td className="px-4 py-3 text-right text-slate-400">
                     {displayFee}
                   </td>
                   
                   {/* Total Column: Always show TWD */}
                   <td className="px-4 py-3 text-right font-bold text-emerald-700">
                     NT${displayTotalTWD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                   </td>
                   
                   {/* Account Column */}
                   <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                     {accountName} 
                     {cf.type === CashFlowType.TRANSFER && targetName && ` ➔ ${targetName}`}
                   </td>
                   
                   {/* Category / Note Column */}
                   <td className="px-4 py-3 text-slate-600">
                     <span className={`inline-block mr-2 px-1.5 py-0.5 rounded text-[10px] font-bold 
                        ${cf.type === CashFlowType.DEPOSIT || cf.type === CashFlowType.INTEREST ? 'bg-green-100 text-green-700' : 
                          cf.type === CashFlowType.WITHDRAW ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                       {getTypeName(cf.type)}
                     </span>
                     <span className="text-xs">{cf.note?.replace(/\(手續費:.*?\)/, '').trim()}</span>
                   </td>
                   
                   <td className="px-4 py-3 text-right">
                     <button onClick={() => onDelete(cf.id)} className="text-red-400 hover:text-red-600 text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50">刪除</button>
                   </td>
                 </tr>
               );
            })}
          </tbody>
        </table>
      </div>
      
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

