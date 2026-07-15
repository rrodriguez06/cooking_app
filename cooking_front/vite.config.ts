import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    // Proxy dev vers le backend (evite de dependre de CORS en developpement)
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  // Purge des console.*/debugger dans les bundles de production
  // (filet de securite pour SEC-2 / ARCH-2 : aucun log ne fuit en prod).
  esbuild: {
    drop: ['console', 'debugger'],
  },
})
