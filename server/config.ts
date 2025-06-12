// server/config.ts
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

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

// ✅ ADIÇÃO DA CHAVE DA OPENROUTER
export const OPENROUTER_API_KEY = getEnv('OPENROUTER_API_KEY', '');

// --- Configuração de Caminhos ---
export const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
export const UPLOADS_DIR_NAME = "uploads";
export const UPLOADS_PATH = path.join(PROJECT_ROOT, 'dist', 'public', UPLOADS_DIR_NAME);
