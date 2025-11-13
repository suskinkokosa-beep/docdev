-- Миграция для включения полнотекстового поиска в PostgreSQL
-- Выполняется автоматически при инициализации БД

-- Создание расширений для полнотекстового поиска
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Добавление колонки для хранения извлеченного текста из документов (если не существует)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'text_content') THEN
        ALTER TABLE documents ADD COLUMN text_content TEXT;
    END IF;
END $$;

-- Добавление колонки для search vector (если не существует)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'search_vector') THEN
        ALTER TABLE documents ADD COLUMN search_vector tsvector;
    END IF;
END $$;

-- Создание функции для обновления search_vector
CREATE OR REPLACE FUNCTION documents_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('russian', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('russian', coalesce(NEW.file_name, '')), 'B') ||
    setweight(to_tsvector('russian', coalesce(NEW.text_content, '')), 'C') ||
    setweight(to_tsvector('russian', coalesce(array_to_string(NEW.tags, ' '), '')), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Создание триггера для автоматического обновления search_vector
DROP TRIGGER IF EXISTS documents_search_vector_update ON documents;
CREATE TRIGGER documents_search_vector_update
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION documents_search_vector_trigger();

-- Создание GIN индекса для быстрого полнотекстового поиска
CREATE INDEX IF NOT EXISTS documents_search_vector_idx ON documents USING GIN (search_vector);

-- Создание триграмных индексов для нечеткого поиска
CREATE INDEX IF NOT EXISTS documents_name_trgm_idx ON documents USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS documents_filename_trgm_idx ON documents USING GIN (file_name gin_trgm_ops);

-- Обновление существующих записей
UPDATE documents SET search_vector = NULL WHERE search_vector IS NULL;

COMMENT ON COLUMN documents.text_content IS 'Извлеченный текст из документа для полнотекстового поиска';
COMMENT ON COLUMN documents.search_vector IS 'Автоматически обновляемый tsvector для полнотекстового поиска';
