import type { Express } from "express";

export const log = (msg: string, ctx: string) => {
    console.log(`${new Date().toLocaleTimeString()} [${ctx}] ${msg}`);
};

/**
 * Esta função configura o servidor de desenvolvimento do Vite, que serve o frontend
 * em tempo real com hot-reloading. Não é usada em produção.
 */
export async function setupVite(app: Express, server: import('http').Server) {
    const { createViteServer } = await import('vite');
    const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
    });
    app.use(vite.middlewares);
}
