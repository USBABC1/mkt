import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: './client', // Set client as root if that's where your index.html is
  publicDir: '../public', // Adjust path to public directory
  build: {
    outDir: '../dist/client', // Output to dist/client from root
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
})
