 import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/admin': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        bypass: (req) => {
          // Bỏ qua proxy nếu là yêu cầu tải trang HTML (F5 / reload) hoặc truy cập trực tiếp route /admin
          if (
            req.headers.accept?.includes('text/html') ||
            req.url === '/admin' ||
            req.url === '/admin/'
          ) {
            return '/index.html';
          }
        },
      },
      '/conversation': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/session': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/documents': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
})
