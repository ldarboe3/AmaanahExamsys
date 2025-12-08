# Amaanah Examination Management System

## Overview
Amaanah Examination Management System is a comprehensive platform for managing countrywide Arabic & Islamic education examinations. Its primary purpose is to streamline school registration, student enrollment, invoice generation, result processing, and the creation of bilingual PDF certificates and transcripts. The system aims to provide a robust, multi-role environment to efficiently manage the entire examination lifecycle from registration to result dissemination.

## User Preferences
- Modern, clean, and attractive design with teal/emerald color scheme
- Dark/light mode support with smooth transitions
- Bilingual support (English/Arabic) with full RTL support

## System Architecture

The system is built on a robust architecture featuring a React-based frontend, an Express.js and TypeScript backend, and a PostgreSQL database.

### UI/UX Decisions
- **Modern Design System**: Fresh teal/emerald color palette with gradient accents, soft shadows, and rounded corners (design_guidelines.md)
- **Typography**: Inter font family for clean, modern text rendering
- **Animations**: Subtle fade-in, hover elevation, and smooth transitions for engaging user experience
- **Card Designs**: Modern cards with gradient top borders, hover lift effects, and shadow depth
- **Hero Sections**: Full-viewport heroes with gradient overlays and animated text
- Support for both dark and light modes with automatic theme detection
- Full bilingual support (English/Arabic) with RTL rendering for Arabic, utilizing Amiri/Noto Naskh fonts for PDF generation

### Public Website Pages
- **Home**: Modern hero with gradient background, quick access cards, impact statistics, news feed
- **About**: Historical timeline, vision/mission cards, founding institutions, governance structure
- **Organisation Structure**: Administrative units, sub-committees, governance hierarchy
- **Senior Executives**: Leadership roles with responsibilities
- **Statistics Query**: Interactive data filtering by region, cluster, school with visualizations
- **Programmes**: Services and programmes offered
- **Membership**: Registration information and benefits
- **Contact/News/Resources**: Standard informational pages

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
- **School Management**: Profile management, school badge upload, and an invitation system for additional school administrators.
  - **CRITICAL: Regions & Clusters are Authoritative**: During school upload (both JSON and CSV), the system validates that Region and Cluster IDs/names match existing records. **NO new Regions or Clusters are created during upload**. Validation-only approach: CSV values are matched against existing system records. If a Region or Cluster does not exist, error flagged: "Region/Cluster mismatch in Row X — does not match existing records."
  - **School Upload Process**: Schools are uploaded WITHOUT email requirement. Separate login accounts created for each school with:
    - Sequential usernames: SchoolAdmin0001, SchoolAdmin0002, etc.
    - Fixed password: Admin@123 (must change on first login via /change-password)
    - Users stored in users table (separate from schools table)
    - Forced password change enforced via mustChangePassword flag
  - **Credential Export**: Download credentials as UTF-8 CSV with BOM for proper Arabic text rendering, bilingual headers (English/Arabic), and complete school details including username and temporary password.
- **Student Management**: CSV import, index number generation, and a 3-tier registration navigation workflow.
- **Financial Management**: Three-tier fee structure (`feePerStudent`, `certificateFee`, `transcriptFee`), auto-invoice generation, bank slip upload, payment confirmation, and professional PDF invoice downloads. School admin payments page shows current invoice with examination year badge and past invoices table with columns for invoice number, examination year, payment amount, status, and download button.
- **Results & Certificates**: 
  - **Three-Tier Results Navigation**: 
    - Level 1: All Examination Years as interactive boards
    - Level 2: Grades (3, 6, 9, 12) as color-coded boards  
    - Level 3: Editable marks table with Region/Cluster/School filtering
  - **Editable Marks Entry**: Interactive table format with columns: School Name, Address, Region, Student Name, [Subject columns as editable inputs], Total Marks (auto-calculated), Percentage (auto-calculated)
  - Real-time auto-calculation of Total Marks and Percentage as marks are entered (0-100 per subject)
  - Pagination controls: 10/50/100 students per page
  - Dynamic student list updates based on Region/Cluster/School filters
  - **Comprehensive Results CSV Upload**: 
    - Template download with correct database subject headers by grade
    - Arabic Text Cleaner for robust matching (normalizes spaces, removes tatweel, unifies alef forms, strips punctuation, converts Arabic digits)
    - Schools/Students are authoritative - NO auto-creation during upload, only matching
    - Mark validation (0-100 range) with invalid mark tracking
    - Error downloads: unmatched schools, unmatched students, no marks rows, invalid marks
    - Error files include raw + normalized values for diagnosis
    - UTF-8-SIG encoding for Excel compatibility
  - **Unified Certificate/Transcript Workflow**: Both certificates and transcripts follow identical patterns:
    - Eligibility-based student selection from published results
    - Filter system (exam year, region, cluster, school) with summary statistics
    - Checkbox selection for individual or bulk generation
    - View/Preview button (Eye icon) showing document details before download
    - Print All button for bulk printing selected documents
    - Generate All button for bulk certificate/transcript generation
  - **Grade 6 Arabic Transcripts**: Single unified view (no tabs) for Arabic transcript generation
  - Public result checker, PDF certificate and transcript generation with gender-specific templates and QR verification
