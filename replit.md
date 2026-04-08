# Amaanah Examination Management System

## Overview
The Amaanah Examination Management System is a comprehensive platform designed to manage countrywide Arabic & Islamic education examinations. Its primary purpose is to streamline school registration, student enrollment, invoice generation, result processing, and the creation of bilingual PDF certificates and transcripts. The system aims to provide a robust, multi-role environment for efficient management of the entire examination lifecycle from registration to result dissemination, focusing on ease of use, scalability, and security for nationwide application. The project envisions significant market potential by offering a centralized, efficient, and transparent examination management solution across various regions.

## User Preferences
- Modern, clean, and attractive design with teal/emerald color scheme
- Dark/light mode support with smooth transitions
- Bilingual support (English/Arabic) with full RTL support

## System Architecture

The system is built on a robust architecture featuring a React-based frontend, an Express.js and TypeScript backend, and a PostgreSQL database.

### UI/UX Decisions
- **Modern Design System**: Features a fresh teal/emerald color palette, gradient accents, soft shadows, rounded corners, and the Inter font family. Amiri/Noto Naskh fonts are used for PDF generation.
- **Animations**: Incorporates subtle fade-in, hover elevation, and smooth transitions.
- **Theming**: Supports both dark and light modes with automatic theme detection.
- **Bilingual Support**: Full English/Arabic bilingual support with RTL rendering for Arabic.

### Technical Implementations
- **Frontend**: Developed with React and TypeScript, utilizing `shadcn/ui` for components.
- **Backend**: Built with Express.js and TypeScript, handling API endpoints, authentication, and business logic.
- **Database**: PostgreSQL, managed with Drizzle ORM.
- **PDF Generation**: Uses `pdfkit` for Grade 6 certificates and transcripts, with Puppeteer as a fallback. All certificates include QR code verification.
- **Authentication**: Password-based authentication with bcrypt hashing and session management, supporting six distinct user roles.
- **Email Services**: Integrated with SendGrid for reliable email delivery.
- **File Handling**: Multer-based file uploads with object storage integration.
- **Notification System**: Provides role-based in-app notifications.
- **Offline/PWA Support**: Service Worker caches app shell and API GET responses. Mutations are queued to IndexedDB and auto-synced on reconnect.
- **Mobile Packet API**: REST endpoints under `/api/mobile/` for the external Amaanah Examiner mobile app (Expo React Native) with role-based actions and authentication.
- **Public Mobile Timetable API**: Unauthenticated endpoints for mobile app timetable and subject information.
- **Mobile Attendance Count API**: Authenticated API to retrieve attendance totals scoped to the caller's role.

### Feature Specifications
- **School Management**: Profile management, badge upload, invitation systems, region/cluster validation, credential generation, and bulk JSON/CSV import.
- **Student Management**: CSV import, index number generation, 3-tier registration workflow, multi-stage submission with payment confirmation, and surname normalization.
- **Financial Management**: Three-tier fee structure, auto-generated invoices, bank slip uploads, payment confirmation, and professional PDF invoice downloads.
- **Results & Certificates**: Three-tier results navigation, editable marks entry, comprehensive results CSV upload with validation, unified certificate/transcript workflow with bulk generation and QR verification. Includes online result checker and School Results Dashboard.
- **AIITS (Staff Identity & Trust System)**: Manages staff profiles, auto-generates staff IDs, handles ID card lifecycle, and supports bulk ID card printing with verification.
- **Exam Paper Logistics & Tracking**: Event-based tracking of exam packets (packed, dispatched, received, opened, sealed, return_dispatched, return_received, archived) with web dashboard monitoring and mobile PWA for field operations.
- **Exam Scheduling & Time Enforcement**: HQ can create and publish schedules, examiners record actual times, with automatic detection of late starts/ends and reason logging. Mobile timetable displays active exams.
- **Exam Day Workflow**: Supports packet verification via barcode scanning, mismatch detection, live video evidence capture, and automatic GPS/device logging.
- **Exam Execution & Time Enforcement**: HQ-controlled start time gate, examiner recording of actual start/end times with late detection and reason logging. Offline-capable countdown timer.
- **Student Attendance Scanning**: Subject-based attendance tracking via mobile scanner (PWA optimized) with offline queue and GPS capture. Admin Monitoring Dashboard for attendance rates and validation flags.
- **Post-Exam & Paper Return**: Two-step workflow integrated into packet tracking: seal event recording and return dispatch chain with barcode scanning, GPS, and timestamps.
- **Administrative Tools**: Comprehensive audit logging, advanced CSV export, and role-based access control.
- **Exam Management**: Examiner, subject, timetable, and exam center management.
- **Website Management**: CMS for public-facing website content.
- **Past Exam Year Management**: Intelligent visibility and read-only access for completed exam years.

### System Design Choices
- **Modularity**: Emphasizes separation of concerns across API routes, database access, authentication, and UI components.
- **Scalability**: Designed to support countrywide examinations through a multi-tenant architecture.
- **Security**: Utilizes token-based workflows, bcrypt for password hashing, and robust role-based access control.

## External Dependencies
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Email Service**: SendGrid
- **PDF Generation**: pdfkit, Puppeteer
- **Arabic Text Processing**: arabic-reshaper, bidi-js
- **UI Framework**: shadcn/ui
- **Frontend Development**: React, TypeScript, Vite
- **Backend Framework**: Express.js, TypeScript
- **Billing Integration**: Sky OS (via webhook)