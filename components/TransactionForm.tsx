import React, { useState } from 'react';
import { Market, Transaction, TransactionType, Account } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  accounts: Account[];
  onAdd: (tx: Transaction) => void;
  onClose: () => void;
}

const TransactionForm: React.FC<Props> = ({ accounts, onAdd, onClose }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    ticker: '',
    market: Market.TW,
    type: TransactionType.BUY,
    price: '',
    quantity: '',
    fees: '0',
    accountId: accounts[0]?.id || '',
    note: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountId) return alert("請先建立並選擇證券帳戶");

    const newTx: Transaction = {
      id: uuidv4(),
      date: formData.date,
      ticker: formData.ticker.toUpperCase(),
      market: formData.market,
      type: formData.type,
      price: parseFloat(formData.price),
      quantity: parseFloat(formData.quantity),
      fees: parseFloat(formData.fees),
      accountId: formData.accountId,
      note: formData.note
    };
    onAdd(newTx);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-slate-900 p-4 flex justify-between items-center">
          <h2 className="text-white font-bold text-lg">新增交易</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">日期</label>
              <input 
                type="date" name="date" required
                value={formData.date} onChange={handleChange}
                className="mt-1 w-full border border-slate-300 rounded-md p-2 focus:ring-accent focus:border-accent"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700">交易帳戶</label>
              <select 
                name="accountId" required
                value={formData.accountId} onChange={handleChange}
                className="mt-1 w-full border border-slate-300 rounded-md p-2"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-700">市場</label>
              <select 
                name="market" 
                value={formData.market} onChange={handleChange}
                className="mt-1 w-full border border-slate-300 rounded-md p-2"
              >
                <option value={Market.TW}>台股 (TW)</option>
                <option value={Market.US}>美股 (US)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">代號 (Ticker)</label>
              <input 
                type="text" name="ticker" required placeholder="e.g. 2330 or AAPL"
                value={formData.ticker} onChange={handleChange}
                className="mt-1 w-full border border-slate-300 rounded-md p-2 uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">類別</label>
              <select 
                name="type" 
                value={formData.type} onChange={handleChange}
                className="mt-1 w-full border border-slate-300 rounded-md p-2"
              >
                <option value={TransactionType.BUY}>買入 (Buy)</option>
                <option value={TransactionType.SELL}>賣出 (Sell)</option>
                <option value={TransactionType.DIVIDEND}>股票股息 (Reinvest)</option>
                <option value={TransactionType.CASH_DIVIDEND}>現金股息 (Cash)</option>
                <option value={TransactionType.TRANSFER_IN}>匯入持股 (Transfer In)</option>
                <option value={TransactionType.TRANSFER_OUT}>匯出持股 (Transfer Out)</option>
              </select>
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700">價格 ({formData.market === Market.TW ? 'TWD' : 'USD'})</label>
              <input 
                type="number" name="price" required step="0.01" min="0"
                value={formData.price} onChange={handleChange}
                placeholder={formData.type === TransactionType.CASH_DIVIDEND ? '股息總額' : '單價'}
                className="mt-1 w-full border border-slate-300 rounded-md p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-700">
                {formData.type === TransactionType.CASH_DIVIDEND ? '設為 1' : '數量 (股)'}
              </label>
              <input 
                type="number" name="quantity" required step="0.0001" min="0"
                value={formData.quantity} onChange={handleChange}
                className="mt-1 w-full border border-slate-300 rounded-md p-2"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700">手續費 / 稅金</label>
              <input 
                type="number" name="fees" step="0.01" min="0"
                value={formData.fees} onChange={handleChange}
                className="mt-1 w-full border border-slate-300 rounded-md p-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">備註</label>
            <input 
              type="text" name="note"
              value={formData.note} onChange={handleChange}
              className="mt-1 w-full border border-slate-300 rounded-md p-2"
            />
          </div>

          <div className="pt-4 flex gap-3">
             <button 
              type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
            >
              取消
            </button>
            <button 
              type="submit"
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800"
            >
              儲存交易
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;