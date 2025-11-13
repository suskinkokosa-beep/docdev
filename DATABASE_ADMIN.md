# Руководство по администрированию базы данных

## Подключение к базе данных

### На VPS через SSH

```bash
# Подключение к PostgreSQL
sudo -u postgres psql -d doc_management

# Или с использованием учетных данных из .env
psql -h localhost -U doc_user -d doc_management
```

## Добавление категорий документов

### Через SQL

```sql
-- Просмотр существующих категорий
SELECT * FROM document_categories ORDER BY created_at;

-- Добавление новой категории
INSERT INTO document_categories (id, name, code, description, created_at)
VALUES (
  gen_random_uuid(),
  'Технические паспорта',
  'TECH_PASSPORT',
  'Технические паспорта оборудования',
  NOW()
);

-- Добавление нескольких категорий за раз
INSERT INTO document_categories (id, name, code, description, created_at)
VALUES 
  (gen_random_uuid(), 'Инструкции по эксплуатации', 'INSTRUCTIONS', 'Инструкции по эксплуатации оборудования', NOW()),
  (gen_random_uuid(), 'Проектная документация', 'PROJECT_DOCS', 'Проектная и конструкторская документация', NOW()),
  (gen_random_uuid(), 'Акты и протоколы', 'ACTS_PROTOCOLS', 'Акты испытаний и протоколы проверок', NOW());

-- Обновление существующей категории
UPDATE document_categories
SET name = 'Новое название', description = 'Новое описание'
WHERE code = 'TECH_PASSPORT';

-- Удаление категории (ВНИМАНИЕ: проверьте что нет связанных документов)
DELETE FROM document_categories WHERE code = 'OLD_CATEGORY';
```

### Проверка связанных документов перед удалением

```sql
-- Проверить количество документов в категории
SELECT c.name, c.code, COUNT(d.id) as document_count
FROM document_categories c
LEFT JOIN documents d ON d.category_id = c.id
WHERE c.code = 'TECH_PASSPORT'
GROUP BY c.id, c.name, c.code;

-- Если есть документы, сначала переназначьте их или удалите
UPDATE documents
SET category_id = (SELECT id FROM document_categories WHERE code = 'NEW_CATEGORY')
WHERE category_id = (SELECT id FROM document_categories WHERE code = 'OLD_CATEGORY');
```

## Управление пользователями

### Создание нового пользователя

```sql
-- Создание пользователя
INSERT INTO users (id, username, password, full_name, email, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ivanov',
  '$2a$10$...hashed_password...', -- используйте bcrypt для хеширования
  'Иванов Иван Иванович',
  'ivanov@company.ru',
  'active',
  NOW(),
  NOW()
);

-- Назначение роли пользователю
INSERT INTO user_roles (id, user_id, role_id)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'ivanov'),
  (SELECT id FROM roles WHERE name = 'Инженер')
);
```

### Сброс пароля пользователя

```sql
-- ВАЖНО: Пароль должен быть захеширован bcrypt
-- Можно использовать онлайн-генератор bcrypt или Node.js скрипт

-- Сброс пароля (пример с хешем пароля "newpassword123")
UPDATE users
SET password = '$2a$10$CwTycUXWue0Thq9StjUM0uBzaT2m8yYwL3m9ZMmxGJGJQk7Z8w7EK',
    updated_at = NOW()
WHERE username = 'ivanov';
```

## Управление УМГ, службами и подразделениями

### Добавление нового УМГ

```sql
INSERT INTO umg (id, name, code, description, created_at)
VALUES (
  gen_random_uuid(),
  'УМГ Центр',
  'UMG-CENTER',
  'Центральное управление магистральных газопроводов',
  NOW()
);
```

### Добавление службы

```sql
INSERT INTO services (id, umg_id, name, code, description, created_at)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM umg WHERE code = 'UMG-CENTER'),
  'Служба безопасности',
  'SECURITY',
  'Служба промышленной безопасности',
  NOW()
);
```

### Добавление подразделения

```sql
INSERT INTO departments (id, service_id, parent_id, name, code, description, level, created_at)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM services WHERE code = 'SECURITY'),
  NULL, -- NULL для корневого подразделения, или ID родительского
  'Отдел охраны труда',
  'OT',
  'Отдел охраны труда и промышленной безопасности',
  1, -- уровень вложенности
  NOW()
);
```

## Резервное копирование и восстановление

### Создание резервной копии