- **Administrative Tools**: Comprehensive audit logging, advanced export functionalities (CSV), and role-based access control.
- **Exam Management**: Examiner, subject, timetable, and exam center management.
- **Website Management**: Public-facing website content management system for news, resources, and announcements.
- **Past Exam Year Management**: Intelligent visibility and read-only mode for completed exam years.

### System Design Choices
- **Modularity**: Separation of concerns with dedicated folders for API routes, database access, authentication, and UI components.
- **Scalability**: Designed to manage countrywide examinations with a multi-tenant architecture for schools.
- **Security**: Token-based workflows for invitations and password resets, bcrypt for password hashing, and role-based access control.

## Recent Changes (December 8, 2025)
- **Payment Instructions Management**: Super Admin can configure bank details for school payments:
  - New "Bank" tab in Settings page for super_admin users only
  - Configurable fields: Bank Name, Branch Name, Account Name, Account Number, SWIFT/BIC Code, Additional Instructions
  - Settings stored in systemSettings table with "payment" category
  - Public API endpoint `/api/public/payment-instructions` returns configured bank details
  - School payments page dynamically displays payment instructions from settings
  - Shows fallback message if payment instructions not configured

## Previous Changes (December 6, 2025)
- **Online Result Checker Enhancement**: Comprehensive public result checker for candidates:
  - Three-field search form: Examination Year dropdown, Grade/Level dropdown, Index Number
  - Displays student information, subject-by-subject results with grades and pass/fail status
  - Summary statistics: average score, passed subjects count, failed subjects count
  - **Transcript Generation & Download**: Students can generate, download, and print their official academic transcript directly from the result checker
  - Bilingual support (English/Arabic) with RTL layout
- **Certificate Watermark**: Added Amaanah logo watermark (15% opacity) to certificates for authenticity
- **Transcript Watermark**: Added Amaanah logo watermark (15% opacity) to transcripts for authenticity
- **Public API Endpoints**:
  - `/api/public/exam-years` - List all examination years
  - `/api/public/results/search` - Search results with exam year, grade, and index number filters
  - `/api/public/transcripts/generate` - Generate transcript by index number
  - `/api/public/transcripts/:indexNumber/download` - Download transcript PDF
- **Fixed Transcript Table Layout**: Corrected RTL column ordering to match official PDF format
- **Grade 6 Arabic Transcripts**: Single unified view with proper table formatting and bilingual header
- **School List Export**: Backend API endpoint `/api/export/schools/csv` fetches all matching schools (not paginated), supports filters (search, status, schoolType/schoolTypes, region, cluster), and uses UTF-8 BOM for proper Arabic text rendering in Excel
- **View School Credentials**: Secure `/api/schools/:id/credentials` endpoint with database role verification (prevents privilege escalation), displays school admin username and password (shows default only if not changed), with copy and email functionality
- **Student List Countdown Timer**: Intelligent visibility based on role and payment status:
  - Hidden for super_admin and examination_admin users
  - Hidden when payment is approved (shows green confirmation message)
  - Hidden when payment is pending/processing (shows yellow "Payment Under Review" message)
  - Shown when payment is rejected/failed (shows red rejection alert with countdown timer)
  - Priority logic ensures rejected status always takes precedence over pending status

## External Dependencies
- **Database**: PostgreSQL (hosted on Neon)
- **ORM**: Drizzle ORM
- **Email Service**: SendGrid (via Replit Connector)
- **PDF Generation**: Puppeteer
- **UI Framework**: shadcn/ui
- **Frontend Development**: React, TypeScript, Vite
- **Backend Framework**: Express.js, TypeScript
- **Authentication**: Replit Auth (for initial integration, then custom password-based with bcrypt)