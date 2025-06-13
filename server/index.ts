import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZodError } from 'zod';

// Importando nossos módulos de rotas
import authRoutes from './routes/auth.routes';
import landingPageRoutes from './routes/landingpage.routes';
import campaignRoutes from './routes/campaign.routes';
import assetRoutes from './routes/asset.routes';
import chatRoutes from './routes/chat.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import coreRoutes from './routes/core.routes';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// O caminho correto para a pasta 'public' que o Vite cria dentro de 'dist'
const publicPath = path.join(__dirname, 'public');

// --- MIDDLEWARES GLOBAIS ---
app.use(cors()); 
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 1. Servir todos os arquivos estáticos (CSS, JS, imagens) da pasta public
app.use(express.static(publicPath));

// 2. REGISTRO DAS ROTAS DA API
// Todas as requisições para /api/... serão tratadas pelos nossos roteadores
app.use('/api', authRoutes);
app.use('/api', coreRoutes);
app.use('/api', campaignRoutes);
app.use('/api', landingPageRoutes);
app.use('/api', assetRoutes);
app.use('/api', chatRoutes);
app.use('/api', whatsappRoutes);


// 3. ROTA "CATCH-ALL" PARA O APP REACT
// Qualquer outra requisição GET que não seja para um arquivo estático ou para a API,
// deve servir o index.html principal. Isso permite que o React Router funcione.
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});


// --- MIDDLEWARES DE TRATAMENTO DE ERRO ---
const handleZodError: ErrorRequestHandler = (err, req, res, next) => {
    if (err instanceof ZodError) {
        return res.status(400).json({ error: "Erro de validação.", details: err.errors });
    }
    next(err);
};

const handleError: ErrorRequestHandler = (err, req, res, next) => {
    console.error(err);
    const statusCode = err.statusCode || 500;
    const message = err.message || "Erro interno do servidor.";
    res.status(statusCode).json({ error: message });
};

app.use(handleZodError);
app.use(handleError);


// --- INICIALIZAÇÃO DO SERVIDOR ---
const port = process.env.PORT || 4001;
app.listen(port, () => {
  console.log(`Servidor Express modular rodando na porta ${port}`);
});
