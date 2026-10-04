import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/public': path.resolve(__dirname, './public'),
    },
  },
  server: {
    port: 3000,
    open: true,
    host: true,
    // Proxy /api/* to the gateway. Keeps API calls same-origin from the
    // browser's point of view so Playwright's `page.route('**/api/...')`
    // intercepts them and CORS preflights never fire.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: false,
        ws: false,
      },
    },
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          utils: ['axios', 'date-fns', 'zod', 'zustand'],
        },
      },
    },
  },
});