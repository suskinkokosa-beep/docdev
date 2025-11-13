# УправДок - Document Management System

## Overview
УправДок is a full-stack document management system designed for managing technical documentation related to gas pipeline infrastructure. It provides features for comprehensive document handling, organizational structure management, user role-based access control, and training programs. The system aims to streamline the management of critical infrastructure documentation, enhance operational efficiency, and ensure compliance through structured data management and audit trails.

## Recent Changes (November 13, 2025)

### Latest Updates - Production-Ready Document Viewer & PWA Mobile App

1. **Улучшенный Document Viewer** (PRODUCTION READY! ✅)
   - ✅ **PDF**: Полноценный просмотр с локальным worker (offline-ready) + навигация и масштабирование
   - ✅ **Word .docx**: Browser-safe рендеринг через docx-preview с динамическими стилями
   - ✅ **Excel .xlsx/.xls**: Конвертация в HTML таблицы с просмотром всех листов (xlsx)
   - ✅ **Legacy .doc**: Специальная обработка с информативным предупреждением и кнопкой скачивания
   - ✅ **Изображения**: Все форматы изображений и технические схемы
   - ✅ **Текстовые файлы**: Прямой просмотр в iframe
   - ✅ **Офлайн режим**: PDF worker загружается локально (не с CDN)

2. **PWA Mobile Application** (mobi/) - ГОТОВО К УСТАНОВКЕ
   - ✅ **Полноценное мобильное приложение** с Progressive Web App функциональностью
   - ✅ **Офлайн режим**: Service Worker с умным кэшированием API и статических ресурсов
   - ✅ **Кросс-порт кэширование**: API запросы кэшируются по pathname (работает с разными портами)
   - ✅ **Мобильная навигация**: Удобный нижний таббар для смартфонов
   - ✅ **QR Сканер**: Интерфейс для сканирования QR-кодов объектов
   - ✅ **Оптимизация для мобильных**: Адаптивный дизайн и touch-friendly интерфейс
   - 📱 **Установка на устройство**: SVG иконки готовы, инструменты для генерации PNG включены
   - 💾 **IndexedDB готовность**: Подготовлено для локального хранения данных
   - 📝 **Документация**: Полный README с инструкциями по генерации иконок

3. **Replit Environment Setup**
   - GitHub Import Completed: Successfully imported and configured the project for Replit environment
   - Database Setup: Connected to Replit PostgreSQL database (Neon-backed)
   - Pushed database schema using Drizzle ORM (`npm run db:push`)
   - Seeded initial data including admin user, roles, permissions, and sample data
   - Development Workflow: Configured development server on port 5000 (required for Replit webview)
   - Vite configured with `allowedHosts: true` for Replit proxy compatibility
   - Express server properly configured with host `0.0.0.0:5000`
   - Deployment Configuration: Set up autoscale deployment target
   - Build command: `npm run build`
   - Start command: `npm start`

4. **Default Credentials**: 
   - Username: `admin`
   - Password: `admin123`

### Critical Production Fixes

#### Document Viewer Browser Compatibility
1. **PDF.js Worker**: Локальная загрузка через `import.meta.url` вместо CDN для офлайн работы
2. **docx-preview Integration**: Browser-safe библиотека с динамической генерацией стилей
3. **Word Viewer Ref Management**: Контейнер всегда монтируется с loading overlay для корректной работы
4. **Legacy .doc Handling**: Специальное amber предупреждение с большой кнопкой скачивания

#### Previous Production Fixes
1. **install.sh Security Fix**: Added `set -a; source .env; set +a` to properly export and preserve SESSION_SECRET and other sensitive environment variables when reusing existing .env files
2. **Role-Based Menu Permissions**: Implemented baseline view permissions for non-admin roles
   - Менеджер документации: dashboard, objects, documents, org_structure, training, audit (6 permissions)
   - Инженер: dashboard, objects, documents, org_structure, training (5 permissions)
   - Settings remains admin-only
3. **File Upload Security**: Enhanced sanitizeFileName function to protect against Windows reserved names (CON, PRN, AUX, NUL, COM1-9, LPT1-9) with automatic prefix addition
4. **Database Migration**: Executed SQL migration to align permission naming (orgstructure → org_structure) and add missing baseline permissions to existing databases

## User Preferences
I want the agent to use simple language and provide detailed explanations when necessary. I prefer an iterative development approach, where changes are proposed and discussed before implementation. Please ask for confirmation before making any major architectural or code structure changes. Do not make changes to the `shared/schema.ts` file without explicit instruction and understanding of the database implications.

## System Architecture
The application is a full-stack project utilizing a React 18 frontend with Vite, TypeScript, and Tailwind CSS for a modern and responsive UI/UX. The backend is built with Express.js and TypeScript. Data persistence is handled by PostgreSQL with Drizzle ORM. Authentication is managed using Passport.js with a local strategy and express-session. UI components leverage Radix UI and shadcn/ui for consistent design. File uploads are managed via Multer, supporting various document types including PDF, Office files, images, and CAD files.

### Key Features:
-   **Document Management**: Upload, categorize, and manage documents with version control capabilities.
-   **Organizational Structure**: Multi-level hierarchy (UMG → Services → Departments) to mirror real-world organization.
-   **Object Management**: Tracking of gas pipeline infrastructure objects, including QR code integration for identification.
-   **Role-Based Access Control**: Granular permissions system to manage user access to features and data.
-   **Training Programs**: Online training modules with tests and certificate generation.
-   **Audit Log**: Comprehensive tracking of user activities within the system.
-   **QR Code Scanner**: Mobile-friendly functionality for scanning object QR codes.

### Technical Implementations:
-   The application runs on port 5000, with Express serving both the API and the React frontend.
-   Database schema includes tables for Users, Roles, Permissions, Organizational units (UMG, Services, Departments), Objects, Document Categories, Documents, Training Programs, Tests, Questions, User Progress, and Audit Logs.
-   Session-based authentication is used.
-   Frontend development utilizes Vite's hot module replacement.
-   Static files in the `/uploads` directory are served by Express.
-   Security headers, including `X-Frame-Options: SAMEORIGIN`, are configured.

## External Dependencies
-   **Frontend Framework**: React 18
-   **Build Tool**: Vite
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS, Radix UI, shadcn/ui
-   **Backend Framework**: Express.js
-   **Database**: PostgreSQL
-   **ORM**: Drizzle ORM
-   **Authentication**: Passport.js, express-session
-   **File Uploads**: Multer
-   **Session Management**: express-session
-   **QR Code Handling**: Integrated scanner for object identification.