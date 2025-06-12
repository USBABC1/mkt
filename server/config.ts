// server/config.ts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getEnv(varName: string, aDefault: string): string {
  const value = process.env[varName];
  return value ?? aDefault;
}

export const PORT = parseInt(getEnv('PORT', '3001'), 10);
export const JWT_SECRET = getEnv('JWT_SECRET', 'your-super-secret-jwt-key-change-it');
export const DATABASE_URL = getEnv('DATABASE_URL', '');
export const GOOGLE_API_KEY = getEnv('GOOGLE_API_KEY', '');
export const GOOGLE_CLIENT_ID = getEnv('GOOGLE_CLIENT_ID', '');
export const GEMINI_API_KEY = getEnv('GEMINI_API_KEY', '');
export const APP_BASE_URL = getEnv('APP_BASE_URL', 'http://localhost:5173');
export const OPENROUTER_API_KEY = getEnv('OPENROUTER_API_KEY', '');

// --- Configuração de Caminhos ---

export const PROJECT_ROOT = path.resolve(__dirname, '..'); 
export const UPLOADS_DIR_NAME = "uploads";

// ✅ CORREÇÃO: Usa uma variável de ambiente para o caminho de uploads, com fallback para o local.
// No Koyeb, você deve definir a variável de ambiente UPLOADS_MOUNT_PATH para o caminho do seu disco persistente (ex: /data).
const uploadsMountPath = process.env.UPLOADS_MOUNT_PATH;

// O caminho para uploads agora aponta para o disco persistente (se definido), ou para a raiz do projeto.
export const UPLOADS_PATH = uploadsMountPath ? path.join(uploadsMountPath, UPLOADS_DIR_NAME) : path.join(PROJECT_ROOT, UPLOADS_DIR_NAME);
