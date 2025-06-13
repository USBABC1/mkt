// server/vite.ts
import { type ViteDevServer, createServer as createViteServer } from "vite";
import type { Express } from "express";
import { type Server as HttpServer } from "http";
import path from 'path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function log(message: string, context?: string) {
  const timestamp = new Date().toLocaleTimeString("pt-BR", { hour12: false });
  console.log(`${timestamp} [${context || 'server-vite'}] ${message}`);
}

export async function setupVite(app: Express, httpServer: HttpServer) {
  log('Configurando Vite Dev Server...', 'setupVite');
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      hmr: { server: httpServer }
    },
    appType: "spa",
    root: path.resolve(__dirname, "..", "client"),
  });

  app.use(vite.middlewares);
  log('Vite Dev Server configurado e middleware adicionado.', 'setupVite');
  
  app.use('*', async (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    try {
      const url = req.originalUrl;
      let template = await vite.transformIndexHtml(url, fs.readFileSync(path.resolve(path.resolve(__dirname, "..", "client"), 'index.html'), 'utf-8'));
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      if (e instanceof Error) {
         vite.ssrFixStacktrace(e);
         log(`Erro no middleware SPA fallback do Vite: ${e.message}`, 'setupVite-error');
         next(e);
      } else {
         log(`Erro desconhecido no middleware SPA fallback do Vite`, 'setupVite-error');
         next(new Error('Erro desconhecido no processamento da requisição SPA.'));
      }
    }
  });
  log('Middleware SPA fallback do Vite configurado.', 'setupVite');
}

export function serveStatic(app: Express) {
  const clientDistPath = path.resolve(__dirname, "..", "dist", "public");
  log(`[StaticServing] Servindo assets do frontend de: ${clientDistPath}`, 'serveStatic');
  
  app.use(express.static(clientDistPath));

  app.get("*", (req, res, next) => {
    // ✅ CORREÇÃO: Ignora rotas de API e de uploads no fallback
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) {
        return next();
    }
    // Mantém a regra para não aplicar a arquivos com extensão
    if (req.originalUrl.includes('.')) {
        return next();
    }
    log(`[SPA Fallback] Servindo index.html para ${req.originalUrl}`, 'serveStatic');
    res.sendFile(path.resolve(clientDistPath, "index.html"));
  });
}
