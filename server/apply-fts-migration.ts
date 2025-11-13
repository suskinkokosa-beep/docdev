import { pool } from './db';
import fs from 'fs';
import path from 'path';

async function applyFullTextSearchMigration() {
  console.log('🔍 Применение миграции для полнотекстового поиска...\n');
  
  try {
    // Читаем SQL файл миграции
    const migrationPath = path.join(process.cwd(), 'server/migrations/001_enable_fulltext_search.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Выполнение SQL миграции...');
    await pool.query(migrationSQL);
    
    console.log('✅ Миграция успешно применена!\n');
    console.log('Добавлены:');
    console.log('  - Расширения: pg_trgm, unaccent');
    console.log('  - Колонки: text_content, search_vector');
    console.log('  - Триггер для автоматического обновления search_vector');
    console.log('  - GIN индексы для быстрого поиска');
    console.log('  - Триграмные индексы для нечеткого поиска\n');
    
    // Проверка созданных индексов
    const indexesResult = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'documents' 
      AND indexname LIKE '%search%'
      ORDER BY indexname;
    `);
    
    if (indexesResult.rows.length > 0) {
      console.log('📊 Созданные индексы:');
      indexesResult.rows.forEach(row => {
        console.log(`  - ${row.indexname}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка при применении миграции:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Запуск миграции
applyFullTextSearchMigration()
  .then(() => {
    console.log('\n✨ Готово!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Ошибка:', err);
    process.exit(1);
  });
