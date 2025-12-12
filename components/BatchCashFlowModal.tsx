
import React, { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Account, CashFlow, CashFlowType } from '../types';

interface Props {
  accounts: Account[];
  onImport: (flows: CashFlow[]) => void;
  onClose: () => void;
}

const BatchCashFlowModal: React.FC<Props> = ({ accounts, onImport, onClose }) => {
  const [step, setStep] = useState<1 | 2>(1); // 1: Paste & Parse, 2: Map Accounts & Preview
  const [inputText, setInputText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [accountMapping, setAccountMapping] = useState<Record<string, string>>({});
  const [detectedAccountNames, setDetectedAccountNames] = useState<string[]>([]);

  // Helper to parse currency string "NT$30,000" -> 30000
  const parseNumber = (str: string) => {
    if (!str) return 0;
    // Remove NT$, $, commas, spaces
    const cleanStr = str.replace(/[NT$$,\s]/g, '');
    return parseFloat(cleanStr) || 0;
  };

  const parseDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
      return date.toISOString().split('T')[0];
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  };

  const handleParse = () => {
    const lines = inputText.split('\n');
    const rows: any[] = [];
    const foundAccounts = new Set<string>();

    lines.forEach(line => {
      if (!line.trim()) return;
      
      // Use single tab split to preserve empty columns (critical for fixed structure)
      // Format: Date | TWD | USD | Rate | Fee | Total | Account | Category
      // Index:   0   |  1  |  2  |  3   |  4  |   5   |    6    |    7
      const cols = line.replace(/\r/g, '').split('\t');
      
      // Skip header row or malformed lines
      if (cols.length < 3 || cols[0].includes('日期')) return;

      const dateStr = cols[0];
      
      // Account is at index 6 based on your data
      const accountName = cols[6] ? cols[6].trim() : ''; 
      // Category is at index 7 based on your data
      const categoryStr = cols[7] ? cols[7].trim() : '';

      const rawTwd = cols[1];
      const rawUsd = cols[2];
      const rawFee = cols[4];
      const rawTotal = cols[5];
      
      let amount = 0;
      let amountTWD = 0; // Store exact TWD amount if available
      let isUSD = false;
      
      const valUsd = Math.abs(parseNumber(rawUsd));
      const valTwd = Math.abs(parseNumber(rawTwd));
      const valFee = Math.abs(parseNumber(rawFee));
      const valTotal = Math.abs(parseNumber(rawTotal));

      if (valUsd > 0) {
        // It's a USD transaction
        amount = valUsd;
        isUSD = true;
        
        // Strategy for amountTWD (Cost Basis in TWD):
        // 1. If 'Total' column exists and is large (likely TWD), use it. It usually includes fees.
        // 2. Else if 'TWD' column exists, use it + Fee.
        
        if (valTotal > 0 && Math.abs(valTotal - valUsd) > valUsd) { 
            // Heuristic: If Total is significantly different from USD amount, it's likely the TWD total
            amountTWD = valTotal;
        } else if (valTwd > 0) {
            // If explicit Total missing, sum TWD principal + Fee
            amountTWD = valTwd + valFee;
        }
      } else {
        // It's a TWD transaction
        // Use Total if available (as it includes fee), otherwise TWD val + fee
        if (valTotal > 0) {
           amount = valTotal;
        } else {
           amount = valTwd + valFee;
        }
      }
      
      // Fallback
      if (amount === 0 && valTotal > 0) {
         amount = valTotal;
      }

      // Determine Type
      let type = CashFlowType.DEPOSIT;
      if (categoryStr.includes('轉出') || categoryStr.includes('匯出')) type = CashFlowType.WITHDRAW;
      else if (categoryStr.includes('轉入') || categoryStr.includes('匯入')) type = CashFlowType.DEPOSIT;
      else if (categoryStr.includes('利息')) type = CashFlowType.INTEREST;
      else if (categoryStr.includes('轉帳')) type = CashFlowType.TRANSFER;
      
      // Extract Exchange Rate (Col 3)
      const exRate = parseNumber(cols[3]);
      
      let note = categoryStr;

      if (dateStr && (amount >= 0 || valFee >= 0) && accountName) {
        rows.push({
          tempId: uuidv4(),
          date: parseDate(dateStr),
          amount,
          amountTWD: amountTWD > 0 ? amountTWD : undefined, 
          originalAccountName: accountName.trim(),
          type,
          isUSD,
          exchangeRate: exRate > 0 ? exRate : undefined,
          note: note,
          fee: valFee > 0 ? valFee : undefined
        });
        foundAccounts.add(accountName.trim());
      }
    });

    if (rows.length > 0) {
      setDetectedAccountNames(Array.from(foundAccounts));
      
      // Auto-map if names match exactly
      const initialMapping: Record<string, string> = {};
      foundAccounts.forEach(name => {
        const match = accounts.find(a => a.name === name || a.name.includes(name));
        if (match) initialMapping[name] = match.id;
        else initialMapping[name] = ''; // Pending
      });
      setAccountMapping(initialMapping);
      setParsedRows(rows);
      setStep(2);
    } else {
      alert('無法解析資料，請確認格式是否為 Tab 分隔 (直接從 Excel 複製)。');
    }
  };

  const handleImportConfirm = () => {
    // Validation: All accounts must be mapped
    const unmapped = detectedAccountNames.filter(name => !accountMapping[name]);
    if (unmapped.length > 0) {
      alert(`請先設定以下帳戶的對應關係：\n${unmapped.join(', ')}`);
      return;
    }

    const finalFlows: CashFlow[] = parsedRows.map(row => ({
      id: uuidv4(),
      date: row.date,
      type: row.type,
      amount: row.amount,
      amountTWD: row.amountTWD, // Include in final object
      fee: row.fee, // Include fee
      accountId: accountMapping[row.originalAccountName],
      exchangeRate: row.exchangeRate,
      note: row.note
    }));

    onImport(finalFlows);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        <div className="bg-slate-900 p-4 flex justify-between items-center shrink-0">
          <h2 className="text-white font-bold text-lg">批次匯入資金 (Batch Cash Flow)</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 border border-blue-200">
                <p className="font-bold mb-1">使用說明：</p>
                <p>請直接從 Excel 複製包含「日期、台幣、美元、匯率、手續費、總計、帳戶、類別」的資料並貼上。</p>
                <p className="mt-1 text-xs opacity-75 font-mono bg-blue-100 p-1 rounded inline-block">
                  日期 | 台幣 | 美元 | 匯率 | 手續費 | 總計 | 帳戶 | 類別
                </p>
              </div>
              <textarea 
                className="w-full h-96 border border-slate-300 rounded-lg p-4 font-mono text-xs focus:ring-2 focus:ring-accent outline-none whitespace-pre overflow-auto"
                placeholder={`2025/12/1\tNT$30,000\t\t\t\t-NT$30,000\t國泰\t轉入資金\n2025/9/16\t1300000\t$45,410.72\t28.628\t950\t1300950\t嘉信\t匯入資金`}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* Account Mapping Section */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-3 text-sm">1. 帳戶名稱對應 (Account Mapping)</h3>
                <p className="text-xs text-slate-500 mb-4">請將「檔案中的帳戶名稱」對應到您「系統中的證券戶」。</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {detectedAccountNames.map(name => (
                    <div key={name} className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-500">檔案名稱: <span className="text-slate-800">{name}</span></label>
                      <select 
                        className={`text-sm border rounded p-2 ${!accountMapping[name] ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                        value={accountMapping[name] || ''}
                        onChange={e => setAccountMapping(prev => ({...prev, [name]: e.target.value}))}
                      >
                        <option value="">-- 請選擇對應帳戶 --</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview Table */}
              <div>
                <h3 className="font-bold text-slate-800 mb-3 text-sm">2. 資料預覽 ({parsedRows.length} 筆)</h3>
                <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                  <table className="min-w-full text-sm text-left">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-2">日期</th>
                        <th className="px-4 py-2">類別</th>
                        <th className="px-4 py-2 text-right">金額 (USD/TWD)</th>
                        <th className="px-4 py-2 text-right">手續費</th>
                        <th className="px-4 py-2 text-right">實際台幣成本</th>
                        <th className="px-4 py-2">檔案帳戶</th>
                        <th className="px-4 py-2">對應系統帳戶</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-2 whitespace-nowrap">{row.date}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold 
                              ${row.type === CashFlowType.DEPOSIT || row.type === CashFlowType.INTEREST ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {row.note.split(' ')[0]} {/* Show original category name */}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono">
                            {row.isUSD ? '$' : 'NT$'}{row.amount.toLocaleString()}
                            {row.exchangeRate && <span className="block text-[10px] text-slate-400">Ex: {row.exchangeRate}</span>}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-slate-500">
                             {row.fee ? row.fee : '-'}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-emerald-700 font-bold">
                            {row.amountTWD ? `NT$${row.amountTWD.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-4 py-2 text-slate-500">{row.originalAccountName}</td>
                          <td className="px-4 py-2 font-medium text-slate-700">
                            {accounts.find(a => a.id === accountMapping[row.originalAccountName])?.name || <span className="text-red-500">未對應</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition">取消</button>
          {step === 1 ? (
            <button onClick={handleParse} disabled={!inputText.trim()} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition shadow-lg">解析資料</button>
          ) : (
            <button onClick={handleImportConfirm} className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition shadow-lg">確認匯入</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchCashFlowModal;
