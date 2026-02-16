# Amaanah Examination Management System

## Overview
The Amaanah Examination Management System is a comprehensive platform designed to manage countrywide Arabic & Islamic education examinations. Its primary purpose is to streamline school registration, student enrollment, invoice generation, result processing, and the creation of bilingual PDF certificates and transcripts. The system aims to provide a robust, multi-role environment for efficient management of the entire examination lifecycle from registration to result dissemination, focusing on ease of use, scalability, and security for nationwide application.

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
- **PDF Generation**: Uses `pdfkit` for Grade 6 certificates and transcripts, with advanced Arabic text rendering. Puppeteer is used as a fallback for other certificates and invoices. All certificates include QR code verification.
- **Authentication**: Password-based authentication with bcrypt hashing and session management, supporting six distinct user roles.
- **Email Services**: Integrated with SendGrid for reliable email delivery.
- **File Handling**: Multer-based file uploads with object storage integration.
- **Notification System**: Provides role-based in-app notifications.

### Feature Specifications
- **School Management**: Includes profile management, badge upload, invitation systems, authoritative region/cluster validation, and credential generation for school administrators. Supports bulk JSON/CSV import for schools, automatically granting access.
- **Student Management**: Features CSV import, index number generation, a 3-tier registration workflow, and multi-stage submission with payment confirmation. Includes automatic surname normalization against an approved list of Gambian surnames for accuracy on official documents.
- **Financial Management**: Manages a three-tier fee structure, auto-generates invoices, handles bank slip uploads, and confirms payments, offering professional PDF invoice downloads.
- **Results & Certificates**: Offers a three-tier results navigation, editable marks entry (admin-only), comprehensive results CSV upload with validation, and a unified certificate/transcript workflow with bulk generation and QR verification. Provides an online result checker for candidates and a read-only School Results Dashboard with global ranking and PDF report downloads. Automated email and in-dashboard notifications are sent to relevant schools upon result publication.
- **AIITS (Staff Identity & Trust System)**: Manages staff profiles, auto-generates staff IDs, handles ID card lifecycle (Created to Revoked), and supports bulk ID card printing in a CR-80 format with barcodes and QR codes. Includes a public verification page for staff identities.
- **Exam Paper Logistics & Tracking**: Enables creation and tracking of exam paper packets with unique barcodes, implementing a chain of custody system (HQ → Region → Cluster → Center and reverse) with 17-state progression and enforced transition rules. Features handover logging with GPS coordinates, dedicated receive/dispatch workflows with location validation, and an offline event queue for data capture during connectivity loss. Provides dashboard statistics on packet counts.
- **Exam Scheduling & Time Enforcement**: Allows HQ to create and publish exam schedules. Facilitates recording of actual exam start/end times by examiners, with automatic detection and logging of late starts and ends, including reason codes. A HQ monitoring dashboard provides real-time oversight.
- **Exam Day Workflow (Phase 4)**: Supports packet verification via barcode scanning, mismatch detection, live video evidence capture (10-second recordings stored offline and synced to object storage), and automatic GPS/device logging for each verification. An admin dashboard flags missing evidence or mismatches.
- **Exam Execution & Time Enforcement (Phase 5)**: Implements an HQ-controlled start time gate for exams. Examiners can record actual start/end times, with automatic late start/end detection and mandatory reason logging. Features an offline-capable countdown timer with audible alerts and session resumption capabilities.
- **Student Attendance Scanning (Phase 6)**: Barcode scanning for student exam cards with instant green checkmark feedback and optional vibration. Auto-returns to scan mode after each scan. Duplicate scan detection (checks both local IndexedDB and server records) with silent "Already recorded" message. Each record links student index number, subject, exam center, examiner (via recordedBy), and timestamp. Fully offline using IndexedDB with automatic background sync when online. Backend enforces center assignment validation for examiners.
  - **Key Files**: client/src/pages/student-attendance.tsx, server/routes.ts (attendance-scan section), shared/schema.ts (attendanceRecords), server/storage.ts
- **Administrative Tools**: Includes comprehensive audit logging, advanced CSV export, and role-based access control.
- **Exam Management**: Covers examiner, subject, timetable, and exam center management.
- **Website Management**: Provides a CMS for public-facing website content.
- **Past Exam Year Management**: Offers intelligent visibility and read-only access for completed exam years.

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