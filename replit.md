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
- **PDF Generation**: Uses pdfkit (native Node.js) for Grade 6 certificates and transcripts, with Arabic text rendering via arabic-reshaper + bidi-js for proper bidirectional text handling. Shared utility in `server/arabicTextHelper.ts` centralizes Arabic text processing. Primary certificates and invoices use Puppeteer with browser pooling as fallback. QR code verification included in all certificates.
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
- **AIITS (Staff Identity & Trust System)**:
  - **Staff Profile Management**: Create, edit, search, filter staff profiles with photo upload. Staff ID numbers auto-generated (AMS-00001 format) with confirmation codes. Includes 8-digit Employee ID (auto-generated, unique) and Department field.
  - **ID Card Lifecycle**: Status transitions: Created → Printed → Issued → Activated → Suspended/Revoked. Full audit trail via staff_id_events table.
  - **Staff ID Card PDF**: Portrait-oriented CR-80 format (54mm × 85.6mm) designed for MagiCard Enduro 3e printer. Two-sided card with green wave design. Front: circular photo, name (English/Arabic), role, department, Employee ID, phone, email, Code128 barcode. Back: logo, terms & conditions, signature area, issue/expiry dates, QR code, Code128 barcode. Barcodes generated via bwip-js using employeeId as data.
  - **Bulk ID Card Printing**: API endpoint `/api/staff-profiles/bulk-id-cards` generates multi-page PDF with front+back pages for all staff filtered by department or role. Frontend UI with department selector and bulk print button.
  - **Department Management**: 10 predefined departments (Administration, Examinations, Logistics, Finance, HR, IT & Systems, QA, Regional Operations, Training & Development, Communications). Department filter in staff table and form.
  - **Public Staff Verification**: Public page at /verify-staff/:staffId for QR-based or manual staff identity verification.
  - **Access Control**: HQ-only access (super_admin, examination_admin) for staff profile management.
  - **Key Files**: server/staffIdCardService.ts, client/src/pages/staff-identity.tsx, client/src/pages/verify-staff.tsx
- **Exam Paper Logistics & Tracking**:
  - **Packet Management**: Create and track exam paper packets with unique barcodes (PKT-{year}-G{grade}-{subject}-C{center}-{sequence}).
  - **Chain of Custody**: Full tracking HQ → Region → Cluster → Center (forward) and reverse (return) with handover logging.
  - **Status Lifecycle**: 17-state progression with enforced transition rules preventing invalid status changes.
  - **Handover Logging**: Records sender/receiver staff, GPS coordinates, timestamps, direction, and notes for each custody transfer.
  - **Direction Validation**: Enforces forward/return direction consistency with location hierarchy.
  - **Offline Sync**: Mobile-ready API with clientEventId-based idempotency and bulk sync endpoint.
  - **Dashboard Stats**: Real-time overview of packet counts by status and location type.
  - **Access Control**: super_admin, examination_admin, logistics_admin roles for packet management.
  - **Key Files**: client/src/pages/packet-tracking.tsx, shared/schema.ts (examPackets, handoverLogs), server/routes.ts (exam-packets section)
- **Exam Scheduling & Time Enforcement**:
  - **Schedule Creation**: HQ creates exam schedules (date, start time, duration, subject, grade) with publish workflow.
  - **Pre-sync API**: Published schedules available via `/api/exam-schedules/sync` for mobile app consumption.
  - **Start/End Recording**: Examiner devices record actual start/end times via API with automatic late detection (>5 min threshold).
  - **Late Start Tracking**: 10 reason codes (transport_delay, weather, security_incident, etc.) with detailed notes.
  - **Late End Tracking**: Automatic delay calculation with reason logging.
  - **HQ Monitoring Dashboard**: Real-time view of on-time/late starts, late ends, in-progress sessions, and per-center status.
  - **Access Control**: HQ roles (super_admin, examination_admin) for schedule management; all roles for session recording.
  - **Key Files**: client/src/pages/exam-scheduling.tsx, server/routes.ts (exam-schedules section), shared/schema.ts (examSchedules, examSessionLogs)
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
- **PDF Generation**: pdfkit (primary for Grade 6), Puppeteer (fallback for primary certificates)
- **Arabic Text Processing**: arabic-reshaper + bidi-js
- **UI Framework**: shadcn/ui
- **Frontend Development**: React, TypeScript, Vite
- **Backend Framework**: Express.js, TypeScript

## Deployment Status
- **TypeScript Compilation**: 0 errors (production-ready)
- **Build Configuration**: build.mjs uses esbuild for server bundling and Vite for client
- **Server Configuration**: Configured for DigitalOcean App Platform with PORT environment variable and 0.0.0.0 host binding
- **ES5 Compatibility**: Map/Set iterations use Array.from() for compatibility
- **Recent Fixes**: Function declarations converted to arrow functions, type mismatches resolved, non-existent property references removed