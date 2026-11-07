import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 內容安全政策（CSP）：GitHub Pages 無法設定 HTTP 標頭，改用 meta。
// 只在正式建置注入（開發模式的 HMR 需要 inline script / websocket）。
// connect-src 只放行使用者可選的兩家 AI 服務，即使日後有 XSS 也無法把金鑰送到其他網域。
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' https://generativelanguage.googleapis.com https://openrouter.ai",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const cspPlugin = () => ({
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="no-referrer" />`
    ),
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cspPlugin()],
  base: '/ask5/',
  build: {
    rollupOptions: {
      output: {
        // 將大型第三方套件拆開，改善首次載入與快取
        manualChunks: {
          iztro: ['iztro'],
          astronomy: ['astronomy-engine'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})
