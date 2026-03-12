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
- **Offline/PWA Support**: Service Worker (`client/public/sw.js`) caches app shell and API GET responses. Mutations (POST/PUT/DELETE) while offline are queued to IndexedDB (`client/src/lib/offlineQueue.ts`) and auto-synced on reconnect. Global `OfflineSyncBanner` shows offline status and pending queue count. Toast notifications confirm when items are saved offline. Service Worker is only registered in production (`import.meta.env.PROD`). Certificate/transcript PDF generation still requires server connectivity.

### Feature Specifications
- **School Management**: Includes profile management, badge upload, invitation systems, authoritative region/cluster validation, and credential generation for school administrators. Supports bulk JSON/CSV import for schools, automatically granting access.
- **Student Management**: Features CSV import, index number generation, a 3-tier registration workflow, and multi-stage submission with payment confirmation. Includes automatic surname normalization against an approved list of Gambian surnames for accuracy on official documents.
- **Financial Management**: Manages a three-tier fee structure, auto-generates invoices, handles bank slip uploads, and confirms payments, offering professional PDF invoice downloads.
- **Results & Certificates**: Offers a three-tier results navigation, editable marks entry (admin-only), comprehensive results CSV upload with validation, and a unified certificate/transcript workflow with bulk generation and QR verification. Provides an online result checker for candidates and a read-only School Results Dashboard with global ranking and PDF report downloads. Automated email and in-dashboard notifications are sent to relevant schools upon result publication. Transcripts display school name with address format ("School Name - Address"), gender-sensitive nationality (غامبي for males, غامبية for females), and support bulk selection (select page, select all filtered), generation, and printing of multiple transcripts. Admin can delete all transcripts for regeneration.
- **AIITS (Staff Identity & Trust System)**: Manages staff profiles, auto-generates staff IDs, handles ID card lifecycle (Created to Revoked), and supports bulk ID card printing in a CR-80 format with barcodes and QR codes. Includes a public verification page for staff identities.
- **Exam Paper Logistics & Tracking (Phase 2 – Event-Based)**: Rebuilt around a `packetEvents` table (event types: packed, dispatched, received, opened, sealed, return_dispatched, return_received, archived). Web dashboard (`/packet-tracking`) is now monitoring-only with stats overview, filterable packet list, chain-of-custody timeline modal, and a barcode look-up tab. Mobile PWA (`/mobile-packet-scan`) is the field operations interface: scan-first barcode input, role-based action buttons, offline IndexedDB queue with auto-sync, GPS capture, sync status indicator, and recent activity log. Backward-compatible with existing `handover_logs` + `exam_packets` tables.
- **Exam Scheduling & Time Enforcement**: Allows HQ to create and publish exam schedules. Facilitates recording of actual exam start/end times by examiners, with automatic detection and logging of late starts and ends, including reason codes. A HQ monitoring dashboard provides real-time oversight.
- **Exam Day Workflow (Phase 4)**: Supports packet verification via barcode scanning, mismatch detection, live video evidence capture (10-second recordings stored offline and synced to object storage), and automatic GPS/device logging for each verification. An admin dashboard flags missing evidence or mismatches.
- **Exam Execution & Time Enforcement (Phase 5)**: Implements an HQ-controlled start time gate for exams. Examiners can record actual start/end times, with automatic late start/end detection and mandatory reason logging. Features an offline-capable countdown timer with audible alerts and session resumption capabilities.
- **Student Attendance Scanning (Phase 6)**: Subject-based attendance tracking split into two interfaces: (1) Mobile Scanner (`/mobile-attendance-scan`) — mobile-PWA optimized barcode scanning page for examiners and field staff; offline IndexedDB queue with auto-sync, vibration feedback, GPS capture, per-subject selection, recent scan log with sync status badges. (2) Admin Monitoring Dashboard (`/student-attendance`) — admin-only two-tab page: Monitoring tab (attendance rates by region/cluster/center/subject), Validation Flags tab (three inconsistency types: attended-but-no-marks, marks-but-no-attendance, passing-marks-but-no-attendance). Examiners see the mobile scanner in their sidebar.
  - **Key Files**: client/src/pages/mobile-attendance-scan.tsx, client/src/pages/student-attendance.tsx, server/routes.ts (attendance-scan section + /api/attendance/monitoring-summary + /api/attendance/validation-flags), shared/schema.ts (attendanceRecords), server/storage.ts
- **Post-Exam & Paper Return (Phase 7)**: Two-step post-exam workflow integrated into packet-tracking.tsx. Step 1: Seal event recording after exam completion with barcode scan and return seal number entry; enforces 'administered' status requirement. Step 2: Return dispatch chain (Center→Cluster→Region→HQ) via barcode scan with sender/receiver recording, GPS, and timestamps. Backend enforces 'sealed' status before return dispatch. Uses existing offline handover queue for connectivity loss.
  - **Key Files**: client/src/pages/packet-tracking.tsx (post-exam tab), server/routes.ts (seal + handover endpoints), shared/schema.ts (examPackets sealed fields)
- **Mobile Packet API (Amaanah Examiner App Integration)**: 5 REST endpoints under `/api/mobile/packets` for the external Amaanah Examiner mobile app (Expo React Native). No session auth required — staff identified by EID in request body. Endpoints: `GET /api/mobile/packets` (list+filter), `GET /api/mobile/packets/stats`, `GET /api/mobile/packets/:barcode` (with full scan history), `GET /api/mobile/packets/:barcode/action?role=` (next available action per role), `POST /api/mobile/packets/scan` (submit scan, advance status, reject duplicates). Role→action→status mapping: hq_staff dispatches/receives_return; regional_coordinator receives/dispatches/forwards_return; cluster_officer receives/dispatches/receives_return/forwards_return; examiner receives/opens/seals/dispatch_return. Scan history stored in `mobile_packet_scans` table.
  - **Public Mobile Timetable API**: Two unauthenticated endpoints for the mobile app timetable: (1) `GET /api/public/subjects` — returns all subjects as `[{id, name, grade}]` (Option A subject resolution); (2) `GET /api/public/exam-schedules` — returns published schedules enriched with `subjectName` (transparently resolved from the subjects table, so IDs like 51 show as the proper Arabic/English name). Supports query params: `examYearId`, `grade`, `centerId`, `clusterId`, `regionId`, `includePackets=true`. When `includePackets=true`, each schedule includes a `packets` array with `{id, barcode, centerName, centerId, status, received}` where `received=true` means the packet has reached the exam center (statuses: at_center, opened, sealed, or any return stage).
  - **Mobile Attendance Count API**: `GET /api/mobile/attendance/count` (auth: `X-Staff-ID: {EID}` header). Returns attendance totals scoped to the caller's role. Query params: `subject` (subject name), `examYearId` (defaults to active year), plus exactly one scope param: `center` (examiner scope), `cluster` (cluster officer scope), `region` (regional coordinator scope), or none (HQ national scope). Response: `{total, scopeLabel, subjectName, centerBreakdown: [{center, centerId, count}]}` sorted highest→lowest. Authentication rejects unknown EIDs with 401.
  - **Key Files**: server/routes.ts (mobile packet API section + public subjects/schedules), server/storage.ts (createMobilePacketScan, getMobilePacketScans), shared/schema.ts (mobilePacketScans)
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