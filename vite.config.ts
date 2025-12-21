import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 載入環境變數 (包含 GitHub Secrets 注入的系統變數)
  // 第三個參數 '' 表示載入所有變數，不限制 VITE_ 前綴
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // 設定 base 為相對路徑 './'，確保在 GitHub Pages 子路徑能運作
    base: './',
    server: {
      // 確保正確的 MIME 類型
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8'
      },
      // 允許訪問
      cors: true
    },
    build: {
      target: 'esnext',
      // 確保構建時正確處理模組
      rollupOptions: {
        output: {
          // 確保模組格式正確
          format: 'es'
        }
      }
    },
    define: {
      // 這裡將編譯時的 process.env.API_KEY 替換為實際的環境變數值
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY),
      // 為了相容性保留 process.env (但避免覆蓋上面的 key)
      'process.env': process.env
    }
  }
})