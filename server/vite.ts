import type { Express } from "express";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer } from "http";

export const log = (msg: string, ctx: string) => {
    console.log(`${new Date().toLocaleTimeString()} [${ctx}] ${msg}`);
};

export async function setupVite(app: Express, server: import('http').Server) {
    const { createViteServer } = await import('vite');
    const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
    });
    app.use(vite.middlewares);
}

/**
 * ✅ CORREÇÃO FINAL: Configuração robusta para servir uma Single-Page Application (SPA).
 * Esta função garante que todos os ficheiros estáticos (CSS, JS, imagens) sejam servidos
 * corretamente e que o index.html seja enviado para todas as outras rotas,
 * permitindo que o roteamento do React funcione em produção.
 */
export function serveStatic(app: Express) {
    const frontendPath = path.resolve(process.cwd(), "dist/public");
    log(`[StaticServing] Servindo assets do frontend de: ${frontendPath}`, 'serveStatic');
    
    // 1. Serve todos os ficheiros estáticos (com os seus MIME types corretos)
    // a partir da pasta de build do frontend.
    app.use(express.static(frontendPath));

    // 2. Fallback para a SPA: Para qualquer outra rota GET que não seja uma API,
    // envia o ficheiro principal index.html.
    // Isto permite que o React Router (wouter) assuma o controlo no navegador.
    app.get(/^(?!\/api).*/, (req, res) => {
        const indexPath = path.resolve(frontendPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            // Esta mensagem aparecerá se o build falhar em criar o index.html
            res.status(404).send('Ficheiro principal da aplicação (index.html) não foi encontrado no servidor.');
        }
    });
}
