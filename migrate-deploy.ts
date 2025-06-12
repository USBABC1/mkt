// ./migrate-deploy.ts
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as schema from './shared/schema';
import 'dotenv/config';

// Função para parsear a DATABASE_URL
const parseDatabaseUrl = (url: string): PoolConfig | null => {
  try {
    const regex = /postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
    const match = url.match(regex);
    if (!match) return null;
    const [, user, password, host, port, database] = match;
    return {
      user,
      password,
      host,
      port: parseInt(port, 10),
      database,
    };
  } catch (e) {
    console.error("Falha ao parsear DATABASE_URL", e);
    return null;
  }
};

async function runMigrations() {
  console.log("Iniciando script de migração no deploy...");

  let connectionConfig: PoolConfig;

  // ✅ CORREÇÃO: Prioriza o parse manual da DATABASE_URL
  if (process.env.DATABASE_URL) {
    const parsedConfig = parseDatabaseUrl(process.env.DATABASE_URL);
    if (!parsedConfig) {
      console.error("Erro: DATABASE_URL está em um formato inválido.");
      process.exit(1);
    }
    connectionConfig = { ...parsedConfig, ssl: { rejectUnauthorized: false } };
  } else if (process.env.DB_HOST) {
    connectionConfig = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
    };
  } else {
    console.error("Erro: As variáveis de ambiente do banco de dados não estão definidas.");
    process.exit(1);
  }

  const pool = new Pool(connectionConfig);
  const db = drizzle(pool, { schema });

  console.log("Conectado ao banco de dados. Aplicando migrações...");

  try {
    await migrate(db, { migrationsFolder: './migrations' });
    console.log("Migrações concluídas com sucesso.");
  } catch (error) {
    console.error("Erro durante a execução das migrações:", error);
    await pool.end();
    process.exit(1);
  } finally {
    await pool.end();
    console.log("Conexão com o banco de dados fechada.");
  }
}

runMigrations().catch((err) => {
  console.error("Erro não tratado no script de migração:", err);
  process.exit(1);
});
