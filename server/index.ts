import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZodError } from 'zod';

// Importando TODOS os nossos módulos de rotas
import authRoutes from './routes/auth.routes';
import landingPageRoutes from './routes/landingpage.routes';
import campaignRoutes from './routes/campaign.routes';
import assetRoutes from './routes/asset.routes';
import chatRoutes from './routes/chat.routes';         // <-- NOVO
import whatsappRoutes from './routes/whatsapp.routes'; // <-- NOVO
import coreRoutes from './routes/core.routes';         // <-- NOVO

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- MIDDLEWARES GLOBAIS ---
app.use(cors()); 
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- REGISTRO DAS ROTAS MODULARES ---
// A ordem aqui não importa funcionalmente, mas é bom manter organizado.
app.use('/api', authRoutes);
app.use('/api', coreRoutes);          // <-- NOVO
app.use('/api', campaignRoutes);
app.use('/api', landingPageRoutes);
app.use('/api', assetRoutes);
app.use('/api', chatRoutes);          // <-- NOVO
app.use('/api', whatsappRoutes);      // <-- NOVO

// --- ROTA "CATCH-ALL" ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
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
