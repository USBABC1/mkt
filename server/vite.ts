// server/vite.ts
import type { Express } from "express";
import express from "express";
import path from "path";
import fs from "fs";

export const log = (msg: string, ctx: string) => {
    console.log(`${new Date().toLocaleTimeString()} [${ctx}] ${msg}`);
};

// Esta função não foi alterada, apenas incluída para contexto
export async function setupVite(app: Express, server: import('http').Server) {
    const { createViteServer } = await import('vite');
    const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
    });
    app.use(vite.middlewares);
}

/**
 * ✅ CORREÇÃO: A maneira como os ficheiros estáticos são servidos foi ajustada.
 * Esta configuração garante que o servidor saiba exatamente onde encontrar
 * a pasta 'assets' e como servir os seus ficheiros (CSS, JS) corretamente,
 * enquanto ainda serve o index.html para todas as outras rotas da aplicação.
 */
export function serveStatic(app: Express) {
    const frontendPath = path.resolve(process.cwd(), "dist/public");
    log(`[StaticServing] Servindo assets do frontend de: ${frontendPath}`, 'serveStatic');
    
    // Serve especificamente os ficheiros dentro da pasta /assets quando a URL pedir por /assets
    app.use('/assets', express.static(path.resolve(frontendPath, 'assets')));
    
    // Serve outros ficheiros estáticos da raiz (como favicon.ico, etc.)
    app.use(express.static(frontendPath));

    // Fallback para SPA: Para qualquer outra requisição que não seja um ficheiro, serve o index.html
    // Isso permite que o roteamento do React (wouter) funcione.
    app.get('*', (req, res) => {
        const indexPath = path.resolve(frontendPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).send('Página principal não encontrada.');
        }
    });
}
