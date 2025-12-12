
import React, { useRef, useState } from 'react';

interface Props {
  onExport: () => void;
  onImport: (file: File) => void;
  onMigrateLegacy: () => void;
  authorizedUsers: string[];
  onAddUser: (email: string) => void;
  onRemoveUser: (email: string) => void;
  currentUser: string;
}

const HelpView: React.FC<Props> = ({ 
  onExport, 
  onImport, 
  onMigrateLegacy,
  authorizedUsers,
  onAddUser,
  onRemoveUser,
  currentUser
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newEmail, setNewEmail] = useState('');
  
  // State for custom confirmation modals
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [pendingRemoveUser, setPendingRemoveUser] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingImportFile(file);
      // Reset input immediately so change event fires even if same file selected again later
      e.target.value = '';
    }
  };

  const confirmImport = () => {
    if (pendingImportFile) {
      onImport(pendingImportFile);
      setPendingImportFile(null);
    }
  };

  const cancelImport = () => {
    setPendingImportFile(null);
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    onAddUser(newEmail.trim());
    setNewEmail('');
  };

  const confirmRemoveUser = () => {
    if (pendingRemoveUser) {
      onRemoveUser(pendingRemoveUser);
      setPendingRemoveUser(null);
    }
  };

  // Admin check: The first user in the authorized list is considered the Admin
  const isAdmin = authorizedUsers.length > 0 && authorizedUsers[0] === currentUser;

  const content = `
# TradeFolio 使用說明書

## 1. 系統簡介
TradeFolio 是一個支援台股與美股的資產管理工具，協助投資人追蹤資產變化、計算報酬率並管理資金流向。

## 2. 快速開始
1. **建立帳戶**: 前往「證券戶管理」新增您的銀行或證券帳戶。
2. **匯入資金**: 前往「資金管理」，選擇「匯入資金」將薪資或存款記錄到系統中。
3. **新增交易**: 點擊右上角「記一筆」輸入股票買賣紀錄。
4. **查看報表**: 回到「儀表板」查看資產折線圖與績效。

## 3. 功能詳解

### 資金管理 (Fund Management)
* **匯入 (Import)**: 外部資金流入 (如薪資)。
* **匯出 (Export)**: 資金流出 (如生活費提領)。
* **轉帳 (Transfer)**: 不同帳戶間的資金移動 (如銀行轉證券戶)。
* **利息**: 記錄存款或證券戶利息。

### 交易類別
* **Buy/Sell**: 一般買賣。
* **Dividend**: 股票股息 (股數增加)。
* **Cash Dividend**: 現金股息 (餘額增加)。

## 4. 常見問題 (FAQ)
Q: 如何計算年化報酬率？
A: 系統採用資金加權報酬率概念，考慮資金進出的時間點進行估算。

Q: 匯率如何設定？
A: 可在右上角設定全域 USD/TWD 匯率，或在轉帳時指定當下匯率。

Q: 資料儲存在哪裡？
A: 所有資料儲存於您瀏覽器的 LocalStorage。為了避免資料遺失，建議定期使用下方的備份功能。
  `;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Data Management Section */}
      <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500">
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
          5. 系統資料管理 (Data Backup & Restore)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-700 mb-2">備份資料 (Export)</h4>
            <p className="text-sm text-slate-500 mb-4">將您所有的交易紀錄、帳戶設定與資金紀錄匯出成 JSON 檔案下載保存。</p>
            <button 
              onClick={onExport}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow flex items-center gap-2 transition w-full justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              下載備份檔 (.json)
            </button>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-700 mb-2">還原資料 (Import)</h4>
            <p className="text-sm text-slate-500 mb-4">選取先前備份的 JSON 檔案以還原資料。<span className="text-red-500 font-bold">注意：這將覆蓋目前的資料。</span></p>
            <input 
              type="file" 
              accept=".json"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded shadow-sm flex items-center gap-2 transition w-full justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              上傳備份檔
            </button>
          </div>
        </div>
      </div>

      {/* User Authorization Management Section (Admin Only) */}
      {isAdmin && (
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-slate-800">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            6. 使用者授權管理 (User Authorization)
          </h3>
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-600 mb-4">
              您是系統管理員。請在此管理可登入系統的 Email 白名單。<br/>
              <span className="text-xs text-slate-400">注意：名單中的第一位使用者預設為管理員。</span>
            </p>
            
            <form onSubmit={handleAddUserSubmit} className="flex gap-2 mb-6">
              <input 
                type="email" 
                placeholder="輸入 Email 信箱以新增授權..."
                className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                required
              />
              <button 
                type="submit" 
                className="bg-slate-800 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-700 whitespace-nowrap"
              >
                新增使用者
              </button>
            </form>

            <div className="overflow-hidden border border-slate-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-2 text-left">Email 帳號</th>
                    <th className="px-4 py-2 text-left">角色</th>
                    <th className="px-4 py-2 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {authorizedUsers.map((user, index) => (
                    <tr key={user}>
                      <td className="px-4 py-2 text-slate-800 font-medium">
                        {user}
                        {user === currentUser && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">You</span>}
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {index === 0 ? '管理員 (Admin)' : '使用者 (User)'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {user !== currentUser && (
                          <button 
                            onClick={() => setPendingRemoveUser(user)}
                            className="text-red-500 hover:text-red-700 hover:underline"
                          >
                            移除
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-lg shadow border border-slate-100">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-slate-800">使用說明書 (Manual)</h2>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="px-3 py-1 text-sm border rounded hover:bg-slate-50 flex items-center gap-1 transition-all">
              {copyFeedback ? (
                <span className="text-green-600 font-bold">已複製！</span>
              ) : (
                <span>複製內容</span>
              )}
            </button>
            <button onClick={handlePrint} className="px-3 py-1 text-sm bg-slate-900 text-white rounded hover:bg-slate-800">列印 PDF</button>
          </div>
        </div>
        <div className="prose prose-slate max-w-none whitespace-pre-line text-slate-700">
          {content}
        </div>
      </div>

      {/* Confirmation Modal for Import */}
      {pendingImportFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="mb-4 text-amber-600 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-bold">確認還原資料？</h3>
            </div>
            <p className="text-slate-600 mb-2">
              您即將從檔案 <strong>{pendingImportFile.name}</strong> 還原資料。
            </p>
            <p className="text-red-600 font-bold mb-6 text-sm bg-red-50 p-3 rounded border border-red-100">
              警告：此操作將會完全覆蓋目前的現有資料，且無法復原。
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={cancelImport}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded transition"
              >
                取消
              </button>
              <button 
                onClick={confirmImport}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition shadow-sm"
              >
                確認覆蓋並還原
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Remove User */}
      {pendingRemoveUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">確認移除權限</h3>
            <p className="text-slate-600 mb-6">
              您確定要移除 <strong>{pendingRemoveUser}</strong> 的登入權限嗎？
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setPendingRemoveUser(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded transition"
              >
                取消
              </button>
              <button 
                onClick={confirmRemoveUser}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition shadow-sm"
              >
                確認移除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpView;
