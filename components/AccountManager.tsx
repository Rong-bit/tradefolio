
import React, { useState } from 'react';
import { Account, Currency } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '../utils/calculations';
import { Language, t, translate } from '../utils/i18n';

interface Props {
  accounts: Account[];
  onAdd: (acc: Account) => void;
  onUpdate?: (acc: Account) => void;
  onDelete: (id: string) => void;
  language: Language;
}

const AccountManager: React.FC<Props> = ({ accounts, onAdd, onUpdate, onDelete, language }) => {
  const translations = t(language);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<Currency>(Currency.TWD);
  const [isSubBrokerage, setIsSubBrokerage] = useState(false);
  const [balance, setBalance] = useState('');
  
  // State for custom delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<{id: string, name: string} | null>(null);
  
  // State for edit modal
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const accountBalance = balance ? parseFloat(balance) : 0;
    
    if (editingAccount && onUpdate) {
      onUpdate({
        ...editingAccount,
        name,
        currency,
        isSubBrokerage,
        balance: accountBalance
      });
      setIsEditModalOpen(false);
      setEditingAccount(null);
    } else {
      onAdd({
        id: uuidv4(),
        name,
        currency,
        isSubBrokerage,
        balance: accountBalance
      });
    }
    
    // Reset form
    setName('');
    setCurrency(Currency.TWD);
    setIsSubBrokerage(false);
    setBalance('');
  };

  const handleEditClick = (e: React.MouseEvent, account: Account) => {
    e.stopPropagation();
    setEditingAccount(account);
    setName(account.name);
    setCurrency(account.currency);
    setIsSubBrokerage(account.isSubBrokerage);
    setBalance(account.balance.toString());
    setIsEditModalOpen(true);
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
        <h3 className="font-bold text-lg mb-4">{translations.accounts.addAccount}</h3>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700">{translations.accounts.accountName}</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border border-slate-300 rounded-md p-2"
              placeholder={translations.accounts.accountNamePlaceholder}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">{translations.accounts.currency}</label>
            <select 
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="mt-1 block w-full border border-slate-300 rounded-md p-2"
            >
              <option value={Currency.TWD}>{translations.accounts.currencyTWD}</option>
              <option value={Currency.USD}>{translations.accounts.currencyUSD}</option>
              <option value={Currency.JPY}>{translations.accounts.currencyJPY}</option>
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
               <span className="text-sm text-slate-700">{translations.accounts.subBrokerage}</span>
             </label>
          </div>
          <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800">
            {editingAccount ? translations.accounts.update : translations.accounts.add}
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
                  {acc.isSubBrokerage && <span className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded">{translations.accounts.subBrokerage}</span>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1 shrink-0">
                {onUpdate && (
                  <button 
                    type="button"
                    onClick={(e) => handleEditClick(e, acc)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative z-20 cursor-pointer border border-transparent"
                    title={translations.accounts.editAccount}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
                <button 
                  type="button"
                  onClick={(e) => handleDeleteClick(e, acc.id, acc.name)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors relative z-20 cursor-pointer border border-transparent"
                  title={language === 'zh-TW' ? '刪除帳戶' : 'Delete Account'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-50">
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">{translations.accounts.cashBalance}</p>
              <p className="text-xl font-mono font-bold text-slate-700 mt-1">
                {formatCurrency(acc.balance, acc.currency)}
              </p>
            </div>
          </div>
        ))}
        
        {accounts.length === 0 && (
          <div className="col-span-full text-center py-10 text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
            {translations.accounts.noAccounts}
          </div>
        )}
      </div>

      {/* Edit Account Modal */}
      {isEditModalOpen && editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{translations.accounts.editAccountTitle}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{translations.accounts.accountName}</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2"
                  placeholder={translations.accounts.accountNamePlaceholder}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{translations.accounts.currency}</label>
                  <select 
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    className="w-full border border-slate-300 rounded-md p-2"
                  >
                    <option value={Currency.TWD}>{translations.accounts.currencyTWD}</option>
                    <option value={Currency.USD}>{translations.accounts.currencyUSD}</option>
                    <option value={Currency.JPY}>{translations.accounts.currencyJPY}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{translations.accounts.balance}</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full border border-slate-300 rounded-md p-2"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={isSubBrokerage}
                    onChange={(e) => setIsSubBrokerage(e.target.checked)}
                    className="rounded text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-slate-700">{translations.accounts.subBrokerage}</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingAccount(null);
                    setName('');
                    setCurrency(Currency.TWD);
                    setIsSubBrokerage(false);
                    setBalance('');
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded transition"
                >
                  {translations.accounts.cancel}
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 transition shadow-sm"
                >
                  {translations.accounts.updateAccount}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{translations.accounts.confirmDelete}</h3>
            <p className="text-slate-600 mb-4">
              {translate('accounts.confirmDeleteMessage', language, { name: deleteTarget.name })}
            </p>
            <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded mb-6 border border-amber-100">
              {translations.accounts.deleteWarning}
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
                {translations.accounts.deleteAccount}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManager;
