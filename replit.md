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

## Recent Changes (Import Setup - 11 ноября 2025)
- ✅ Настроен Vite для Replit proxy (разрешены все хосты)
- ✅ Установлены все зависимости
- ✅ Применены миграции базы данных
- ✅ База данных заполнена тестовыми данными
- ✅ Настроен workflow на порту 5000
- ✅ Настроено развертывание (autoscale режим)
- ✅ Исправлены все ошибки TypeScript:
  - Добавлен `target: "ES2022"` в tsconfig.json для поддержки top-level await
  - Исправлена самоссылающаяся таблица departments
  - Создана схема updateDocumentSchema для обновления документов с версией
  - Исправлен запрос getUserNotifications в storage.ts
  - Исправлен тип rolePermissions в RolesPage.tsx
- ✅ Проверка TypeScript (`npm run check`) проходит успешно
- ✅ Приложение полностью работоспособно и готово к использованию

## Notes
- The application is in Russian language
- Supports file uploads up to 100MB
- Uses session-based authentication
- Production deployment ready with build configuration
