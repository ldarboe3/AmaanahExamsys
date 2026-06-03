# Business Requirements Document (BRD)
## Examination & Multi-School Management System

**Document purpose:** This BRD explains how the existing Amaanah Examination Management System works, and reframes it as a reusable blueprint you can tailor for **school examinations and multi-school management bodies in e-Fankanta**.

**Version:** 1.0
**Date:** June 2026
**Status:** Reference / Adaptation blueprint

---

## 1. Executive Summary

The system is a centralized, web-based platform that manages the **full lifecycle of examinations across many schools** — from school onboarding and student enrollment, through payment, exam logistics, exam-day operations, marking, and finally the issuance of verifiable certificates and transcripts.

Its core value is that it lets a **central examination body** (HQ) coordinate **many independent schools** and **field staff spread across regions** through one source of truth, with role-based access so each participant only sees and does what their job requires.

For e-Fankanta, this same architecture supports:
- A **central education/examinations body** overseeing standards and results.
- **Multiple schools** registering and managing their own students.
- **Regional / cluster supervisors** coordinating logistics and quality on the ground.
- **Parents/students** checking results and verifying certificates online.

---

## 2. Business Objectives

| # | Objective | Why it matters |
|---|-----------|----------------|
| 1 | Centralize examination management across all schools | One trusted record instead of scattered spreadsheets |
| 2 | Standardize registration, fees, and results | Fairness and comparability between schools |
| 3 | Secure the exam supply chain (papers/scripts) | Prevent leaks, loss, and tampering |
| 4 | Produce verifiable certificates & transcripts | Stop forgery; enable instant third-party verification |
| 5 | Provide transparency to schools and the public | Schools track their own status; public checks results |
| 6 | Support field operations offline | Works in low-connectivity exam centers |
| 7 | Scale countrywide / district-wide | Multi-tenant by region, cluster, and school |

---

## 3. Stakeholders & User Roles

The system is **multi-role**. Each role has a defined scope and permissions.

| Role | Who they are | What they do |
|------|--------------|--------------|
| **Super Admin** | System owner / IT administrator | Full control: users, global settings, regions, clusters, exam years, audit logs |
| **Examination Admin** | HQ exams team | Subjects, timetables, exam centers, results validation, certificate & transcript generation |
| **Logistics Admin** | HQ logistics team | Oversees exam packet tracking and paper/script movement nationwide |
| **Regional Logistics** | Regional field officer | Scans and tracks exam materials within their **region** (mobile-first) |
| **Cluster Logistics** | Cluster field officer | Same as above, scoped to a **cluster** (group of schools) |
| **School Admin** | Head/registrar of a school | Registers and manages their school's students, pays invoices, views their results |
| **Examiner** | Invigilator / marker | Records attendance and exam start/end times; enters/marks results |
| **Candidate** | Student | Activates an account via exam card; checks results, downloads transcript, verifies certificate |

> **For e-Fankanta:** Rename these to fit your structure — e.g. *Ministry/Board Admin*, *District Coordinator*, *Cluster Supervisor*, *Head Teacher*, *Teacher/Invigilator*, *Student/Parent*. The permission model stays the same.

---

## 4. Organizational Structure (Multi-School Model)

The system is built around a **geographic hierarchy** that makes multi-school management possible:

```
Examination Body (HQ)
   └── Region (e.g. a district / division)
         └── Cluster (a group of nearby schools)
               └── School
                     └── Student
```

- **Regions** and **Clusters** let HQ delegate oversight without losing central control.
- Each **School** belongs to a cluster/region and only manages its own students.
- Field staff are **scoped** to their region or cluster — they cannot see or act outside it.
- **Exam Centers** (venues where exams are sat) are managed separately and can host students from multiple schools, with named **halls/rooms** and capacities.

This is the key to "multi-school management bodies": HQ sets the rules, schools operate independently within them, and regional/cluster officers coordinate the middle layer.

---

## 5. End-to-End Process Flow

### Stage 1 — School Onboarding
- Schools **self-register** through a public form, or HQ **bulk-imports** them (CSV/Excel).
- Email verification confirms the registrar; HQ **approves** the school.
- Bulk-imported schools are auto-approved with generated login credentials.

### Stage 2 — Student Enrollment
- Approved schools enroll students individually or via **bulk CSV/Excel upload**.
- Captures biographical data, grade level, and subject selection; optional student photos.
- Each student receives a unique **index number** once approved.

### Stage 3 — Fees & Payment
- The system **auto-generates invoices** based on enrollment (registration fee, per-student fee, certificate/transcript fees).
- Schools pay by bank transfer and **upload a bank slip** as proof.
- HQ finance **confirms payment**; paid students become eligible for exam cards.

### Stage 4 — Scheduling & Exam Cards
- HQ creates the **exam timetable** (manual or AI-assisted).
- **Exam admission cards** are generated as PDFs (photo, index number, schedule, venue).

### Stage 5 — Exam Logistics (Paper Tracking)
- Exam paper **packets** are tracked through a chain of custody:
  `Packed → Dispatched → Received → Opened → Sealed → Return Dispatched → Return Received → Archived`
- Each step is scanned (barcode/QR) with **GPS and timestamp** logging via mobile.

### Stage 6 — Exam Day
- **Time enforcement:** HQ-controlled start gate; examiners record actual start/end times, with automatic flagging of late starts and reason logging.
- **Attendance:** invigilators scan/record student attendance per subject (mobile, offline-capable).
- **Security:** packet open/seal events logged for audit.

### Stage 7 — Marking & Results
- Results uploaded in **bulk via CSV**, validated against subject maximums and matched by index number.
- Once validated, results are **published** to schools and the public results checker.

