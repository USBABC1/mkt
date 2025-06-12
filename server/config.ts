// server/config.ts
import path from 'path';
import { fileURLToPath } from 'node:url';

export const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-super-segura-para-jwt';
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const PORT = process.env.PORT || 5000;
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
export const APP_BASE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

// ✅ INÍCIO DA CORREÇÃO: Constantes de Caminho Absoluto
const __filename = fileURLToPath(import.meta.url);
// __dirname para o arquivo atual (seja em /server ou /dist)
const __dirname = path.dirname(__filename);
// Resolve o caminho para o diretório raiz do projeto (um nível acima)
export const PROJECT_ROOT = path.resolve(__dirname, '..');
export const UPLOADS_DIR_NAME = 'uploads';
export const UPLOADS_PATH = path.join(PROJECT_ROOT, UPLOADS_DIR_NAME);
// ✅ FIM DA CORREÇÃO
