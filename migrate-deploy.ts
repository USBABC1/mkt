// ./migrate-deploy.ts
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg'; // Importamos o Pool do pacote 'pg'
import * as schema from './shared/schema'; // Caminho para o seu schema (confirmado)
import 'dotenv/config'; // Carrega variáveis de ambiente do .env se existir (útil localmente)

async function runMigrations() {
  console.log("Iniciando script de migração no deploy...");

  if (!process.env.DATABASE_URL) {
    console.error("Erro: Variável de ambiente DATABASE_URL não está definida.");
    process.exit(1); // Sai com erro se a URL do banco não estiver definida
  }

  // Configura o Pool do pg para conectar ao seu banco de dados Render com SSL
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Essencial para o SSL do Render, ignora validação de certificado
    },
  });

  // Inicializa o Drizzle ORM com o Pool e o schema
  const db = drizzle(pool, { schema });

  console.log("Conectado ao banco de dados. Aplicando migrações...");

  try {
    // Executa as migrações da pasta 'migrations'
    await migrate(db, { migrationsFolder: './migrations' });
    console.log("Migrações concluídas com sucesso.");
  } catch (error) {
    console.error("Erro durante a execução das migrações:", error);
    await pool.end(); // Fecha o pool antes de sair com erro
    process.exit(1); // Sai com erro se as migrações falharem
  } finally {
    // Garante que o pool é fechado após as migrações (sucesso ou falha)
    await pool.end();
    console.log("Conexão com o banco de dados fechada.");
  }
}

// Executa a função de migração e trata erros não capturados
runMigrations().catch((err) => {
  console.error("Erro não tratado no script de migração:", err);
  process.exit(1);
});