### Stage 8 — Certification
- **Transcripts** and **certificates** generated as secure, often **bilingual** PDFs.
- Each carries a **QR code** for instant **public verification** by employers, schools, or authorities.

---

## 6. Functional Requirements (by module)

| Module | Key capabilities |
|--------|------------------|
| **School Management** | Self-registration, approval, bulk import, profiles, badges, credential generation |
| **Student Management** | Individual & bulk enrollment, index numbers, photos, multi-stage approval |
| **Financial Management** | Auto invoices, tiered fees, bank slip upload, payment confirmation, PDF invoices |
| **Scheduling** | Timetable creation (manual + AI), publishing, exam card generation |
| **Logistics & Tracking** | Packet lifecycle, barcode/QR scanning, GPS, chain of custody, return tracking |
| **Exam Day** | Start-time gate, actual time recording, late detection, attendance scanning |
| **Results** | Bulk CSV upload, validation, three-tier navigation, editable marks, publication |
| **Certification** | Bulk certificate/transcript generation, QR verification, public checker |
| **Staff Identity (IDs)** | Staff profiles, auto-generated staff IDs, ID card lifecycle and printing |
| **Notifications** | Role-based in-app alerts (e.g. "payment slip uploaded") |
| **Audit & Reporting** | Comprehensive audit logs, CSV exports, dashboards |
| **Website/CMS** | Manage public-facing content (news, announcements, stats) |

---

## 7. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| **Security** | Password hashing, session management, role-based access control, audit logging, token-based verification |
| **Scalability** | Multi-tenant by region/cluster/school; supports countrywide volumes |
| **Availability** | Offline/PWA support — field staff work without connectivity; actions queue and sync on reconnect |
| **Usability** | Modern, clean UI; dark/light mode; mobile-first for field roles |
| **Localization** | Full bilingual support (e.g. English + local language) with right-to-left rendering where needed |
| **Verifiability** | Every certificate/transcript independently verifiable via QR/public portal |
| **Auditability** | Every significant action is logged with actor, timestamp, and details |

---

## 8. Key Data Entities

- **User** (with role + assigned region/cluster/school scope)
- **Region → Cluster → School → Student** (the hierarchy)
- **Exam Year** (cycle: fees, grades, dates)
- **Subject** and **Timetable**
- **Invoice / Payment**
- **Exam Center** and **Hall**
- **Exam Packet** and **Packet Events** (chain of custody)
- **Attendance** records
- **Result** records
- **Certificate** and **Transcript** (with QR token)
- **Staff Profile** and **Staff ID**
- **Audit Log** and **Notification**

---

## 9. Adapting This for e-Fankanta

Below is a practical mapping from the existing national-exam model to a **school examination + multi-school management** context.

### 9.1 What to keep as-is
- The **HQ → Region → Cluster → School → Student** hierarchy (rename to your terms, e.g. *Board → District → Zone → School → Student*).
- **Role-based access** and scoping.
- **Bulk import** for schools and students (essential for onboarding many schools fast).
- **Invoice → payment → confirmation** flow (works for term/exam fees).
- **Results upload → validation → publication**.
- **QR-verifiable certificates/transcripts** and the **public results checker**.
- **Audit logging** for trust and accountability.

### 9.2 What to adjust
| Existing concept | e-Fankanta adaptation |
|------------------|------------------------|
| National exam year | **School term / academic year** with multiple internal exams (mid-term, end-of-term) |
| Single grade-6/9 focus | **All class levels** (e.g. Grade 1–12) with per-class subject sets |
| Central paper logistics | Optional — may be lighter for school-internal exams; keep for shared/board exams |
| One examination body | A **board/association** overseeing **member schools** in e-Fankanta |
| Index number per candidate | **Student ID** persistent across terms, plus per-exam seat numbers |
| Certificate per national exam | **Report cards / term results** plus end-of-cycle certificates |

### 9.3 Likely new requirements for e-Fankanta
- **Continuous assessment**: combine classwork + exam scores into a final grade (weighted).
- **Report card generation** per term (not just end-of-cycle certificates).
- **Parent access**: a parent role to view their child's results and attendance.
- **Cross-school analytics**: compare performance across member schools (for the management body).
- **Teacher gradebook**: teachers enter marks per class/subject directly, not only bulk CSV.
- **School-level dashboards**: each school sees its own enrollment, fees, and results trends.

### 9.4 Suggested phased rollout
1. **Phase 1 — Foundation:** schools, students, users/roles, hierarchy, bulk import.
2. **Phase 2 — Assessment:** subjects, exams, marks entry, results validation & publication.
3. **Phase 3 — Outputs:** report cards, transcripts, certificates, QR verification.
4. **Phase 4 — Finance:** fees, invoices, payment tracking.
5. **Phase 5 — Operations:** attendance, exam scheduling, logistics (if needed).
6. **Phase 6 — Insight:** dashboards, cross-school analytics, parent portal.

---

## 10. Assumptions & Constraints

- Internet access is intermittent in some locations → offline-first for field operations.
- Multiple languages may be required → bilingual + RTL support built in.
- Schools have varying IT literacy → bulk import + simple, guided UIs.
- Trust and anti-fraud are critical → QR verification + full audit trail.
- The management body sets shared standards; schools operate within them.

---

## 11. Success Metrics

- % of member schools onboarded and active.
- Time to enroll a full school cohort (target: minutes via bulk import).
- % of exams with complete, validated results published on time.
- Number of certificate verifications performed (adoption of trust feature).
- Reduction in disputes/errors vs. manual/spreadsheet processes.
- Fee collection rate and time-to-confirm payments.

---

*This BRD is a reference blueprint. The next step for e-Fankanta is to confirm the role names, the class/term structure, and which modules are in scope for Phase 1, then translate this into a detailed functional spec.*
