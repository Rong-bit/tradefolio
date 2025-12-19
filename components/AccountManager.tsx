
import React, { useState } from 'react';
import { Account, Currency } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '../utils/calculations';

interface Props {
  accounts: Account[];
  onAdd: (acc: Account) => void;
  onDelete: (id: string) => void;
}

const AccountManager: React.FC<Props> = ({ accounts, onAdd, onDelete }) => {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<Currency>(Currency.TWD);
  const [isSubBrokerage, setIsSubBrokerage] = useState(false);
  
  // State for custom delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<{id: string, name: string} | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      id: uuidv4(),
      name,
      currency,
      isSubBrokerage,
      balance: 0
    });
    setName('');
    setIsSubBrokerage(false);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string, accountName: string) => {
    // Only stop propagation to prevent bubbling to card clicks if any
    e.stopPropagation();
    setDeleteTarget({ id, name: accountName });
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-bold text-lg mb-4">新增證券戶 / 銀行帳戶</h3>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700">帳戶名稱</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border border-slate-300 rounded-md p-2"
              placeholder="e.g. 富邦證券, Firstrade"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">幣別</label>
            <select 
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="mt-1 block w-full border border-slate-300 rounded-md p-2"
            >
              <option value={Currency.TWD}>台幣 (TWD)</option>
              <option value={Currency.USD}>美金 (USD)</option>
              <option value={Currency.JPY}>日幣 (JPY)</option>
            </select>
          </div>
          <div className="flex items-center h-10 pb-2">
             <label className="flex items-center space-x-2 cursor-pointer">
               <input 
                type="checkbox"
                checked={isSubBrokerage}
                onChange={(e) => setIsSubBrokerage(e.target.checked)}
                className="rounded text-accent focus:ring-accent"
               />
               <span className="text-sm text-slate-700">複委託 (Sub-brokerage)</span>
             </label>
          </div>
          <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800">
            新增
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white p-5 rounded-lg shadow border border-slate-100 hover:shadow-md transition-shadow relative">
            {/* Header Area */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 min-w-0 pr-2">
                <h4 className="font-bold text-slate-800 text-lg break-words leading-tight">{acc.name}</h4>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded border ${
                    acc.currency === Currency.USD ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                    acc.currency === Currency.JPY ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                    'bg-green-50 text-green-700 border-green-100'
                  }`}>
                    {acc.currency}
                  </span>
                  {acc.isSubBrokerage && <span className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded">複委託</span>}
                </div>
              </div>

              {/* Delete Button */}
              <button 
                type="button"
                onClick={(e) => handleDeleteClick(e, acc.id, acc.name)}
                className="shrink-0 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors relative z-20 cursor-pointer border border-transparent"
                title="刪除帳戶"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            
            <div className="pt-4 border-t border-slate-50">
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Cash Balance</p>
              <p className="text-xl font-mono font-bold text-slate-700 mt-1">
                {formatCurrency(acc.balance, acc.currency)}
              </p>
            </div>
          </div>
        ))}
        
        {accounts.length === 0 && (
          <div className="col-span-full text-center py-10 text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
            尚無帳戶，請上方新增第一個證券戶。
          </div>
        )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">確認刪除帳戶</h3>
            <p className="text-slate-600 mb-4">
              您確定要刪除「<span className="font-bold text-slate-800">{deleteTarget.name}</span>」嗎？
            </p>
            <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded mb-6 border border-amber-100">
              注意：這不會刪除該帳戶下的歷史交易紀錄，但在篩選時可能會出現異常。
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded transition"
              >
                取消
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition shadow-sm"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManager;
