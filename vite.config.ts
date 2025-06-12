import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command, mode }) => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const plugins = [
    react(),
    tailwindcss(), // Não precisamos mais do caminho explícito aqui
  ];

  if (mode !== "production" && process.env.REPL_ID) {
    import("@replit/vite-plugin-cartographer")
      .then(module => {
        if (module && module.cartographer) {
          plugins.push(module.cartographer());
        } else {
          console.warn("@replit/vite-plugin-cartographer could not be loaded as expected.");
        }
      })
      .catch(e => console.warn("@replit/vite-plugin-cartographer not found or failed to load, skipping.", e));
  }
  
  return {
    plugins: plugins,
    define: {
      'import.meta.env.VITE_FORCE_AUTH_BYPASS': JSON.stringify(process.env.VITE_FORCE_AUTH_BYPASS || process.env.FORCE_AUTH_BYPASS || 'false'),
      'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || process.env.APP_BASE_URL || ''),
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"), 
        "@/types": path.resolve(__dirname, "client", "src", "types"),
        "@/components/flow": path.resolve(__dirname, "client", "src", "components", "flow"),
      },
    },
    // A diretiva 'root' foi removida
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true, 
      // ✅ CORREÇÃO: Especificamos o ponto de entrada (index.html)
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'client', 'index.html'),
        },
      },
    },
    optimizeDeps: {
      include: [
        '@grapesjs/studio', 
        '@xyflow/react', 
        'jspdf', 
        'jspdf-autotable',
      ],
    },
    server: { 
      port: 3000, 
      host: '0.0.0.0',
      allowedHosts: [
        'localhost', '127.0.0.1', '0.0.0.0',
        'work-1-cixzsejsspdqlyvw.prod-runtime.all-hands.dev',
        'work-2-cixzsejsspdqlyvw.prod-runtime.all-hands.dev',
        '.all-hands.dev', '.prod-runtime.all-hands.dev'
      ],
    },
  };
});
