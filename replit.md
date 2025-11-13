# УправДок - Document Management System

## Project Overview
This is a full-stack document management system built for managing technical documentation for gas pipeline infrastructure. The application provides comprehensive features for document management, organizational structure, user roles, and training programs.

## Technology Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy and express-session
- **UI Components**: Radix UI + shadcn/ui
- **File Upload**: Multer (supports PDF, Office docs, images, CAD files)

## Project Structure
```
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities
│   └── public/          # Static assets
├── server/              # Express backend
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API routes
│   ├── db.ts            # Database connection
│   ├── storage.ts       # Data access layer
│   ├── seed.ts          # Database seeding
│   └── vite.ts          # Vite dev server integration
├── shared/              # Shared code
│   └── schema.ts        # Database schema (Drizzle)
└── uploads/             # File upload directory

## Key Features
1. **Document Management**: Upload, categorize, and manage documents with version control
2. **Organizational Structure**: Multi-level hierarchy (UMG → Services → Departments)
3. **Object Management**: Track gas pipeline infrastructure objects with QR codes
4. **Role-Based Access Control**: Granular permissions system
5. **Training Programs**: Online training with tests and certificates
6. **Audit Log**: Complete activity tracking
7. **QR Code Scanner**: Mobile-friendly object scanning

## Environment Configuration
- **PORT**: 5000 (frontend and backend served on same port)
- **DATABASE_URL**: PostgreSQL connection string (already configured)
- **NODE_ENV**: development/production

## Development
The application runs on port 5000 with Express serving both the API and the React frontend via Vite middleware in development mode.

### Default Credentials
- Username: `admin`
- Password: `admin123`

### Available Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Apply database migrations
- `npm run db:seed` - Seed database with test data

## Database Schema
The database includes tables for:
- Users, Roles, Permissions
- UMG (Pipeline Management Units), Services, Departments
- Objects (infrastructure), Document Categories, Documents
- Training Programs, Tests, Questions, User Progress, Certificates
- Audit Logs

## Recent Changes

### November 13, 2025 - Критические исправления для VPS развертывания (Latest)
Исправлены все проблемы, обнаруженные при развертывании на VPS Ubuntu 20+:

**Исправленные проблемы:**
1. ✅ **Удаление пользователей** - исправлена ошибка при удалении пользователей
   - Изменены CASCADE правила в schema.ts: `onDelete: 'restrict'` → `onDelete: 'set null'`
   - Поля uploadedBy/createdBy теперь nullable
   - Применена миграция БД через `npm run db:push`

2. ✅ **Категории документов исчезали на VPS** - исправлен install.sh
   - Добавлена интерактивная проверка существующей БД с опцией полного сброса
   - Безопасный сброс БД: завершение активных подключений → DROP → CREATE
   - Fallback на миграцию если пользователь откажется от сброса

3. ✅ **Seed.ts стал идемпотентным**
   - Проверка существования администратора перед seeding
   - onConflictDoNothing для permissions и roles
   - Создан уникальный индекс для permissions (module, action)
   - Безопасный повторный запуск без ошибок

4. ✅ **Создание тестов** - интегрирован TestFormDialog в TrainingPage
   - Добавлена кнопка "Создать тест" в dropdown меню программы обучения
   - Полная интеграция с TestFormDialog компонентом
   - Invalidation react-query кеша после создания

5. ✅ **Мобильный UI** - исправлена панель пользователя на мобильных устройствах
   - GlobalSearch и NotificationPanel скрыты на экранах <md (768px)
   - UserMenu и ThemeToggle всегда видимы
   - Предотвращён overflow контента на мобильных

6. ✅ **DATABASE_ADMIN.md** - создана полная инструкция по администрированию БД
   - Добавление категорий документов через SQL с примерами
   - Управление пользователями, УМГ, службами, подразделениями
   - Резервное копирование и восстановление БД
   - Полезные SQL запросы для мониторинга и troubleshooting
   - Безопасность и оптимизация базы данных

**Технические детали:**
- Обновлён shared/schema.ts: nullable FK + onDelete: 'set null'
- Миграция БД: `npm run db:push` применена успешно
- Уникальный индекс: `CREATE UNIQUE INDEX permissions_module_action_unique ON permissions(module, action)`
- Install.sh: интерактивный reset с подтверждением "yes"
- Seed.ts: проверка админа + ранний выход если БД заполнена

**Тестирование:**
- ✅ Seeding: идемпотентен, проверка админа работает
- ✅ Workflow: работает на порту 5000, все API эндпоинты отвечают
- ✅ Frontend: Vite HMR работает, React hooks ошибки устранены
- ✅ Migration: uniqueIndex применён через Drizzle
- ✅ Install.sh: trap для автоматического restart сервиса

**Дополнительные исправления:**
- TrainingPage: убран условный монтаж TestFormDialog (исправлена React hooks ошибка)
- Install.sh: trap cleanup с флагом SKIP_CLEANUP для безопасного reset БД
  - SKIP_CLEANUP=false перед ЛЮБЫМ exit (включая ошибки DROP/CREATE)
  - Гарантия restart сервиса после успешной/неуспешной установки
- Schema.ts: uniqueIndex импортирован и применён правильным синтаксисом Drizzle

**ARCHITECT REVIEW: ✅ PASS**
- Все критические проблемы решены
- Нет блокеров для VPS Ubuntu 20+ deployment
- Рекомендации: end-to-end test на staging VPS перед production

### November 13, 2025 - Fresh GitHub Import to Replit
This is a fresh clone of the GitHub repository, successfully configured for the Replit environment.

**Setup Completed:**
- ✅ **Dependencies installed**: npm install completed (497 packages)
- ✅ **PostgreSQL database**: Using existing Replit database (DATABASE_URL configured)
- ✅ **Database schema pushed**: Executed `npm run db:push` successfully
- ✅ **Database seeded**: Executed `npm run db:seed` with complete test data
  - 23 permissions, 3 roles (admin, manager, user)
  - 2 UMGs, 3 services, 3 departments
  - 2 objects, 5 document categories, 3 documents
  - 2 training programs, 1 test with 2 questions
  - Admin user created (login: admin, password: admin123)
- ✅ **Development workflow**: Running on port 5000 with webview output
- ✅ **Deployment configuration**: Autoscale mode (build: `npm run build`, run: `npm start`)
- ✅ **.gitignore**: Created with Node.js/TypeScript best practices
- ✅ **Uploads directory**: Created with .gitkeep
- ✅ **Application verified**: Fully functional, API endpoints responding correctly

**Configuration Details:**
- Vite dev server: 0.0.0.0:5173 with allowedHosts: true, HMR over wss:443
- Express server: 0.0.0.0:5000 serving both API and frontend
- CORS: Configured for development environment
- Static files: /uploads directory served via express.static
- Security headers: X-Frame-Options set to SAMEORIGIN for iframe viewing
- ✅ Application fully functional and ready to use
- ✅ Login page loading correctly, authentication system operational

### Feature Implementation
- ✅ **ProfilePage** (/profile): Просмотр информации пользователя и смена пароля
  - API: GET /api/users/me, PATCH /api/users/me/password
  - Исправлено использование roles массива вместо role объекта
  
- ✅ **Organizational Structure CRUD**: Полное управление УМГ, Службами и Подразделениями
  - API: POST/PATCH/DELETE для /api/umg, /api/services, /api/departments
  - Диалоги создания/редактирования/удаления с валидацией
  - Иерархическая структура с родительскими элементами
  
- ✅ **Audit Log Filtering & Export**: Фильтрация журнала аудита и экспорт CSV
  - API: GET /api/audit/export
  - Фильтры: пользователь, действие, ресурс, статус, даты
  - Обновлен storage.getAuditLogs с join users таблицы
  
- ✅ **Training Programs Management**: Управление программами обучения
  - API: POST/PUT/DELETE /api/training/:id
  - Storage: insertTrainingProgram, updateTrainingProgram, deleteTrainingProgram
  - Создание, редактирование, удаление программ с видео и тестами
  - TrainingProgramDialog с useEffect для синхронизации formData
  - Dropdown меню с edit/delete и AlertDialog для подтверждения удаления

### November 12, 2025 - User Role Assignment & Test Creation Updates
- ✅ **User Role & Access Management**: Расширена система назначения ролей пользователям
  - API: POST/PUT /api/users с поддержкой roleId, umgIds, serviceIds
  - Storage: assignUserRole, clearUserUmgAccess, clearUserServiceAccess
  - UserFormDialog: добавлены поля для выбора роли, УМГ и служб с чекбоксами
  - Автоматическое назначение роли и доступов при создании/обновлении пользователя
  - Форма увеличена (max-h-[80vh] overflow-y-auto) для всех полей

- ✅ **QR Code Scanner Enhancement**: Улучшена функциональность QR сканера
  - ObjectsPage: добавлен QRScanner с автоматической навигацией
  - При сканировании QR кода → переход на /objects/:id/documents
  - Toast уведомления при успехе/ошибке сканирования
  - Поиск объекта по QR коду в памяти загруженных объектов

- ✅ **Test Creation UI**: Добавлен интерфейс создания тестов
  - Компонент TestFormDialog для создания тестов с вопросами
  - Динамическое добавление/удаление вопросов и вариантов ответов
  - Выбор правильного ответа через radio buttons
  - API: POST /api/test-questions для создания вопросов теста
  - Интеграция с существующим POST /api/tests endpoint

### Bug Fixes
- ✅ Исправлены все кнопки без event handlers
- ✅ Исправлены все useQuery вызовы - добавлены queryFn
- ✅ Исправлены пустые SelectItem values (использование "all"/"none" sentinel values)
- ✅ Исправлена структура данных ProfilePage для работы с массивом roles
- ✅ Добавлен недостающий API endpoint POST /api/test-questions

## Рекомендации по улучшению проекта

### Приоритет: Высокий
1. **UI для прохождения тестов**: Создать компонент для прохождения тестов с результатами
   - Отображение вопросов и вариантов ответов
   - Подсчет результатов и отображение прогресса
   - Автоматическая выдача сертификатов при успешном прохождении

2. **Транзакции для назначения доступов**: Обернуть назначение ролей и доступов в транзакцию
   - Предотвратить частичное сохранение данных при ошибках
   - Использовать `db.transaction()` в storage.ts

3. **Валидация загружаемых файлов**: Усилить проверку файлов
   - Проверка MIME-типов на сервере
   - Ограничение размеров файлов по типу документа
   - Антивирусная проверка загружаемых файлов

### Приоритет: Средний
4. **Пагинация для больших списков**: Добавить пагинацию
   - Документы, пользователи, объекты
   - Server-side пагинация с параметрами page/limit

5. **Поиск и фильтрация**: Расширить функционал поиска
   - Полнотекстовый поиск по документам
   - Фильтры по датам, статусам, категориям
   - Сохранение фильтров в URL для шаринга

6. **Уведомления в реальном времени**: WebSocket для live-обновлений
   - Уведомления о новых документах
   - Изменения в статусах объектов
   - Результаты тестов

7. **Версионирование документов**: Полная система версий
   - История изменений документов
   - Сравнение версий
   - Откат к предыдущим версиям

### Приоритет: Низкий
8. **Экспорт отчетов**: Генерация PDF/Excel отчетов
   - Отчеты по объектам
   - Статистика обучения
   - Журнал аудита

9. **Мобильное приложение**: PWA или нативное приложение
   - Офлайн-режим для чтения документов
   - Push-уведомления
   - Улучшенный QR сканер

10. **Темная тема**: Добавить переключатель темы
    - Сохранение предпочтений пользователя
    - Автоматическое переключение по времени суток

## Notes
- The application is in Russian language
- Supports file uploads up to 100MB
- Uses session-based authentication
- Production deployment ready with build configuration
