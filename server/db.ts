// server/db.ts
import dotenv from 'dotenv';
dotenv.config();

import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as schema from '../shared/schema';

// Função para parsear a DATABASE_URL
const parseDatabaseUrl = (url: string): PoolConfig | null => {
  try {
    const regex = /postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
    const match = url.match(regex);
    if (!match) return null;
    const [, user, password, host, port, database] = match;
    return {
      user,
      password: decodeURIComponent(password), // Decodifica a senha, se necessário
      host,
      port: parseInt(port, 10),
      database,
    };
  } catch (e) {
    console.error("Falha ao parsear DATABASE_URL", e);
    return null;
  }
};

let connectionConfig: PoolConfig;

// ✅ CORREÇÃO: Lógica de conexão unificada para priorizar o parse manual da DATABASE_URL
if (process.env.DATABASE_URL) {
    const parsedConfig = parseDatabaseUrl(process.env.DATABASE_URL);
    if (!parsedConfig) {
      throw new Error("DATABASE_URL está em um formato inválido.");
    }
    connectionConfig = { ...parsedConfig, ssl: { rejectUnauthorized: false } };
} else if (process.env.DB_HOST) {
    connectionConfig = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };
} else {
    throw new Error("As variáveis de ambiente do banco de dados não estão definidas. Defina DATABASE_URL ou as variáveis DB_*.");
}

const pool = new Pool(connectionConfig);

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
