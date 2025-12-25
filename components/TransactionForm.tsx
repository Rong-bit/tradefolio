
import React, { useState, useEffect } from 'react';
import { Market, Transaction, TransactionType, Account } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  accounts: Account[];
  onAdd: (tx: Transaction) => void;
  onUpdate: (tx: Transaction) => void;
  onClose: () => void;
  editingTransaction: Transaction | null;
}

const TransactionForm: React.FC<Props> = ({ accounts, onAdd, onUpdate, onClose, editingTransaction }) => {
  const isEditing = !!editingTransaction;
  
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

  // 當進入編輯模式時，載入現有交易資料
  useEffect(() => {
    if (editingTransaction) {
      setFormData({
        date: editingTransaction.date,
        ticker: editingTransaction.ticker,
        market: editingTransaction.market,
        type: editingTransaction.type,
        price: editingTransaction.price.toString(),
        quantity: editingTransaction.quantity.toString(),
        fees: editingTransaction.fees.toString(),
        accountId: editingTransaction.accountId,
        note: editingTransaction.note || ''
      });
    } else {
      // 重置為預設值
      setFormData({
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
    }
  }, [editingTransaction, accounts]);

  // 當交易類型變更為現金股息時，自動將數量設為 1
  useEffect(() => {
    if (formData.type === TransactionType.CASH_DIVIDEND && formData.quantity !== '1' && !editingTransaction) {
      setFormData(prev => ({ ...prev, quantity: '1' }));
    }
  }, [formData.type, editingTransaction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountId) return alert("請先建立並選擇證券帳戶");

    const price = parseFloat(formData.price);
    // 現金股息時，數量固定為 1
    const quantity = formData.type === TransactionType.CASH_DIVIDEND ? 1 : parseFloat(formData.quantity);
    const fees = parseFloat(formData.fees) || 0;
    
    // 計算總金額邏輯
    let finalAmount = 0;
    
    if (formData.type === TransactionType.BUY || formData.type === TransactionType.SELL) {
        let baseAmount = price * quantity;
        
        // 台股特殊邏輯：無條件捨去
        if (formData.market === Market.TW) {
            baseAmount = Math.floor(baseAmount);
        }
        
        // 加上/減去 手續費
        if (formData.type === TransactionType.BUY) {
            finalAmount = baseAmount + fees;
        } else {
            // 賣出時通常是 總金額 - 手續費 - 稅，這裡僅處理手續費欄位
            finalAmount = baseAmount - fees;
        }
    } else if (formData.type === TransactionType.CASH_DIVIDEND) {
        // 現金股息通常直接輸入總額於 Price 欄位，Quantity 設為 1
        finalAmount = (price * quantity) - fees;
    } else {
        // 其他類別如股息再投入，這裡暫時使用基本乘積
        finalAmount = price * quantity;
    }

    const newTx: Transaction = {
      id: isEditing && editingTransaction ? editingTransaction.id : uuidv4(),
      date: formData.date,
      ticker: formData.ticker.toUpperCase(),
      market: formData.market,
      type: formData.type,
      price: price,
      quantity: quantity,
      fees: fees,
      accountId: formData.accountId,
      note: formData.note,
      amount: finalAmount // 儲存計算後的總金額
    };
    
    if (isEditing) {
      onUpdate(newTx);
    } else {
      onAdd(newTx);
    }
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newFormData = { ...formData, [e.target.name]: e.target.value };
    
    // 當交易類型變為現金股息時，自動將數量設為 1
    if (e.target.name === 'type' && e.target.value === TransactionType.CASH_DIVIDEND) {
      newFormData.quantity = '1';
    }
    
    setFormData(newFormData);
  };

  // 計算預覽金額
  const calculatePreviewAmount = (): number => {
    const price = parseFloat(formData.price) || 0;
    const quantity = formData.type === TransactionType.CASH_DIVIDEND ? 1 : (parseFloat(formData.quantity) || 0);
    const fees = parseFloat(formData.fees) || 0;
    
    if (formData.type === TransactionType.BUY || formData.type === TransactionType.SELL) {
      let baseAmount = price * quantity;
      if (formData.market === Market.TW) {
        baseAmount = Math.floor(baseAmount);
      }
      return formData.type === TransactionType.BUY ? baseAmount + fees : baseAmount - fees;
    } else if (formData.type === TransactionType.CASH_DIVIDEND) {
      return (price * quantity) - fees;
    }
    return price * quantity;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-slate-900 p-4 flex justify-between items-center">
          <h2 className="text-white font-bold text-lg">{isEditing ? '編輯交易' : '新增交易'}</h2>
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
                <option value={Market.UK}>英國股 (UK)</option>
                <option value={Market.JP}>日本股 (JP)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">代號 (Ticker)</label>
              <input 
                type="text" name="ticker" required placeholder="e.g. 2330, AAPL, or DTLA"
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
              <label className="block text-sm font-medium text-slate-700">價格 ({
                formData.market === Market.TW ? 'TWD' : 
                formData.market === Market.UK ? 'USD' : 
                formData.market === Market.JP ? 'JPY' : 
                'USD'
              })</label>
              <input 
                type="number" name="price" required step="any" min="0"
                value={formData.price} onChange={handleChange}
                placeholder={formData.type === TransactionType.CASH_DIVIDEND ? '股息總額' : '單價'}
                className="mt-1 w-full border border-slate-300 rounded-md p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-700">
                {formData.type === TransactionType.CASH_DIVIDEND ? '數量 (固定為 1)' : '數量 (股)'}
              </label>
              <input 
                type="number" name="quantity" required step="any" min="0"
                value={formData.type === TransactionType.CASH_DIVIDEND ? '1' : formData.quantity}
                onChange={handleChange}
                disabled={formData.type === TransactionType.CASH_DIVIDEND}
                className={`mt-1 w-full border border-slate-300 rounded-md p-2 ${formData.type === TransactionType.CASH_DIVIDEND ? 'bg-slate-100 cursor-not-allowed' : ''}`}
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

          {/* 計算金額預覽 */}
          {formData.price && formData.quantity && (
            <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
              <div className="text-xs text-slate-600 mb-1">計算金額預覽：</div>
              <div className="text-lg font-bold text-slate-800">
                {calculatePreviewAmount().toFixed(2)}
                <span className="text-xs text-slate-500 ml-2">
                  ({formData.market === Market.TW ? 'TWD' : formData.market === Market.JP ? 'JPY' : 'USD'})
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                計算公式：{formData.price} × {formData.quantity} 
                {formData.market === Market.TW ? ' (台股向下取整)' : ''} 
                {formData.type === TransactionType.BUY ? ' + ' : formData.type === TransactionType.SELL ? ' - ' : ''}
                {formData.fees || 0} (手續費)
              </div>
            </div>
          )}

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
              {isEditing ? '更新交易' : '儲存交易'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;


