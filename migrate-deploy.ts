// ./migrate-deploy.ts
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './shared/schema';
import 'dotenv/config';

async function runMigrations() {
  console.log("Iniciando script de migração no deploy...");

  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    console.error("Erro: As variáveis de ambiente do banco de dados (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) não estão definidas.");
    process.exit(1);
  }

  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: false,
    },
  });

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
