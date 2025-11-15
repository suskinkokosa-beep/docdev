# УправДок - Document Management System

## Overview
УправДок is a full-stack document management system for managing technical documentation of gas pipeline infrastructure. It offers document handling, organizational structure management, user role-based access control, and training programs. The system aims to streamline documentation, enhance operational efficiency, and ensure compliance through structured data management and audit trails.

## User Preferences
I want the agent to use simple language and provide detailed explanations when necessary. I prefer an iterative development approach, where changes are proposed and discussed before implementation. Please ask for confirmation before making any major architectural or code structure changes. Do not make changes to the `shared/schema.ts` file without explicit instruction and understanding of the database implications.

## System Architecture
The application is a full-stack project utilizing a React 18 frontend with Vite, TypeScript, and Tailwind CSS. The backend is built with Express.js and TypeScript. Data persistence is handled by PostgreSQL with Drizzle ORM. Authentication uses Passport.js with a local strategy and express-session. UI components leverage Radix UI and shadcn/ui. File uploads are managed via Multer.

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
-   **ORM**: Drizzle ORM
-   **Authentication**: Passport.js, express-session
-   **File Uploads**: Multer
-   **Session Management**: connect-pg-simple
-   **PDF Viewer**: react-pdf (using pdfjs-dist)
-   **Word Document Preview**: docx-preview
-   **QR Code Handling**: Integrated scanner functionality