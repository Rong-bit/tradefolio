
import React, { useState, useEffect } from 'react';
import { Market, Transaction, TransactionType, Account, Holding } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  accounts: Account[];
  holdings?: Holding[]; // 資產配置明細，用於自動判斷市場
  onAdd: (tx: Transaction) => void;
  onUpdate: (tx: Transaction) => void;
  onClose: () => void;
  editingTransaction: Transaction | null;
}

const TransactionForm: React.FC<Props> = ({ accounts, holdings = [], onAdd, onUpdate, onClose, editingTransaction }) => {
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
    note: '',
    isRegularInvestment: false // 是否為定期定額
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
        note: editingTransaction.note || '',
        isRegularInvestment: false // 從備註判斷是否為定期定額，或保留用戶輸入
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
        note: '',
        isRegularInvestment: false
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

  // 從 holdings 中根據 ticker 查找對應的市場
  const findMarketFromHoldings = (ticker: string): Market | null => {
    if (!ticker || !holdings || holdings.length === 0) return null;
    
    const upperTicker = ticker.toUpperCase().trim();
    
    // 在 holdings 中查找匹配的 ticker
    const matchedHolding = holdings.find((h: Holding) => {
      const holdingTicker = h.ticker.toUpperCase().trim();
      // 支援完全匹配或移除前綴後匹配（如 TPE:2330 匹配 2330）
      return holdingTicker === upperTicker || 
             holdingTicker.replace(/^(TPE:|TW|US|LON|TYO)/i, '') === upperTicker ||
             upperTicker.replace(/^(TPE:|TW|US|LON|TYO)/i, '') === holdingTicker;
    });
    
    return matchedHolding ? matchedHolding.market : null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newFormData = { ...formData, [e.target.name]: e.target.value };
    
    // 當交易類型變為現金股息時，自動將數量設為 1
    if (e.target.name === 'type' && e.target.value === TransactionType.CASH_DIVIDEND) {
      newFormData.quantity = '1';
    }
    
    // 當交易類型改變時，如果不是買入則取消定期定額標記
    if (e.target.name === 'type' && e.target.value !== TransactionType.BUY) {
      newFormData.isRegularInvestment = false;
    }
    
    // 當輸入代號時，從 holdings 中自動判斷市場
    if (e.target.name === 'ticker' && e.target.value) {
      const detectedMarket = findMarketFromHoldings(e.target.value);
      if (detectedMarket) {
        newFormData.market = detectedMarket;
      }
    }
    
    setFormData(newFormData);
  };

  // 計算手續費
  const calculateFees = (): number => {
    const price = parseFloat(formData.price) || 0;
    const quantity = formData.type === TransactionType.CASH_DIVIDEND ? 1 : (parseFloat(formData.quantity) || 0);
    
    // 只對買入和賣出計算手續費
    if (formData.type !== TransactionType.BUY && formData.type !== TransactionType.SELL) {
      return 0;
    }
    
    if (formData.market === Market.TW) {
      // 台股手續費計算
      if (formData.type === TransactionType.BUY) {
        // 買入：定期定額 1元，單筆買入 = 股數 × 股價 × 0.001425 × 0.6（四捨五入），不足20元收20元
        if (formData.isRegularInvestment) {
          return 1;
        } else {
          let baseAmount = price * quantity;
          baseAmount = Math.floor(baseAmount); // 台股先向下取整
          let fee = Math.round(baseAmount * 0.001425 * 0.6);
          return fee < 20 ? 20 : fee;
        }
      } else if (formData.type === TransactionType.SELL) {
        // 賣出：手續費 = 交易金額 × 0.001425 × 0.28（四捨五入）+ 交易稅 = 交易金額 × 0.1%（向下取整）
        let baseAmount = price * quantity;
        baseAmount = Math.floor(baseAmount); // 台股先向下取整
        let commission = Math.round(baseAmount * 0.001425 * 0.28);
        let tax = Math.floor(baseAmount * 0.001); // 0.1% = 0.001，向下取整
        return commission + tax;
      }
    } else if (formData.market === Market.US) {
      // 美股手續費計算
      if (formData.type === TransactionType.BUY) {
        return formData.isRegularInvestment ? 0.1 : 3;
      } else if (formData.type === TransactionType.SELL) {
        return 3;
      }
    }
    
    return 0;
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

  // 當價格、數量、市場、類型或定期定額標記改變時，自動計算手續費（如果用戶未手動修改）
  const calculatedFees = calculateFees();
  const shouldAutoFillFees = formData.price && formData.quantity && 
    (formData.type === TransactionType.BUY || formData.type === TransactionType.SELL);

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
              {/* 手續費預覽 */}
              {shouldAutoFillFees && (
                <div className="mt-2 text-xs text-slate-600">
                  <div>計算手續費：{calculatedFees.toFixed(calculatedFees % 1 === 0 ? 0 : 2)} 
                    <span className="ml-1 text-slate-500">
                      ({formData.market === Market.TW ? 'TWD' : 'USD'})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, fees: calculatedFees.toString() }))}
                    className="mt-1 text-blue-600 hover:text-blue-800 underline text-xs"
                  >
                    使用計算值
                  </button>
                </div>
              )}
            </div>
            {/* 定期定額選項（僅在買入時顯示） */}
            {formData.type === TransactionType.BUY && (
              <div className="flex items-end">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRegularInvestment}
                    onChange={(e) => setFormData(prev => ({ ...prev, isRegularInvestment: e.target.checked }))}
                    className="mr-2 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-slate-700">定期定額</span>
                </label>
              </div>
            )}
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
              {/* 手續費計算詳情 */}
              {shouldAutoFillFees && calculatedFees > 0 && (
                <div className="text-xs text-slate-500 mt-1 pt-1 border-t border-slate-200">
                  <div>手續費計算：{calculatedFees.toFixed(calculatedFees % 1 === 0 ? 0 : 2)} 
                    {formData.market === Market.TW ? ' TWD' : formData.market === Market.US ? ' USD' : ''}
                  </div>
                  {formData.market === Market.TW && formData.type === TransactionType.BUY && !formData.isRegularInvestment && (
                    <div className="mt-0.5 text-slate-400">單筆買入：交易金額 × 0.1425% × 60% (最低20元)</div>
                  )}
                  {formData.market === Market.TW && formData.type === TransactionType.SELL && (
                    <div className="mt-0.5 text-slate-400">賣出：手續費(交易金額×0.1425%×28%) + 交易稅(0.1%，向下取整)</div>
                  )}
                  {formData.market === Market.TW && formData.type === TransactionType.BUY && formData.isRegularInvestment && (
                    <div className="mt-0.5 text-slate-400">定期定額：固定1元</div>
                  )}
                  {formData.market === Market.US && formData.type === TransactionType.BUY && !formData.isRegularInvestment && (
                    <div className="mt-0.5 text-slate-400">單筆買入：固定3美元</div>
                  )}
                  {formData.market === Market.US && formData.type === TransactionType.BUY && formData.isRegularInvestment && (
                    <div className="mt-0.5 text-slate-400">定期定額：固定0.1美元</div>
                  )}
                  {formData.market === Market.US && formData.type === TransactionType.SELL && (
                    <div className="mt-0.5 text-slate-400">賣出：固定3美元</div>
                  )}
                </div>
              )}
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


