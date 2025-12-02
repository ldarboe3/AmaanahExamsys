# Amaanah Examination Management System

## Overview
Amaanah Examination Management System is a comprehensive platform for managing countrywide Arabic & Islamic education examinations. Its primary purpose is to streamline school registration, student enrollment, invoice generation, result processing, and the creation of bilingual PDF certificates and transcripts. The system aims to provide a robust, multi-role environment to efficiently manage the entire examination lifecycle from registration to result dissemination.

## User Preferences
- Material Design 3 adherence for all UI components
- Dark/light mode support
- Bilingual support (English/Arabic planned)

## System Architecture

The system is built on a robust architecture featuring a React-based frontend, an Express.js and TypeScript backend, and a PostgreSQL database.

### UI/UX Decisions
- Adherence to Material Design 3 for a consistent and modern user interface.
- Support for both dark and light modes.
- Full bilingual support (English/Arabic) with RTL rendering for Arabic, utilizing Amiri/Noto Naskh fonts for PDF generation.

### Technical Implementations
- **Frontend**: Developed with React and TypeScript, leveraging `shadcn/ui` for reusable components.
- **Backend**: Built with Express.js and TypeScript, handling API endpoints, authentication, and business logic.
- **Database**: PostgreSQL, managed with Drizzle ORM for database interactions and hosted on Neon.
- **PDF Generation**: Utilizes Puppeteer for high-quality HTML-to-PDF rendering of certificates, transcripts, and invoices, including QR code verification.
- **Authentication**: Password-based authentication with bcrypt hashing and session management, supporting six distinct user roles: `super_admin`, `examination_admin`, `logistics_admin`, `school_admin`, `examiner`, and `candidate`.
- **Email Services**: Integrated with SendGrid via Replit Connector for reliable email delivery for verification, password resets, and notifications.
- **File Handling**: Multer-based file uploads for documents (e.g., school badges, registration certificates) with object storage integration for persistence.
- **Notification System**: Role-based in-app notification system with scheduled reminders and priority styling.
- **Website CMS**: Integrated content management system for news articles, resources, announcements, and impact statistics.

### Feature Specifications
- **School Management**: Registration with email verification, profile management, school badge upload, and an invitation system for additional school administrators.
- **Student Management**: CSV import, index number generation, and a 3-tier registration navigation workflow.
- **Financial Management**: Three-tier fee structure (`feePerStudent`, `certificateFee`, `transcriptFee`), auto-invoice generation, bank slip upload, payment confirmation, and professional PDF invoice downloads.
- **Results & Certificates**: CSV upload for results, public result checker, PDF certificate and transcript generation with gender-specific templates and QR verification.
- **Administrative Tools**: Comprehensive audit logging, advanced export functionalities (CSV), and role-based access control.
- **Exam Management**: Examiner, subject, timetable, and exam center management.
- **Website Management**: Public-facing website content management system for news, resources, and announcements.
- **Past Exam Year Management**: Intelligent visibility and read-only mode for completed exam years.

### System Design Choices
- **Modularity**: Separation of concerns with dedicated folders for API routes, database access, authentication, and UI components.
- **Scalability**: Designed to manage countrywide examinations with a multi-tenant architecture for schools.
- **Security**: Token-based workflows for invitations and password resets, bcrypt for password hashing, and role-based access control.

## External Dependencies
- **Database**: PostgreSQL (hosted on Neon)
- **ORM**: Drizzle ORM
- **Email Service**: SendGrid (via Replit Connector)
- **PDF Generation**: Puppeteer
- **UI Framework**: shadcn/ui
- **Frontend Development**: React, TypeScript, Vite
- **Backend Framework**: Express.js, TypeScript
- **Authentication**: Replit Auth (for initial integration, then custom password-based with bcrypt)