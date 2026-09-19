import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Pure React frontend for Spendora.
// Dev server proxies /api + auth routes to the existing Express backend (default port 3000).
// No backend logic lives here — this app only consumes the existing API.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      },
      '/auth': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      },
      '/login': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 4173
  }
});
