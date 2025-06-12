import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            // @ts-ignore
            '@': path.resolve(__dirname, './client/src'),
        },
    },
    build: {
        outDir: 'dist/public',
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'client/index.html'),
            },
        },
    },
    server: {
        proxy: {
            '/api': 'http://localhost:3000',
        },
    },
});
