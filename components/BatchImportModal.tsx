
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Account, Market, Transaction, TransactionType } from '../types';

interface Props {
  accounts: Account[];
  onImport: (transactions: Transaction[]) => void;
  onClose: () => void;
}

const BatchImportModal: React.FC<Props> = ({ accounts, onImport, onClose }) => {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [inputText, setInputText] = useState(''); // New state for text area
  const [previewData, setPreviewData] = useState<Transaction[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('paste'); // Default to paste for ease

  // Helper to parse date MM/DD/YYYY or YYYY/MM/DD to YYYY-MM-DD
  const parseDate = (dateStr: string) => {
    try {
      if (!dateStr || !dateStr.trim()) return new Date().toISOString().split('T')[0];
      
      // 處理 YYYY/M/D 或 YYYY/MM/DD 格式
      const parts = dateStr.trim().split('/');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          // 使用本地時間創建日期，避免時區問題
          const date = new Date(year, month - 1, day);
          const yearStr = date.getFullYear().toString();
          const monthStr = (date.getMonth() + 1).toString().padStart(2, '0');
          const dayStr = date.getDate().toString().padStart(2, '0');
          return `${yearStr}-${monthStr}-${dayStr}`;
        }
      }
      
      // 如果格式不符合，嘗試使用 Date 構造函數
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
      
      // 使用本地時間格式化，避免時區問題
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  };

  // Helper to clean currency string "$1,234.56" -> 1234.56, "-6,674.00" -> -6674.00
  const parseNumber = (str: string) => {
    if (!str) return 0;
    // 保留負號，移除貨幣符號和逗號
    const cleaned = str.replace(/[$,]/g, '');
    const result = parseFloat(cleaned);
    return isNaN(result) ? 0 : result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseImportData(text);
    };
    reader.readAsText(file);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  const handleParseText = () => {
    parseImportData(inputText);
  };

  const parseImportData = (text: string) => {
    try {
      setErrorMsg('');
      console.log('開始解析文字:', text);
      const lines = text.split('\n');
      console.log('分割後的行數:', lines.length, lines);
      const transactions: Transaction[] = [];
      let headers: string[] = [];
      
      // Detection: Check if it looks like Schwab CSV (has specific headers)
      const firstLine = lines.find(l => l.trim().length > 0) || '';
      const isSchwabCSV = firstLine.includes('Date') && firstLine.includes('Action') && firstLine.includes(',');
      const isTabSeparated = firstLine.includes('\t');

      lines.forEach((line, index) => {
        // Skip empty lines
        if (!line.trim()) return;

        let dateVal = '';
        let type: TransactionType | null = null;
        let tickerVal = '';
        let priceVal = 0;
        let quantityVal = 0;
        let feesVal = 0;
        let amountVal = 0;
        let market = Market.US; // Default

        if (isSchwabCSV) {
            // --- Logic for Schwab CSV ---
            const cleanLine = line.trim();
            if (index === 0 || (cleanLine.includes('"Date"') && cleanLine.includes('"Action"'))) {
              headers = cleanLine.split(',').map(h => h.replace(/"/g, '').trim());
              return;
            }
            const columns = cleanLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || cleanLine.split(',');
            const cols = columns.map(c => c.replace(/^"|"$/g, '').trim());
            if (cols.length < 5) return;

            const dateIdx = headers.indexOf('Date');
            const actionIdx = headers.indexOf('Action');
            const symbolIdx = headers.indexOf('Symbol');
            const qtyIdx = headers.indexOf('Quantity');
            const priceIdx = headers.indexOf('Price');
            const feesIdx = headers.indexOf('Fees & Comm');
            const amountIdx = headers.indexOf('Amount');

            dateVal = parseDate(cols[dateIdx !== -1 ? dateIdx : 0]);
            tickerVal = cols[symbolIdx !== -1 ? symbolIdx : 2];
            const rawQty = parseNumber(cols[qtyIdx !== -1 ? qtyIdx : 4]);
            quantityVal = Math.abs(rawQty);
            priceVal = parseNumber(cols[priceIdx !== -1 ? priceIdx : 5]);
            feesVal = Math.abs(parseNumber(cols[feesIdx !== -1 ? feesIdx : 6]));

            const actionVal = cols[actionIdx !== -1 ? actionIdx : 1];
            const actionLower = actionVal.toLowerCase();

            if (actionLower.includes('buy')) type = TransactionType.BUY;
            else if (actionLower.includes('sell')) type = TransactionType.SELL;
            else if (actionLower.includes('reinvest')) type = TransactionType.DIVIDEND;
            else if (actionLower.includes('cash dividend') || actionLower.includes('qual div')) {
                type = TransactionType.CASH_DIVIDEND;
                amountVal = parseNumber(cols[amountIdx !== -1 ? amountIdx : 7]);
                priceVal = Math.abs(amountVal); 
                quantityVal = 1;
            }
            else if (actionLower.includes('journal') || actionLower.includes('transfer')) {
                if (rawQty > 0) type = TransactionType.TRANSFER_IN;
                else type = TransactionType.TRANSFER_OUT;
            }
            
            // 為 Schwab CSV 設置 amountVal（如果還沒設置的話）
            if (amountVal === 0 && amountIdx !== -1) {
                amountVal = parseNumber(cols[amountIdx]);
            }

        } else {
            // --- Logic for Simple/Custom Text (Tab or Comma) ---
            // Expected format: Date | Type | Ticker | Price | Qty | Fees | (Amount)
            let cols: string[];
            if (isTabSeparated) {
              // 使用 split('\t') 確保正確分割制表符，不過濾空字串以保持欄位對齊
              cols = line.split('\t').map(c => c.trim());
            } else {
              cols = line.trim().split(/\s+/).map(c => c.trim());
            }
            
            if (cols.length < 3) {
              return; // Need at least Date, Type, Ticker
            }

            dateVal = parseDate(cols[0]);
            const typeStr = cols[1];
            tickerVal = cols[2] || '';
            priceVal = cols.length > 3 && cols[3] ? parseNumber(cols[3]) : 0;
            const rawQty = cols.length > 4 && cols[4] ? parseNumber(cols[4]) : 0;
            quantityVal = Math.abs(rawQty);
            feesVal = cols.length > 5 && cols[5] ? parseNumber(cols[5]) : 0;
            amountVal = cols.length > 6 && cols[6] ? parseNumber(cols[6]) : 0;
            
            // Map Chinese / English Types
            if (typeStr.includes('買') || typeStr.toLowerCase() === 'buy') type = TransactionType.BUY;
            else if (typeStr.includes('賣') || typeStr.toLowerCase() === 'sell') type = TransactionType.SELL;
            else if (typeStr.includes('股息') || typeStr.includes('配息') || typeStr.toLowerCase().includes('div')) {
                if (quantityVal > 0) {
                    type = TransactionType.DIVIDEND;
                } else {
                    type = TransactionType.CASH_DIVIDEND;
                    // Fix: If Price column is 0, check Amount column for total dividend
                    if (priceVal === 0 && amountVal > 0) {
                        priceVal = amountVal;
                    }
                    quantityVal = 1; // Force quantity to 1 for cash dividends
                }
            }
        }

        // --- Common Validation & Ticker Cleaning ---
        if (!tickerVal || tickerVal === '' || !type) return;

        // Auto-detect Taiwan Market (TPE: prefix OR 4-digit code)
        if (tickerVal.includes('TPE:') || tickerVal.includes('TW') || /^\d{4}$/.test(tickerVal)) {
            market = Market.TW;
            // Remove 'TPE:', 'TW', 'US' prefixes to clean ticker
            tickerVal = tickerVal.replace(/^(TPE:|TW|US)/i, '');
        }

        // 計算金額：優先使用提供的金額欄位
        let finalAmount = 0;
        // 檢查是否提供了金額欄位（不為0且有效）
        if (amountVal !== 0 && !isNaN(amountVal)) {
          // 如果提供了金額欄位，使用其絕對值（因為買入時可能是負數）
          finalAmount = Math.abs(amountVal);
        } else {
          // 如果沒有提供金額欄位，則計算：價格 × 數量 + 手續費
          finalAmount = priceVal * quantityVal + feesVal;
        }
        
        transactions.push({
          id: uuidv4(),
          date: dateVal,
          ticker: tickerVal.toUpperCase(),
          market: market,
          type: type,
          price: priceVal,
          quantity: quantityVal,
          fees: feesVal,
          amount: finalAmount, // 使用提供的金額或計算值
          accountId: selectedAccountId,
          note: 'Batch Import'
        });
      });

      if (transactions.length === 0) {
        setErrorMsg('無法解析資料。請確認格式是否正確 (例如：日期, 買/賣, 代號, 價格, 數量...)');
      } else {
        setPreviewData(transactions);
      }

    } catch (err) {
      console.error('解析錯誤詳情:', err);
      console.error('輸入文字:', text);
      setErrorMsg(`解析發生錯誤：${err instanceof Error ? err.message : '未知錯誤'}。請檢查資料格式。`);
    }
  };

  const handleConfirm = () => {
    // 嚴格驗證帳戶
    if (accounts.length === 0) {
      alert("❌ 無法匯入：系統中沒有任何帳戶\n請先到「證券戶管理」頁面建立帳戶，然後再回來進行批次匯入。");
      return;
    }
    
    if (!selectedAccountId || selectedAccountId === '') {
      alert("❌ 無法匯入：請先選擇一個帳戶");
      return;
    }
    
    // 新增：檢查是否有資料
    if (previewData.length === 0) {
      if (activeTab === 'paste' && inputText.trim().length > 0) {
         alert("⚠️ 請先點擊「解析貼上內容」按鈕，確認表格預覽出現資料後，再按下確認匯入。");
      } else {
         alert("❌ 無法匯入：沒有資料。請貼上交易文字並解析，或上傳 CSV 檔案。");
      }
      return;
    }

    // 檢查選擇的帳戶是否真的存在
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    if (!selectedAccount) {
      alert("❌ 無法匯入：選擇的帳戶不存在");
      return;
    }
    
    const finalData = previewData.map(t => ({...t, accountId: selectedAccountId}));
    onImport(finalData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-4 flex justify-between items-center shrink-0">
          <h2 className="text-white font-bold text-lg">批次匯入交易 (Batch Import)</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          
          {/* Account Selection */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
             <label className="block text-sm font-bold text-slate-700 mb-2">1. 選擇匯入帳戶</label>
             
             {accounts.length === 0 ? (
               <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                 <p className="text-red-800 text-sm font-medium mb-2">
                   ⚠️ 無法進行批次匯入
                 </p>
                 <p className="text-red-700 text-sm">
                   系統中沒有任何帳戶，請先到「證券戶管理」頁面建立帳戶，然後再回來進行批次匯入。
                 </p>
               </div>
             ) : (
               <select 
                  value={selectedAccountId}
                  onChange={(e) => {
                    setSelectedAccountId(e.target.value);
                    setPreviewData(prev => prev.map(t => ({...t, accountId: e.target.value})));
                  }}
                  className="w-full md:w-1/2 border border-slate-300 rounded p-2"
               >
                 <option value="">-- 請選擇帳戶 --</option>
                 {accounts.map(a => (
                   <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                 ))}
               </select>
             )}
          </div>

          {/* Tabs */}
          <div>
            <div className="flex border-b border-slate-200 mb-4">
              <button 
                onClick={() => setActiveTab('paste')}
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'paste' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                直接貼上文字 (Paste)
              </button>
              <button 
                onClick={() => setActiveTab('file')}
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'file' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                上傳 CSV 檔案 (Upload)
              </button>
            </div>

            {activeTab === 'paste' ? (
              <div className="space-y-3">
                <label className="block text-sm text-slate-600">
                  請將 Excel 或表格資料複製貼上於此 (支援格式: 日期 | 買/賣/股息 | 代號 | 價格 | 數量 | 手續費 | 總金額)
                  <br />
                  <span className="text-xs text-slate-500">💡 如果提供總金額欄位，將直接使用該金額；否則自動計算 (價格×數量+手續費)</span>
                </label>
                <textarea 
                  className="w-full h-40 border border-slate-300 rounded-lg p-3 font-mono text-xs focus:ring-2 focus:ring-accent outline-none"
                  placeholder={`2022/3/30	買	VT	103.23	1.00	0.00\n2022/6/27	股息	VT	87.42	1.41	0.00`}
                  value={inputText}
                  onChange={handleTextChange}
                />
                <button 
                  onClick={handleParseText}
                  disabled={!inputText.trim()}
                  className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 disabled:opacity-50 text-sm"
                >
                  解析貼上內容
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm text-slate-600">支援嘉信 (Charles Schwab) CSV 匯出檔</label>
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
              {errorMsg}
            </div>
          )}

          {/* Preview Table */}
          {previewData.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-800 mb-3 flex justify-between items-center">
                預覽匯入資料 ({previewData.length} 筆)
                <span className="text-xs font-normal text-slate-500">請確認資料無誤後再匯入</span>
              </h3>
              <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Action</th>
                      <th className="px-4 py-2">Market</th>
                      <th className="px-4 py-2">Symbol</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-right">Price</th>
                      <th className="px-4 py-2 text-right">Fees</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-2 whitespace-nowrap">{row.date}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                           <span className={`px-2 py-0.5 rounded text-xs ${
                             row.type === TransactionType.BUY ? 'bg-red-100 text-red-700' : 
                             row.type === TransactionType.SELL ? 'bg-green-100 text-green-700' :
                             row.type === TransactionType.TRANSFER_IN ? 'bg-blue-100 text-blue-700' :
                             row.type === TransactionType.TRANSFER_OUT ? 'bg-orange-100 text-orange-700' :
                             'bg-yellow-100 text-yellow-700'
                           }`}>
                             {row.type}
                           </span>
                        </td>
                        <td className="px-4 py-2">
                           <span className={`px-2 py-0.5 rounded text-xs font-bold ${row.market === Market.TW ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                             {row.market}
                           </span>
                        </td>
                        <td className="px-4 py-2 font-mono">{row.ticker}</td>
                        <td className="px-4 py-2 text-right font-mono">{row.quantity}</td>
                        <td className="px-4 py-2 text-right font-mono">{row.price.toFixed(2)}</td>
                         <td className="px-4 py-2 text-right text-slate-400">{row.fees}</td>
                         <td className="px-4 py-2 text-right font-mono font-semibold text-slate-800">
                           {(row as any).amount ? ((row as any).amount % 1 === 0 ? Math.abs((row as any).amount).toString() : Math.abs((row as any).amount).toFixed(2)) : '-'}
                         </td>
                       </tr>
                     ))}
                    </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition"
          >
            取消
          </button>
          <button 
            onClick={handleConfirm}
            // 移除 disabled，讓使用者可以點擊並獲得錯誤提示
            className={`px-6 py-2 rounded-lg transition shadow-lg text-white ${
               (previewData.length > 0 && accounts.length > 0 && selectedAccountId)
               ? 'bg-slate-900 hover:bg-slate-800'
               : 'bg-slate-400'
            }`}
            title={
              accounts.length === 0 ? "沒有帳戶，無法匯入" :
              !selectedAccountId ? "請先選擇帳戶" :
              previewData.length === 0 ? "請先解析資料" : 
              `匯入 ${previewData.length} 筆交易到 ${accounts.find(a => a.id === selectedAccountId)?.name}`
            }
          >
            確認匯入 {previewData.length > 0 ? `(${previewData.length} 筆)` : ''}
          </button>
        </div>

      </div>
    </div>
  );
};

export default BatchImportModal;
    