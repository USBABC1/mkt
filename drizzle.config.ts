// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import 'dotenv/config';

if (!process.env.DATABASE_URL && (!process.env.DB_HOST || !process.env.DB_PASSWORD)) {
  throw new Error("DATABASE_URL ou as variáveis DB_* devem estar definidas.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  // A configuração agora pode usar tanto a URL quanto as credenciais separadas
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Mantido para uso local se preferir
    // Novas credenciais para produção
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
  },
  verbose: true,
  strict: true,
});
