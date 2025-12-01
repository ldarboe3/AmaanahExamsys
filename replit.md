# Amaanah Examination Management System

## Overview
A comprehensive examination management system for managing countrywide Arabic & Islamic education examinations. The system supports multi-role authentication and provides features for school registration, student enrollment, invoice generation, result processing, and bilingual PDF certificate/transcript generation with Arabic RTL support.

## Current State
The MVP is complete with all core features implemented and verified. PDF generation system for certificates and transcripts is fully functional with Arabic/English bilingual support, QR code verification, and gender-specific templates.

## Recent Changes (December 2024)
- **PDF Generation System**: Implemented Puppeteer-based HTML-to-PDF rendering for certificates and transcripts
- **Bilingual Support**: Arabic/English templates with RTL rendering using Amiri/Noto Naskh fonts
- **QR Verification**: Unique QR tokens for each certificate/transcript with verification endpoints
- **Gender-Specific Templates**: Male/female Arabic grammatical variations in certificate templates
- **Hierarchical Selection**: Region → Cluster → School → Students filtering for bulk document generation
- Fixed frontend-backend API endpoint consistency (all mutations use POST)
- Implemented notification system with in-app dropdown
- Added audit logging with comprehensive activity tracking
- Created advanced export functionality (CSV for schools, students, results, invoices, examiners)
- Added Reports page with download capabilities

## Project Architecture

### Backend (Express + TypeScript)
- **server/routes.ts**: API endpoints for all resources
- **server/storage.ts**: Database access layer using Drizzle ORM
- **server/db.ts**: PostgreSQL connection with Neon
- **server/auth.ts**: Replit Auth integration

### Frontend (React + TypeScript)
- **client/src/pages/**: All application pages
- **client/src/components/**: Reusable UI components (shadcn/ui)
- **client/src/lib/**: Utility functions and API client

### Shared
- **shared/schema.ts**: Database schema and types (Drizzle ORM)

## Features Implemented

### Core Features
1. School Registration with document upload and admin approval
2. Student Management with CSV import and index number generation
3. Invoice Generation with payment tracking
4. Results Management with CSV upload and validation
5. Certificate Generation with PDF templates
6. Examiner Management with duty tracking
7. Analytics Dashboard with performance metrics

### Administrative Features
8. Notification System with in-app alerts
9. Audit Logging for all administrative actions
10. Reports & Exports (CSV format)
11. Region/Cluster Management
12. Subject Management
13. Timetable Management
14. Exam Center Management

## Authentication
Uses Replit Auth with session management. Users authenticate via Replit identity headers.

## Database
PostgreSQL with the following main tables:
- users, schools, students, invoices, payments
- subjects, results, certificates, examiners
- examCenters, examinerAssignments, timetableEntries
- notifications, auditLogs, regions, clusters

## Running the Application
The application runs on port 5000 with:
- Frontend: Vite dev server
- Backend: Express server
- Database: PostgreSQL (Neon)

Start with: `npm run dev`

## User Preferences
- Material Design 3 adherence for all UI components
- Dark/light mode support
- Bilingual support (English/Arabic planned)
