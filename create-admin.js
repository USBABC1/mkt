import { Pool } from 'pg';
import bcrypt from 'bcrypt';

async function createAdminUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Criando usuário administrador...');
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const result = await pool.query(`
      INSERT INTO users (username, email, password, created_at, updated_at) 
      VALUES ($1, $2, $3, NOW(), NOW()) 
      ON CONFLICT (email) DO NOTHING 
      RETURNING id, username, email
    `, ['admin', 'admin@usbmkt.com', hashedPassword]);

    if (result.rows.length > 0) {
      console.log('✅ Usuário administrador criado com sucesso!');
      console.log('📧 Email: admin@usbmkt.com');
      console.log('🔑 Senha: admin123');
    } else {
      console.log('ℹ️  Usuário administrador já existe!');
      console.log('📧 Email: admin@usbmkt.com');
      console.log('🔑 Senha: admin123');
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error.message);
  } finally {
    await pool.end();
  }
}

createAdminUser();