# Amaanah Examination Management System

## Overview
Amaanah Examination Management System is a comprehensive platform designed to manage countrywide Arabic & Islamic education examinations. Its core purpose is to streamline school registration, student enrollment, invoice generation, result processing, and the creation of bilingual PDF certificates and transcripts. The system aims to provide a robust, multi-role environment for efficient management of the entire examination lifecycle from registration to result dissemination, with a focus on ease of use, scalability, and security.

## User Preferences
- Modern, clean, and attractive design with teal/emerald color scheme
- Dark/light mode support with smooth transitions
- Bilingual support (English/Arabic) with full RTL support

## System Architecture

The system is built on a robust architecture featuring a React-based frontend, an Express.js and TypeScript backend, and a PostgreSQL database.

### UI/UX Decisions
- **Modern Design System**: Fresh teal/emerald color palette with gradient accents, soft shadows, and rounded corners.
- **Typography**: Inter font family for clean, modern text rendering; Amiri/Noto Naskh fonts for PDF generation.
- **Animations**: Subtle fade-in, hover elevation, and smooth transitions.
- **Card Designs**: Modern cards with gradient top borders, hover lift effects, and shadow depth.
- **Hero Sections**: Full-viewport heroes with gradient overlays and animated text.
- Supports both dark and light modes with automatic theme detection.
- Full bilingual support (English/Arabic) with RTL rendering for Arabic.

### Technical Implementations
- **Frontend**: Developed with React and TypeScript, leveraging `shadcn/ui` for reusable components.
- **Backend**: Built with Express.js and TypeScript, handling API endpoints, authentication, and business logic.
- **Database**: PostgreSQL, managed with Drizzle ORM.
- **PDF Generation**: Utilizes Puppeteer with browser pooling for high-quality HTML-to-PDF rendering of certificates, transcripts, and invoices, including QR code verification. Shared browser instance with 1-minute idle timeout dramatically improves performance by avoiding new browser launches for each PDF.
- **Authentication**: Password-based authentication with bcrypt hashing and session management, supporting six distinct user roles: `super_admin`, `examination_admin`, `logistics_admin`, `school_admin`, `examiner`, and `candidate`.
- **Email Services**: Integrated with SendGrid for reliable email delivery.
- **File Handling**: Multer-based file uploads with object storage integration.
- **Notification System**: Role-based in-app notifications.
- **Website CMS**: Integrated content management system for public-facing content.

### Feature Specifications
- **School Management**: Profile management, school badge upload, invitation system for school administrators. Features authoritative Regions & Clusters validation during upload and a specific school admin credential generation process. Imported schools (via bulk JSON/CSV upload) are automatically granted complete access with `registrationFeePaid: true`, bypassing payment restrictions and providing immediate dashboard access without requiring payment of the registration fee.
- **Student Management**: CSV import, index number generation, and a 3-tier registration navigation workflow. Includes a multi-stage student submission workflow with payment confirmation.
  - **Surname Normalization**: Automatic validation and normalization of surnames against an approved Gambian surname list (80+ surnames with alternate spellings). Matching uses: exact lookup → diacritic normalization → fuzzy matching (Levenshtein ≤1) → transliteration for common variants (Diallo→Jallow, Cissé→Ceesay, etc.). Normalized surnames are stored at data entry and used on all official PDFs.
- **Financial Management**: Three-tier fee structure, auto-invoice generation (including a mandatory registration fee for new schools), bank slip upload, payment confirmation, and professional PDF invoice downloads.
- **Results & Certificates**:
  - **Three-Tier Results Navigation**: Interactive boards for examination years and grades, leading to editable marks tables with filtering.
  - **Editable Marks Entry**: Interactive tables with real-time auto-calculation of total marks and percentages (Admin only).
  - **Comprehensive Results CSV Upload**: Template download, Arabic text cleaning, authoritative school/student matching, and mark validation with detailed error reporting.
  - **Unified Certificate/Transcript Workflow**: Eligibility-based student selection, filtering, bulk generation, preview, and print functionalities. Includes gender-specific templates and QR verification.
  - **Online Result Checker**: Public checker for candidates to search results and generate/download transcripts.
  - **School Results Dashboard**: Read-only results view with no edit/upload capabilities. Shows student results in table format with global examination ranking (across all participating schools). Schools can download PDF reports with official Amaanah logo and address. PDF features:
    - **Global Ranking**: Rankings calculated across all schools for the same exam year and grade (not per-school)
    - **Arabic Final Result**: Result column displays Arabic text only (نجح for Pass, رسب for Fail)
    - **Enhanced Readability**: Increased font sizes (12px table body, 11px headers) for better board-level review
    - **Multi-Page Layout**: Approximately 20 student rows per page, with automatic pagination across multiple pages
    - **Safe Filenames**: Sanitized school names with special character handling for HTTP compatibility
  - **Result Publication Notifications**: When results are published, automatic email and in-dashboard notifications are sent to all schools with registered students for that examination. Schools without registered students are excluded from notifications.
- **Administrative Tools**: Comprehensive audit logging, advanced CSV export functionalities, and role-based access control.
- **Exam Management**: Examiner, subject, timetable, and exam center management.
- **Website Management**: Public-facing website content management system.
- **Past Exam Year Management**: Intelligent visibility and read-only mode for completed exam years.

### System Design Choices
- **Modularity**: Separation of concerns for API routes, database access, authentication, and UI components.
- **Scalability**: Designed for countrywide examinations with a multi-tenant architecture.
- **Security**: Token-based workflows, bcrypt for password hashing, and role-based access control.

## External Dependencies
- **Database**: PostgreSQL (hosted on Neon)
- **ORM**: Drizzle ORM
- **Email Service**: SendGrid (via Replit Connector)
- **PDF Generation**: Puppeteer
- **UI Framework**: shadcn/ui
- **Frontend Development**: React, TypeScript, Vite
- **Backend Framework**: Express.js, TypeScript