```bash
# Полная резервная копия базы данных
pg_dump -h localhost -U doc_user -d doc_management > backup_$(date +%Y%m%d_%H%M%S).sql

# Резервная копия только схемы (без данных)
pg_dump -h localhost -U doc_user -d doc_management --schema-only > schema_backup.sql

# Резервная копия только данных
pg_dump -h localhost -U doc_user -d doc_management --data-only > data_backup.sql
```

### Восстановление из резервной копии

```bash
# Восстановление базы данных
psql -h localhost -U doc_user -d doc_management < backup_20251113_120000.sql

# Восстановление с пересозданием базы
sudo -u postgres psql -c "DROP DATABASE IF EXISTS doc_management;"
sudo -u postgres psql -c "CREATE DATABASE doc_management OWNER doc_user;"
psql -h localhost -U doc_user -d doc_management < backup_20251113_120000.sql
```

## Полезные запросы для мониторинга

### Статистика по документам

```sql
-- Количество документов по категориям
SELECT c.name, COUNT(d.id) as count
FROM document_categories c
LEFT JOIN documents d ON d.category_id = c.id
GROUP BY c.id, c.name
ORDER BY count DESC;

-- Размер загруженных файлов
SELECT 
  SUM(file_size) / 1024 / 1024 as total_mb,
  COUNT(*) as total_documents
FROM documents;

-- Последние загруженные документы
SELECT d.name, d.created_at, u.full_name as uploaded_by
FROM documents d
LEFT JOIN users u ON d.uploaded_by = u.id
ORDER BY d.created_at DESC
LIMIT 10;
```

### Статистика по пользователям

```sql
-- Количество пользователей по ролям
SELECT r.name, COUNT(ur.user_id) as user_count
FROM roles r
LEFT JOIN user_roles ur ON ur.role_id = r.id
GROUP BY r.id, r.name;

-- Активность пользователей
SELECT u.username, u.full_name, COUNT(al.id) as actions
FROM users u
LEFT JOIN audit_logs al ON al.user_id = u.id
GROUP BY u.id, u.username, u.full_name
ORDER BY actions DESC
LIMIT 10;
```

### Аудит действий

```sql
-- Последние действия в системе
SELECT 
  al.created_at,
  u.username,
  al.action,
  al.resource,
  al.resource_id,
  al.success
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC
LIMIT 20;

-- Действия конкретного пользователя
SELECT 
  created_at,
  action,
  resource,
  resource_id,
  success
FROM audit_logs
WHERE user_id = (SELECT id FROM users WHERE username = 'admin')
ORDER BY created_at DESC;
```

## Очистка и обслуживание

### Очистка старых логов аудита

```sql
-- Удаление логов старше 6 месяцев
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '6 months';

-- Или архивирование в отдельную таблицу
CREATE TABLE audit_logs_archive AS
SELECT * FROM audit_logs
WHERE created_at < NOW() - INTERVAL '6 months';

DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '6 months';
```

### Оптимизация базы данных

```sql
-- Анализ таблиц для оптимизации планировщика запросов
ANALYZE;

-- Очистка и оптимизация (выполнять в периоды низкой нагрузки)
VACUUM FULL ANALYZE;

-- Переиндексация для улучшения производительности
REINDEX DATABASE doc_management;
```

## Устранение неполадок

### Проверка подключений к базе данных

```sql
-- Активные подключения
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start
FROM pg_stat_activity
WHERE datname = 'doc_management';

-- Завершение зависших подключений
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'doc_management'
  AND state = 'idle'
  AND query_start < NOW() - INTERVAL '1 hour';
```

### Проверка блокировок

```sql
-- Активные блокировки
SELECT 
  l.pid,
  l.mode,
  l.granted,
  a.usename,
  a.query
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted;
```

## Безопасность

### Изменение паролей БД

```bash
# Изменение пароля пользователя PostgreSQL
sudo -u postgres psql -c "ALTER USER doc_user WITH PASSWORD 'new_secure_password';"

# Обновите пароль в .env файле
nano /docdev/.env
# DATABASE_URL=postgresql://doc_user:new_secure_password@localhost:5432/doc_management

# Перезапустите приложение
systemctl restart docdev
```

### Ограничение доступа

```sql
-- Отзыв всех прав у пользователя
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM doc_user;

-- Предоставление только необходимых прав
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO doc_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO doc_user;
```

## Примечания

- **Всегда делайте резервную копию перед изменениями!**
- Для массовых операций используйте транзакции (`BEGIN; ... COMMIT;`)
- Тестируйте запросы на тестовой базе перед применением на production
- Храните резервные копии в безопасном месте вне сервера
