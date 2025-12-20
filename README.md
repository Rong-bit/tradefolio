<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# TradeFolio - 台美股資產管理系統

這是一個支援台股與美股的資產管理工具，協助投資人追蹤資產變化、計算報酬率並管理資金流向。

## 本地運行

**前置需求：** Node.js (建議 v18 或更高版本)

### 重要提示

⚠️ **請勿直接打開 `index.html` 文件！** 這會導致 MIME 類型錯誤。

### 正確的運行方式

1. 安裝依賴：
   ```bash
   npm install
   ```

2. 設置環境變數（可選）：
   - 創建 `.env.local` 文件
   - 設置 `GEMINI_API_KEY` 為您的 Gemini API 密鑰（用於 AI 功能）

3. 啟動開發伺服器：
   ```bash
   npm run dev
   ```

4. 在瀏覽器中打開顯示的 URL（通常是 `http://localhost:5173`）

### 構建生產版本

```bash
npm run build
```

構建完成後，文件會輸出到 `dist` 目錄。您可以使用 `npm run preview` 來預覽構建結果：

```bash
npm run preview
```

## 故障排除

### MIME 類型錯誤

如果看到 "Expected a JavaScript-or-Wasm module script but the server responded with a MIME type" 錯誤：

1. **確保使用開發伺服器**：不要直接打開 HTML 文件，而是運行 `npm run dev`
2. **檢查是否安裝了依賴**：運行 `npm install` 確保所有依賴已安裝
3. **清除快取**：刪除 `node_modules` 和 `dist` 目錄，然後重新運行 `npm install`

## 功能特點

- 📊 投資組合儀表板
- 💰 資金管理（匯入/匯出/轉帳）
- 📈 交易記錄管理
- 🏦 多帳戶支援
- 📱 響應式設計（支援電腦與手機）
- 🌐 多語言支援（繁體中文/英文）
- 🤖 AI 投資顧問（需要 API Key）

## 部署

本項目使用 GitHub Actions 自動部署到 GitHub Pages。推送代碼到 `main` 分支會自動觸發構建和部署。
