// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'node:url';

export default defineConfig(({ command, mode }) => {
  const plugins = [
    react(),
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
  
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  
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
    root: path.resolve(__dirname, "client"),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
      // Remove the external configuration - let Vite handle bundling
      rollupOptions: {
        output: {
          manualChunks: {
            // Split large dependencies into separate chunks
            'grapesjs': ['@grapesjs/studio-sdk'],
            'grapesjs-plugins': ['@grapesjs/studio-sdk-plugins'],
          }
        }
      },
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
    // Help Vite handle the GrapesJS and Hono packages
    optimizeDeps: {
      include: [
        '@grapesjs/studio-sdk',
        '@grapesjs/studio-sdk-plugins',
        'hono/client' 
        'class-variance-authority'
      ],
    },
  };
});
