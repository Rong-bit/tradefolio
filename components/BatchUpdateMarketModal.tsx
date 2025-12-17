import React, { useState, useMemo } from 'react';
import { Transaction, Market } from '../types';

interface Props {
  transactions: Transaction[];
  onUpdate: (updates: { id: string; market: Market }[]) => void;
  onClose: () => void;
}

const BatchUpdateMarketModal: React.FC<Props> = ({ transactions, onUpdate, onClose }) => {
  const [ticker, setTicker] = useState('');
  const [newMarket, setNewMarket] = useState<Market>(Market.US);

  // 根據輸入的股票代號找到匹配的交易記錄
  const matchingTransactions = useMemo(() => {
    if (!ticker.trim()) return [];
    const upperTicker = ticker.trim().toUpperCase();
    return transactions.filter(tx => tx.ticker.toUpperCase() === upperTicker);
  }, [ticker, transactions]);

  const handleConfirm = () => {
    if (matchingTransactions.length === 0) {
      alert('找不到匹配的交易記錄，請確認股票代號是否正確。');
      return;
    }

    const updates = matchingTransactions.map(tx => ({
      id: tx.id,
      market: newMarket
    }));

    onUpdate(updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-purple-600 p-4 flex justify-between items-center rounded-t-xl">
          <h2 className="text-white font-bold text-lg">批量修改市場</h2>
          <button onClick={onClose} className="text-purple-200 hover:text-white text-2xl">&times;</button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* 股票代號輸入 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              股票代號
            </label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="例如：VWRA"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
            />
          </div>

          {/* 市場選擇 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              新的市場設置
            </label>
            <select
              value={newMarket}
              onChange={(e) => setNewMarket(e.target.value as Market)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
            >
              <option value={Market.US}>美股 (US)</option>
              <option value={Market.TW}>台股 (TW)</option>
              <option value={Market.UK}>英國股 (UK)</option>
              <option value={Market.JP}>日本股 (JP)</option>
            </select>
          </div>

          {/* 顯示找到的交易記錄數量 */}
          {ticker.trim() && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-700">
                <span className="font-bold text-purple-600">
                  找到 {matchingTransactions.length} 筆交易記錄
                </span>
                {matchingTransactions.length > 0 && (
                  <span className="block mt-2 text-xs text-slate-500">
                    將把這些記錄的市場設置更新為：<strong>{
                      newMarket === Market.US ? '美股 (US)' : 
                      newMarket === Market.TW ? '台股 (TW)' : 
                      newMarket === Market.UK ? '英國股 (UK)' : 
                      '日本股 (JP)'
                    }</strong>
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={matchingTransactions.length === 0}
            className={`px-6 py-2 rounded-lg transition shadow-lg text-white ${
              matchingTransactions.length > 0
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-slate-400 cursor-not-allowed'
            }`}
          >
            確認修改
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchUpdateMarketModal;

