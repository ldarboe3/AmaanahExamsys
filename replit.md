# Amaanah Examination Management System

## Overview
A comprehensive examination management system for managing countrywide Arabic & Islamic education examinations. The system supports multi-role authentication and provides features for school registration, student enrollment, invoice generation, result processing, and bilingual PDF certificate/transcript generation with Arabic RTL support.

## Current State
The MVP is complete with all core features implemented and verified. PDF generation system for certificates and transcripts is fully functional with Arabic/English bilingual support, QR code verification, and gender-specific templates.

## Recent Changes (December 2024)
- **Auto-Invoice Generation System**: Automatic invoice calculation based on registered students
  - `feePerStudent` field added to exam years for configurable registration fees
  - Invoice items table stores per-grade breakdown (grade, count, fee, subtotal)
  - Auto-generation triggered after CSV student upload for school admins
  - Invoice summary dialog shows breakdown by grade after upload
  - API endpoints: `/api/invoices/generate`, `/api/invoices/auto-generate`, `/api/invoices/:id/details`, `/api/school/invoice`
  - Enhanced Payments page for school admins:
    - View invoice with grade-by-grade breakdown
    - Bank account details for payment
    - Bank slip upload functionality with status tracking
    - Processing status after slip upload pending admin verification
  - Admin view continues showing all invoices across schools
  - Bank slip upload endpoint: `/api/invoices/bank-slip`
- **Role-Based Notification System**: Comprehensive in-app notification system
  - Notification service (`server/notificationService.ts`) with role-based targeting
  - Helper functions: `notifyUser`, `notifyUsersByRole`, `notifyAllSchoolAdmins`
  - Triggers on exam year creation, registration deadlines, school approvals, result publishing
  - Scheduler integration for automated deadline reminders (daily when <3 days, weekly otherwise)
  - Priority styling in dropdown: urgent notifications show red border/background
  - Action links: clicking notification navigates to relevant page (e.g., /students for registration)
  - Notification types: exam_year_created, registration_deadline, payment_reminder, result_published, school_approved, student_approved, action_required, system_alert
- **School Admin Invitation System**: Invite additional administrators to manage school
  - Token-based invitation workflow with 48-hour expiry
  - School admins can invite other users via email
  - Invited users complete credential setup via `/school-invite/:token` page
  - New `schoolInvitations` table to track pending/completed invitations
  - Bilingual email templates for invitations
  - Status tracking: pending, completed, expired
  - API endpoints: `GET/POST /api/school/invitations`, `POST /api/school/invitations/:id/resend`, `POST /api/school/invitations/:token/complete`
- **School Badge Upload**: School logo/badge image support
  - Image-only validation (JPEG/PNG, max 10MB)
  - Displayed in school profile card with hover upload overlay
  - Stored in `schoolBadge` field in schools table
- **School Profile Management**: Full school profile editing for school admins
  - Editable fields: school name, registrar name, phone, address, primary school type, school types, region, cluster
  - Document upload system: registration certificate, land ownership, operational license
  - Multer-based file handling with 10MB limit, PDF/JPG/PNG support
  - Object storage integration for document persistence
  - Backend API endpoints: `GET/POST /api/school/profile`, `POST /api/school/documents/upload`, `POST /api/school/documents/delete`
  - Bilingual UI (English/Arabic) with sidebar navigation link
- **Student Dashboard Interactive Grade Cards**: Redesigned Students page with grade-based dashboard
  - Interactive card grid replaces previous tabs UI
  - Each card displays: grade label, student count, pending/approved indicators
  - Cards have direct Upload CSV and Download Template buttons
  - Clicking a card reveals detailed view with student list
  - Back navigation to return to grade dashboard
  - Fallback to all grades (3, 6, 9, 12) when no active exam year
  - Responsive layout: 1 col mobile, 2 col tablet, 4 col desktop
  - **Registration Deadline Countdown**: Bold countdown clock in grade detail view
    - Displays days, hours, minutes, seconds until registration deadline
    - Updates every second in real-time
    - Only shows when active exam year has registrationEndDate set
    - Bilingual support (English/Arabic)
