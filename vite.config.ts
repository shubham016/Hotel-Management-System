import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const railsProxy = {
  '/rails-api': {
    target: process.env.RAILS_API_URL || 'http://127.0.0.1:3001',
    changeOrigin: true,
    rewrite: (url: string) => url.replace(/^\/rails-api/, '')
  }
};

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    port: 3000,
    strictPort: true,
    proxy: railsProxy
  },
  preview: { port: 3000, strictPort: true, proxy: railsProxy }
});
