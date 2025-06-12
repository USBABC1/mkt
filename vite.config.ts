import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  build: {
    rollupOptions: {
      external: [
        // Add the problematic imports as externals
        '@grapesjs/studio-sdk-plugins/forms',
        '@grapesjs/studio-sdk-plugins/custom-code',
        '@grapesjs/studio-sdk-plugins/export',
        '@grapesjs/studio-sdk-plugins/tooltip',
        '@grapesjs/studio-sdk-plugins/avatars'
      ]
    }
  }
})
