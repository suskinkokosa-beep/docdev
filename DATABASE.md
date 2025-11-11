# Структура базы данных

## Общая схема

```
┌─────────────────┐
│     users       │───┐
└─────────────────┘   │
                      ├──> user_roles <──┐
┌─────────────────┐   │                  │
│     roles       │───┘                  │
└─────────────────┘                      │
        │                                │
        └──> role_permissions <──┐       │
                                 │       │
┌─────────────────┐              │       │
│  permissions    │──────────────┘       │
└─────────────────┘                      │
                                         │
┌─────────────────┐                      │
│       umg       │◄─────────────────────┤
└─────────────────┘                      │
        │                                │
        └──> services ◄──────────────────┤
                │                        │
                └──> departments         │
                                         │
┌─────────────────┐                      │
│    objects      │◄─────────────────────┤
└─────────────────┘                      │
        │                                │
        └──> object_services <───────────┤
                                         │
┌─────────────────┐                      │
│   documents     │◄─────────────────────┘
└─────────────────┘
        │
        └──> document_services
```

## Таблицы

### 1. users (Пользователи)
Хранит информацию о пользователях системы.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID пользователя |
| username | text UNIQUE | Логин (уникальный) |
| password | text | Хеш пароля (bcrypt) |
| fullName | text | Полное имя |
| email | text UNIQUE | Email (опционально) |
| status | enum | active/inactive/suspended |
| createdAt | timestamp | Дата создания |
| updatedAt | timestamp | Дата обновления |

### 2. roles (Роли)
Роли пользователей для группировки прав.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID роли |
| name | text UNIQUE | Название роли |
| description | text | Описание |
| isSystem | boolean | Системная роль (нельзя удалить) |
| createdAt | timestamp | Дата создания |

**Примеры:** Администратор, Менеджер документации, Инженер

### 3. permissions (Права)
Детальные права доступа к функциям системы.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID права |
| module | text | Модуль (users, documents, objects) |
| action | text | Действие (view, create, edit, delete) |
| description | text | Описание права |

**Примеры:**
- users.view - Просмотр пользователей
- documents.create - Создание документов
- objects.delete - Удаление объектов

### 4. role_permissions (Связь ролей и прав)
Many-to-many связь между ролями и правами.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID записи |
| roleId | varchar(36) FK | ID роли |
| permissionId | varchar(36) FK | ID права |

### 5. user_roles (Связь пользователей и ролей)
Many-to-many связь между пользователями и ролями.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID записи |
| userId | varchar(36) FK | ID пользователя |
| roleId | varchar(36) FK | ID роли |

### 6. umg (Управление магистральных газопроводов)
Верхний уровень организационной структуры.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID УМГ |
| name | text | Название УМГ |
| code | text UNIQUE | Уникальный код |
| description | text | Описание |
| createdAt | timestamp | Дата создания |

**Примеры:** УМГ Север, УМГ Восток, УМГ Центр

### 7. services (Службы)
Службы внутри УМГ.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID службы |
| umgId | varchar(36) FK | ID УМГ |
| name | text | Название службы |
| code | text | Код службы |
| description | text | Описание |
| createdAt | timestamp | Дата создания |

**Примеры:** Техническая служба, Эксплуатационная служба

### 8. departments (Подразделения)
Подразделения внутри служб с поддержкой вложенности.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID подразделения |
| serviceId | varchar(36) FK | ID службы |
| parentId | varchar(36) FK | ID родительского подразделения (nullable) |
| name | text | Название |
| code | text | Код |
| description | text | Описание |
| level | integer | Уровень вложенности (1, 2, 3...) |
| createdAt | timestamp | Дата создания |

**Примеры:** Отдел диагностики → Группа КИП

### 9. objects (Объекты газопроводов)
Физические объекты инфраструктуры.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID объекта |
| code | text UNIQUE | Уникальный код |
| name | text | Название объекта |
| type | text | Тип (КС, газопровод, узел) |
| umgId | varchar(36) FK | ID УМГ |
| status | enum | active/maintenance/inactive |
| qrCode | text UNIQUE | QR-код (генерируется автоматически) |
| location | text | Местоположение |
| description | text | Описание |
| metadata | jsonb | Дополнительные характеристики |
| createdAt | timestamp | Дата создания |
| updatedAt | timestamp | Дата обновления |

**Примеры:** Компрессорная станция КС-1, Газопровод ГП-12

### 10. object_services (Связь объектов и служб)
Многослужебные объекты - один объект может принадлежать нескольким службам.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID записи |
| objectId | varchar(36) FK | ID объекта |
| serviceId | varchar(36) FK | ID службы |
| isPrimary | boolean | Основная служба для объекта |

### 11. document_categories (Категории документов)
Категории для классификации документов.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID категории |
| name | text | Название категории |
| code | text UNIQUE | Уникальный код |
| description | text | Описание |
| createdAt | timestamp | Дата создания |

**Примеры:** Техническая документация, Чертежи, Протоколы

### 12. documents (Документы)
Документы с метаданными и версионированием.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID документа |
| code | text UNIQUE | Уникальный код (генерируется) |
| name | text | Название документа |
| fileName | text | Имя файла |
| filePath | text | Путь к файлу |
| fileSize | integer | Размер файла (байты) |
| mimeType | text | MIME тип |
| categoryId | varchar(36) FK | ID категории |
| objectId | varchar(36) FK | ID объекта (nullable) |
| umgId | varchar(36) FK | ID УМГ |
| tags | text[] | Массив тегов |
| metadata | jsonb | Метаданные |
| uploadedBy | varchar(36) FK | ID загрузившего пользователя |
| version | integer | Версия документа |
| createdAt | timestamp | Дата создания |
| updatedAt | timestamp | Дата обновления |

