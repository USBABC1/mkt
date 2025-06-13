import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { RouterSetup } from "./routes";
import { setupVite, log as serverLog } from "./vite"; // A função serveStatic foi removida daqui
import path from 'path';
import fs from 'fs';
import { UPLOADS_DIR_NAME, UPLOADS_PATH } from "./config";
import { startCronJobs } from "./services/cron.service";

const app = express();

// Garante que o diretório de uploads exista
if (!fs.existsSync(UPLOADS_PATH)) {
    fs.mkdirSync(UPLOADS_PATH, { recursive: true });
}

// Middlewares para JSON, uploads e logs (mantenha os seus existentes)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(`/${UPLOADS_DIR_NAME}`, express.static(UPLOADS_PATH));

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      const duration = Date.now() - start;
      serverLog(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`, 'api-server');
    }
  });
  next();
});

(async () => {
  try {
    // 1. Regista as rotas da API primeiro (qualquer coisa que comece com /api)
    const server = await RouterSetup.registerRoutes(app);

    // 2. Configura o servidor dependendo do ambiente
    if (process.env.NODE_ENV === "development") {
      serverLog(`[ViteDev] Configurando Vite em modo de desenvolvimento...`, 'server-init');
      await setupVite(app, server);
    } else {
      // --- CONFIGURAÇÃO PARA PRODUÇÃO ---
      const frontendPath = path.resolve(process.cwd(), "dist/public");
      serverLog(`[StaticServing] Configurando para servir ficheiros estáticos de: ${frontendPath}`, 'server-init');

      // 2a. Serve todos os ficheiros estáticos (CSS, JS, imagens) da pasta de build.
      app.use(express.static(frontendPath));

      // 2b. Fallback para a SPA (Single-Page Application).
      // Esta rota "apanha-tudo" deve vir DEPOIS de todas as outras rotas (API e ficheiros estáticos).
      // Ela envia o index.html para qualquer rota que não tenha sido encontrada antes.
      app.get('*', (req, res) => {
        const indexPath = path.resolve(frontendPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).send('Ficheiro principal da aplicação (index.html) não foi encontrado no servidor.');
        }
      });
    }

    // Adiciona um gestor de erros global no final
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("[GLOBAL_ERROR_HANDLER] Erro capturado:", err.message);
      if (!res.headersSent) {
        res.status(err.statusCode || 500).json({ error: err.message || "Erro interno do servidor." });
      }
    });

    const port = process.env.PORT || 8000;
    server.listen({ port, host: "0.0.0.0" }, () => {
      serverLog(`Servidor HTTP iniciado e escutando na porta ${port} em modo ${process.env.NODE_ENV || 'development'}`, 'server-init');
      startCronJobs();
    });
  } catch (error) {
    console.error("Falha crítica ao iniciar o servidor:", error);
    process.exit(1);
  }
})();
