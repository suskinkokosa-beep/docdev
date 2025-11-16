# УправДок - Document Management System

## Overview
УправДок is a full-stack document management system for managing technical documentation of gas pipeline infrastructure. It offers document handling, organizational structure management, user role-based access control, and training programs. The system aims to streamline documentation, enhance operational efficiency, and ensure compliance through structured data management and audit trails.

## User Preferences
I want the agent to use simple language and provide detailed explanations when necessary. I prefer an iterative development approach, where changes are proposed and discussed before implementation. Please ask for confirmation before making any major architectural or code structure changes. Do not make changes to the `shared/schema.ts` file without explicit instruction and understanding of the database implications.

## System Architecture
The application is a full-stack project utilizing a React 18 frontend with Vite, TypeScript, and Tailwind CSS. The backend is built with Express.js and TypeScript. Data persistence is handled by PostgreSQL with Drizzle ORM using the node-postgres (pg) driver for universal compatibility across Replit and Ubuntu environments. Authentication uses Passport.js with a local strategy and express-session. UI components leverage Radix UI and shadcn/ui. File uploads are managed via Multer.

### Key Features:
-   **Document Management**: Upload, categorize, and manage documents with version control.
-   **Organizational Structure**: Multi-level hierarchy (UMG → Services → Departments).
-   **Object Management**: Tracking of gas pipeline infrastructure objects with QR code integration.
-   **Role-Based Access Control**: Granular permissions system for user access.
-   **Training Programs**: Online training modules with tests and certificate generation.
-   **Audit Log**: Comprehensive tracking of user activities.
-   **QR Code Scanner**: Mobile-friendly functionality for scanning object QR codes.
-   **PWA Mobile Application**: Offline-ready Progressive Web App with mobile navigation and QR scanner.

### Technical Implementations:
-   The application runs on port 5000, with Express serving both the API and the React frontend.
-   Database schema includes tables for Users, Roles, Permissions, Organizational units, Objects, Documents, Training, and Audit Logs.
-   Session-based authentication is used.
-   Frontend development utilizes Vite's hot module replacement.
-   Static files in the `/uploads` directory are served by Express.
-   Security headers, including `X-Frame-Options: SAMEORIGIN`, are configured.
-   The `install.sh` script is designed for idempotent, non-interactive production deployments, supporting CI/CD pipelines. It handles database setup, PWA installation, and environment configuration.
-   The document viewer supports PDF (local worker), Word (.docx via docx-preview, .doc with download option), Excel (.xlsx/.xls converted to HTML), images, and text files.

## External Dependencies
-   **Frontend Framework**: React 18
-   **Build Tool**: Vite
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS, Radix UI, shadcn/ui
-   **Backend Framework**: Express.js
-   **Database**: PostgreSQL
-   **Database Driver**: pg (node-postgres) - Universal PostgreSQL driver
-   **ORM**: Drizzle ORM with node-postgres adapter
-   **Authentication**: Passport.js, express-session
-   **File Uploads**: Multer
-   **Session Management**: connect-pg-simple
-   **PDF Viewer**: react-pdf (using pdfjs-dist)
-   **Word Document Preview**: docx-preview
-   **QR Code Handling**: Integrated scanner functionality

## Recent Changes

### Document Viewer Improvements (November 16, 2025)
-   **Enhanced Excel Rendering**: Completely rewritten Excel document viewer with professional table styling including borders, alternating row colors, hover effects, and header formatting
-   **Improved Word Document Preview**: Optimized docx-preview configuration with support for headers, footers, footnotes, endnotes, and experimental rendering features for better formatting preservation
-   **XSS Security Hardening**: All user-controlled content (cell values, sheet names) is properly HTML-escaped to prevent injection attacks
-   **Safe Static Styling**: Excel tables use CSS classes instead of workbook-controlled inline styles, eliminating security risks while maintaining professional appearance
-   **UTF-8 Filename Support**: Added decodeFileName() helper function to correctly handle Russian/Cyrillic characters in filenames during upload and download
-   **Robust Error Handling**: Improved error messages and loading states for better user experience when documents fail to load

### Replit Environment Setup (November 15, 2025)

### Replit Environment Setup
-   **Database**: Configured PostgreSQL database with Replit's built-in PostgreSQL service
-   **Database Schema**: Applied database migrations successfully using Drizzle ORM
-   **Seed Data**: Populated database with initial test data including admin user (username: `admin`, password: `admin123`)
-   **Workflow**: Configured development workflow to run on port 5000 with `npm run dev`
-   **Deployment**: Configured autoscale deployment with build step (`npm run build`) and production start (`npm start`)
-   **File Structure**: Created uploads directory for user-uploaded files with proper permissions
-   **Git Configuration**: Added comprehensive .gitignore file for Node.js, TypeScript, and build artifacts

### Ubuntu 20+ Installation Script Improvements
-   **pg_hba.conf Configuration**: Автоматическая настройка PostgreSQL для разрешения подключений с паролем через localhost (md5 authentication)
-   **Enhanced Error Handling**: Добавлена логика retry с 3 попытками для тестирования подключения к БД
-   **Improved Diagnostics**: Расширенная диагностика ошибок с выводом содержимого pg_hba.conf и полезными командами для отладки
-   **Safe Backup**: Автоматическое создание резервных копий pg_hba.conf перед модификацией
-   **Idempotent Operations**: Скрипт безопасно запускается повторно без дублирования настроек

### Database Connection Improvements
-   **Startup Validation**: Приложение проверяет подключение к БД при запуске и завершается с ясной ошибкой если БД недоступна
-   **Error Logging**: Добавлен обработчик ошибок pool для логирования неожиданных проблем с подключением
-   **Graceful Shutdown**: Приложение корректно завершает работу если не может подключиться к базе данных
-   **Connection Test**: Функция testDatabaseConnection() для проверки подключения перед запуском сервера

### Environment Configuration
The application is now configured with:
-   DATABASE_URL: PostgreSQL connection (configured automatically by Replit)
-   SESSION_SECRET: Secure session key (configured automatically by Replit)
-   NODE_ENV: Set to development for dev mode, production for deployment
-   PORT: 5000 (frontend and backend both served by Express)

### Login Credentials
-   **Admin User**: username: `admin`, password: `admin123`
-   Change the admin password after first login for security

### Development Notes
-   The Vite dev server is properly configured for Replit with `host: "0.0.0.0"`, `port: 5000`, and `allowedHosts: true`
-   Express serves both the API routes and the Vite frontend in development mode
-   PostCSS warning about missing `from` option is non-critical and doesn't affect functionality
-   All dependencies installed successfully (537 packages including pg)
-   Database connection is validated on startup with clear error messages
-   Application uses node-postgres (pg) driver for universal compatibility with both Replit and Ubuntu PostgreSQL instances
-   The pg driver works seamlessly with Replit's PostgreSQL service and standard Ubuntu PostgreSQL installations