### 13. document_services (Распределение документов по службам)
Умное распределение документов с гранулярными правами.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID записи |
| documentId | varchar(36) FK | ID документа |
| serviceId | varchar(36) FK | ID службы |
| canView | boolean | Может просматривать |
| canEdit | boolean | Может редактировать |
| canDelete | boolean | Может удалять |

### 14. training_programs (Программы обучения)
Учебные программы для сотрудников.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID программы |
| title | text | Название программы |
| description | text | Описание |
| duration | integer | Длительность (минуты) |
| videoUrl | text | Ссылка на видео |
| materials | jsonb | Дополнительные материалы |
| umgId | varchar(36) FK | ID УМГ (nullable) |
| serviceId | varchar(36) FK | ID службы (nullable) |
| createdBy | varchar(36) FK | ID создателя |
| createdAt | timestamp | Дата создания |
| updatedAt | timestamp | Дата обновления |

### 15. training_progress (Прогресс обучения)
Отслеживание прогресса пользователей.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID записи |
| userId | varchar(36) FK | ID пользователя |
| programId | varchar(36) FK | ID программы |
| progress | integer | Прогресс (0-100) |
| completed | boolean | Завершено |
| completedAt | timestamp | Дата завершения |
| createdAt | timestamp | Дата начала |
| updatedAt | timestamp | Дата обновления |

### 16. training_tests (Тесты)
Тесты для проверки знаний.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID теста |
| programId | varchar(36) FK | ID программы |
| title | text | Название теста |
| passingScore | integer | Проходной балл |
| createdAt | timestamp | Дата создания |

### 17. training_test_questions (Вопросы тестов)
Вопросы для тестов.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID вопроса |
| testId | varchar(36) FK | ID теста |
| question | text | Текст вопроса |
| options | jsonb | Варианты ответов (JSON array) |
| correctAnswer | integer | Индекс правильного ответа |
| order | integer | Порядок вопроса |

### 18. training_certificates (Сертификаты)
Сертификаты об окончании обучения.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID сертификата |
| userId | varchar(36) FK | ID пользователя |
| programId | varchar(36) FK | ID программы |
| certificateNumber | text UNIQUE | Номер сертификата |
| score | integer | Итоговый балл |
| issuedAt | timestamp | Дата выдачи |

### 19. audit_logs (Журнал аудита)
Детальное логирование всех действий в системе.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID записи |
| userId | varchar(36) FK | ID пользователя (nullable) |
| action | enum | Тип действия |
| resource | text | Тип ресурса |
| resourceId | text | ID ресурса |
| details | jsonb | Детали действия (JSON) |
| ipAddress | text | IP адрес |
| userAgent | text | User Agent |
| success | boolean | Успешность операции |
| createdAt | timestamp | Дата/время действия |

**Типы действий:** create, read, update, delete, upload, download, login, logout

### 20. user_umg_access (Доступ пользователей к УМГ)
Контроль доступа пользователей к УМГ.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID записи |
| userId | varchar(36) FK | ID пользователя |
| umgId | varchar(36) FK | ID УМГ |

### 21. user_service_access (Доступ пользователей к службам)
Контроль доступа пользователей к службам.

| Поле | Тип | Описание |
|------|-----|----------|
| id | varchar(36) PK | UUID записи |
| userId | varchar(36) FK | ID пользователя |
| serviceId | varchar(36) FK | ID службы |

## Индексы

Для оптимизации производительности созданы индексы на:
- Внешние ключи (FK)
- Уникальные поля (UNIQUE)
- Поля для поиска (username, email, code, qrCode)
- Поля для фильтрации (status, action, resource)

## Row-Level Security (RLS)

PostgreSQL Row-Level Security включен на уровне базы данных для дополнительной защиты:

```sql
ALTER DATABASE doc_management_db SET row_security = on;
```

Это обеспечивает фильтрацию данных на уровне строк в зависимости от прав пользователя.

## Миграции

Миграции управляются через Drizzle Kit:

```bash
# Применить миграции
npm run db:push

# Создать новую миграцию
npx drizzle-kit generate
```

## Бэкапы

Автоматическое резервное копирование:
- База данных: pg_dump с gzip
- Файлы: tar.gz архив директории uploads
- Частота: ежедневно в 2:00
- Хранение: 30 дней

```bash
# Ручной бэкап
sudo -u postgres pg_dump doc_management_db | gzip > backup.sql.gz

# Восстановление
gunzip -c backup.sql.gz | sudo -u postgres psql doc_management_db
```

## Примеры запросов

### Получить пользователей с их ролями
```sql
SELECT u.*, r.name as role_name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON r.id = ur.role_id
WHERE u.status = 'active';
```

### Получить объекты со службами
```sql
SELECT o.*, s.name as service_name, os.is_primary
FROM objects o
JOIN object_services os ON o.id = os.object_id
JOIN services s ON s.id = os.service_id
WHERE o.status = 'active';
```

### Получить документы с правами доступа
```sql
SELECT d.*, s.name as service_name, ds.can_view, ds.can_edit, ds.can_delete
FROM documents d
JOIN document_services ds ON d.id = ds.document_id
JOIN services s ON s.id = ds.service_id;
```

### Журнал аудита за последние 24 часа
```sql
SELECT al.*, u.username
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY al.created_at DESC;
```

---

**Примечание:** Все таблицы используют UUID (varchar(36)) в качестве первичных ключей для лучшей масштабируемости и безопасности.
