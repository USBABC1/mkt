import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZodError } from 'zod';

// Importando nossos novos módulos de rotas
import authRoutes from './routes/auth.routes';
import landingPageRoutes from './routes/landingpage.routes';
// Futuramente: import campaignRoutes from './routes/campaign.routes';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- MIDDLEWARES GLOBAIS ---
// Habilita CORS para permitir requisições do seu frontend
app.use(cors()); 
// Habilita o parsing de corpos de requisição em JSON com um limite de tamanho
app.use(express.json({ limit: "10mb" }));
// Habilita o parsing de corpos de requisição URL-encoded
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
// Middleware para servir arquivos estáticos (build do React/Vite)
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- REGISTRO DAS ROTAS MODULARES ---
// Todas as rotas serão prefixadas com /api
app.use('/api', authRoutes);
app.use('/api', landingPageRoutes);
// Futuramente: app.use('/api', campaignRoutes);


// --- ROTA "CATCH-ALL" ---
// Deve vir DEPOIS das rotas da API.
// Se nenhuma rota da API corresponder, serve o index.html do frontend.
// Isso permite que o React Router controle a navegação.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});


// --- MIDDLEWARES DE TRATAMENTO DE ERRO ---
// Devem ser os ÚLTIMOS a serem registrados com app.use()
const handleZodError: ErrorRequestHandler = (err, req, res, next) => {
    if (err instanceof ZodError) {
        return res.status(400).json({ error: "Erro de validação.", details: err.errors });
    }
    next(err);
};

const handleError: ErrorRequestHandler = (err, req, res, next) => {
    console.error(err); // Logar o erro no servidor é crucial para depuração
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
