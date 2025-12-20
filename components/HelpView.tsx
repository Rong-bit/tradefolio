
import React, { useRef, useState } from 'react';
import { Language, t, translate } from '../utils/i18n';

interface Props {
  onExport: () => void;
  onImport: (file: File) => void;
  authorizedUsers: string[]; 
  currentUser: string;
  language: Language;
}

const HelpView: React.FC<Props> = ({ 
  onExport, 
  onImport, 
  authorizedUsers,
  currentUser,
  language
}) => {
  const translations = t(language);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for custom confirmation modals
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
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

  // Helper to mask email for privacy
  const maskEmail = (email: string) => {
    try {
      const atIndex = email.indexOf('@');
      if (atIndex === -1) return email;
      
      const domain = email.substring(atIndex);
      const name = email.substring(0, atIndex);
      
      // 處理短帳號
      if (name.length <= 2) {
        return name[0] + '****' + domain;
      }
      
      // 保留前3碼
      return name.substring(0, 3) + '****' + domain;
    } catch (e) {
      return email;
    }
  };

  const content = translations.help.documentationContent;

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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 1.79 4 4 4h9v-9h-9v-5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7V4h16v3M9 21v-9h6v9" />
          </svg>
          {translations.help.dataManagement}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-4 rounded border border-slate-200">
                <h4 className="font-bold text-slate-700 mb-2">{translations.help.export}</h4>
                <p className="text-sm text-slate-500 mb-4">
                    {translations.help.exportDesc}
                </p>
                <button 
                  type="button"
                  onClick={onExport}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition shadow flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    {translations.help.downloadBackup}
                </button>
            </div>

            <div className="bg-slate-50 p-4 rounded border border-slate-200">
                <h4 className="font-bold text-slate-700 mb-2">{translations.help.import}</h4>
                <p className="text-sm text-red-500 mb-4">
                    {translations.help.importWarning}
                </p>
                <div className="flex gap-2">
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        accept=".json"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-2 px-4 rounded border border-slate-300 transition shadow-sm flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        {translations.help.uploadBackup}
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Authorized Users Section */}
      <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
         <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            {translations.help.authorizedUsers}
         </h3>
         
         <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
             <p className="text-sm text-slate-600 mb-4">{translations.help.authorizedUsersDesc}</p>
             <div className="overflow-x-auto">
                 <table className="min-w-full text-sm">
                     <thead>
                         <tr className="bg-slate-100 text-slate-500 uppercase">
                             <th className="px-4 py-2 text-left">{translations.help.emailAccount}</th>
                             <th className="px-4 py-2 text-right">{translations.help.status}</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {authorizedUsers.map(email => (
                             <tr key={email}>
                                 <td className="px-4 py-3 font-mono text-slate-700">
                                     {maskEmail(email)} 
                                     {currentUser === email && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{language === 'zh-TW' ? '您' : 'You'}</span>}
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                     <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs font-medium">{translations.help.systemAuthorized}</span>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         </div>
      </div>

      {/* Contact Section */}
      <div className="bg-white p-6 rounded-lg shadow border-l-4 border-amber-500">
         <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {translations.help.contact}
         </h3>
         <div className="text-sm text-slate-700 leading-relaxed bg-amber-50 p-4 rounded border border-amber-100">
             <p className="mb-2 font-bold">{translations.help.contactTitle}</p>
             <p className="mb-4">
                 {translations.help.contactDesc}
             </p>
             <a 
               href="mailto:hjr640511@gmail.com"
               className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded shadow transition"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                   <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                   <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                {translations.help.contactEmail}
             </a>
         </div>
      </div>

      {/* Help Content */}
      <div className="bg-white p-6 rounded-lg shadow border-l-4 border-slate-500">
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {translations.help.documentation}
              </h3>
              <div className="flex gap-2">
                  <button onClick={handleCopy} className="text-sm px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition">
                      {copyFeedback ? translations.help.copied : translations.help.copyAll}
                  </button>
                  <button onClick={handlePrint} className="text-sm px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition">
                      {translations.help.print}
                  </button>
              </div>
          </div>
          <div className="prose prose-sm max-w-none text-slate-600 bg-slate-50 p-6 rounded-lg border border-slate-200 whitespace-pre-line">
              {content}
          </div>
      </div>

      {/* Import Confirmation Modal */}
      {pendingImportFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
              <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
                  <h3 className="text-lg font-bold mb-2 text-red-600">
                      {translations.help.confirmImport}
                  </h3>
                  <p className="text-slate-600 mb-6">
                      {translate('help.confirmImportMessage', language, { fileName: pendingImportFile.name })}<br/>
                      {translations.help.confirmImportWarning}
                  </p>
                  <div className="flex justify-center gap-4">
                      <button onClick={cancelImport} className="bg-slate-200 text-slate-800 px-4 py-2 rounded hover:bg-slate-300">
                          {language === 'zh-TW' ? '取消' : 'Cancel'}
                      </button>
                      <button onClick={confirmImport} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 shadow">
                          {translations.help.confirmOverride}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default HelpView;

