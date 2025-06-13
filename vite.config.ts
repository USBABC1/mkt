import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  // A raiz do código fonte do frontend continua a ser a pasta 'client'
  root: 'client',
  
  plugins: [react()],
  
  resolve: {
    // Aliases para facilitar as importações
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  
  server: {
    // Proxy para o backend em ambiente de desenvolvimento
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // ✅ CORREÇÃO FINAL: Garante que o diretório de saída seja sempre
    // relativo à raiz do projeto, e não à pasta 'client'.
    // Isto alinha o output do build com o que o servidor Express espera encontrar.
    outDir: path.resolve(__dirname, 'dist/public'),
    
    // Indica que o diretório de saída deve ser limpo antes de cada build.
    emptyOutDir: true,
  },
});