- **Resend Verification Email Feature**: Admin tool to resend school verification emails
  - Added "Resend Verification Email" button in Schools management dropdown
  - Only appears for pending schools without verified emails
  - Generates new 2-hour expiry verification tokens
  - Sends from branded email address `info@amaanah.gm`
  - Bilingual support (English/Arabic)
  - API endpoint: `POST /api/schools/:id/resend-verification`
- **School Verification Workflow Redesigned**: Streamlined self-service registration
  - Email verification now includes username/password creation in one step
  - Schools are auto-approved upon completing verification (no manual admin approval needed)
  - New `/school-verify/:token` page with secure credential setup
  - Password reset functionality via `/forgot-password` with 2-hour expiry links
  - Added "Forgot password?" link on login page
  - API endpoints: `/api/schools/verify-info/:token`, `/api/schools/verify/:token/complete`, `/api/schools/forgot-password`, `/api/schools/reset-password`
- **Public Result Checker**: Full bilingual (English/Arabic) result lookup system
  - Access via `/results` page on public website
  - Search by student index number
  - Displays student info, subject results, summary statistics
  - PDF result slip download with Amaanah branding
  - RTL support for Arabic language mode
  - API endpoints: `/api/public/results/:indexNumber` and `/api/public/results/:indexNumber/pdf`
- **Website Content Management System (CMS)**: Full CMS for managing website content
  - News Articles with categories, featured articles, and publishing workflow
  - Resources (downloadable files) management
  - Announcements management
  - Newsletter subscriber management
  - Impact stats management for homepage
  - Admin access via `/website-management` route (super_admin and examination_admin only)
- **Public Website Integration**: News and Home pages now fetch content from CMS with graceful fallbacks
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
1. School Registration with email verification and auto-approval after credential setup
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
Uses password-based authentication with bcrypt hashing and session management. The system supports six user roles with different access levels.

### Login Page
Access the login page at `/login` to sign in with username and password.

### User Roles
| Role | Description | Access Level |
|------|-------------|--------------|
| super_admin | Full system access | All features, user management, system settings |
| examination_admin | Exam management | Results, certificates, students, subjects |
| logistics_admin | Center & logistics management | Exam centers, timetables, examiners |
| school_admin | School-level access | Own school students, payments, results |
| examiner | Examination duties | Assigned center duties, attendance |
| candidate | Student access | Own results, certificates |

### Test Credentials
All six user roles have test accounts with the following credentials:

| Role | Username | Password |
|------|----------|----------|
| Super Admin | superadmin | Admin@123 |
| Examination Admin | examinationadmin | Admin@123 |
| Logistics Admin | logisticsadmin | Admin@123 |
| School Admin | schooladmin | Admin@123 |
| Examiner | examiner | Admin@123 |
| Candidate | candidate | Admin@123 |

### Logout
Click the user profile in the sidebar and select "Sign Out" to log out.

## Database
PostgreSQL with the following main tables:
- users, schools, students, invoices, payments
- subjects, results, certificates, examiners
- examCenters, examinerAssignments, timetableEntries
- notifications, auditLogs, regions, clusters
- newsArticles, newsCategories, resources, resourceCategories
- announcements, newsletterSubscribers, impactStats
- schoolInvitations (for admin invitation workflow)

## Running the Application
The application runs on port 5000 with:
- Frontend: Vite dev server
- Backend: Express server
- Database: PostgreSQL (Neon)

Start with: `npm run dev`

## Email Configuration
- **Service**: SendGrid via Replit Connector for reliable email delivery
- **From Email**: Configured via SendGrid sender authentication
- **Features**: School verification, password reset, payment confirmation, results notification
- **Expiry**: 2-hour links for all sensitive operations
- **Status**: ✅ Fully functional - verified email delivery working

## User Preferences
- Material Design 3 adherence for all UI components
- Dark/light mode support
- Bilingual support (English/Arabic planned)
