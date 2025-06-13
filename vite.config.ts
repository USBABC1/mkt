import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Define um alias para a pasta /client/src, para que você possa usar "@/components/..."
      '@': path.resolve(__dirname, './client/src'),
      
      // ✅ CORREÇÃO: Adiciona um alias para a pasta 'shared'.
      // Isto permite que o código do frontend (em 'client/') importe
      // ficheiros da pasta 'shared/' usando '@shared/...', resolvendo o erro de build.
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    // Configura um proxy para as chamadas de API em ambiente de desenvolvimento.
    // Todas as chamadas para /api serão redirecionadas para o seu servidor backend na porta 8000.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Especifica o diretório de saída para os ficheiros de build.
    // Os ficheiros gerados irão para a pasta 'dist/public'.
    outDir: 'dist/public',
  },
  // Define o diretório raiz do projeto frontend.
  // Garante que o Vite procure os ficheiros a partir da pasta /client.
  root: 'client',
});
