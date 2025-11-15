import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1');
    console.log('[database] Подключение к базе данных успешно');
    return true;
  } catch (error) {
    console.error('[database] Ошибка подключения к базе данных:', error);
    throw new Error(`Не удалось подключиться к базе данных: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
}

pool.on('error', (err) => {
  console.error('[database] Неожиданная ошибка подключения к БД:', err);
});
