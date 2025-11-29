# Amaanah Examination Management System - Design Guidelines

## Design Approach

**Selected Approach:** Design System - Material Design 3
**Justification:** This is a utility-focused, information-dense administrative platform requiring efficiency, learnability, and trust. Material Design 3 provides robust patterns for complex data management, forms, and multi-role dashboards.

## Typography System

**Font Family:** Roboto (primary), Roboto Mono (data/codes)

**Hierarchy:**
- Page Titles: 2.5rem (40px), Medium weight
- Section Headers: 1.75rem (28px), Medium weight
- Card/Module Headers: 1.25rem (20px), Medium weight
- Body Text: 1rem (16px), Regular weight
- Data Labels: 0.875rem (14px), Medium weight
- Helper Text: 0.75rem (12px), Regular weight
- Index Numbers/Codes: Roboto Mono, 0.875rem, Medium weight

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-4 or p-6
- Section spacing: mb-8, mt-6
- Card gaps: gap-4 or gap-6
- Form field spacing: space-y-4

**Grid System:**
- Admin dashboards: 12-column grid for data tables
- Form layouts: Single column (max-w-2xl) for data entry
- Card grids: 2-3 columns for stat cards, school lists, student cards
- Responsive: Stack to single column on mobile

## Core Components

### Navigation
- **Admin Sidebar:** Fixed left sidebar (w-64) with role-based menu items, collapsible on mobile
- **Top Bar:** Full-width header with breadcrumbs, user profile, notifications, quick actions
- **School Dashboard:** Horizontal tab navigation for different modules

### Data Display
- **Tables:** Striped rows, sortable headers, sticky header on scroll, pagination controls
- **Stat Cards:** Grid of 2x2 or 3x1 showing key metrics (registered students, pending approvals, revenue)
- **Status Badges:** Pill-shaped badges for payment status, approval status, registration status
- **Progress Indicators:** Linear progress bars for registration deadlines, circular for completion percentage

### Forms & Input
- **Text Fields:** Outlined style with floating labels, helper text below, error states with icons
- **File Upload:** Drag-and-drop zone with file type indicators and upload progress
- **CSV Upload:** Dedicated component showing template download link, upload zone, validation feedback
- **Selectors:** Dropdown menus for grade selection, school type, region/cluster
- **Date Pickers:** Calendar popup for deadline management
- **Search Bars:** Prominent search with filter chips for tables

### Action Components
- **Primary Buttons:** Contained style (filled background), used for main actions (Submit, Approve, Generate)
- **Secondary Buttons:** Outlined style, used for auxiliary actions (Cancel, Download Template)
- **Icon Buttons:** Circular, for table actions (Edit, Delete, View)
- **Floating Action Button:** For quick-add actions (Add Student, Create Exam Year)

### Cards & Containers
- **Dashboard Cards:** Elevated (shadow) cards with header, content area, optional footer actions
- **Student Cards:** Compact cards showing photo placeholder, name, index number, school, grade
- **Exam Center Cards:** Display center name, region, assigned schools count, capacity
- **Document Upload Cards:** Show document name, upload status, preview/download actions

### Modals & Overlays
- **Confirmation Dialogs:** For critical actions (approve all students, publish results)
- **Detail Panels:** Slide-in drawer from right for viewing student details, school profile
- **Snackbar Notifications:** Bottom notification for success/error feedback

### Specialized Components
- **Index Number Display:** Monospace font in prominent card with barcode rendering
- **Countdown Timer:** Large numeric display with days/hours/minutes for registration deadlines
- **Exam Card Layout:** 10-per-page grid (2 columns × 5 rows) with barcode, student info, school logo placeholder
- **Certificate Preview:** A4 ratio container with border, formal layout, bilingual text support
- **Result Table:** Multi-column table with subject scores, totals, grade calculations

## Page-Specific Layouts

### Admin Dashboard
- Top stat cards (4 columns)
- Quick actions section
- Recent activity table
- Charts for analytics (if needed)

### School Registration
- Multi-step form wizard with progress indicator
- Step 1: Basic info + email verification
- Step 2: Profile details (contacts, address, type, region)
- Step 3: Document uploads
- Success confirmation with dashboard redirect

### Student Registration
- Template download section with instructions
- CSV upload zone with drag-drop
- Validation feedback list showing errors/warnings
- Preview table of uploaded students
- Submit for approval button

### Payment Dashboard
- Invoice summary card
- Payment method selection (radio buttons)
- Bank slip upload interface
- Payment history table

### Result Management
- Upload marksheet template section
- Validation status indicators
- Bulk approve/reject controls
- Export/download options

### Public Result Checker
- Centered single-column layout (max-w-md)
- Input form for index number + PIN
- Result display card with verification seal graphic

## Images

**Hero Images:** Not applicable - this is a utility application focused on data management

**Functional Images:**
- **School Logo Placeholders:** Square avatars (64px × 64px) in school cards and student cards
- **Document Thumbnails:** PDF/image previews in document management sections
- **Barcode Generation:** Dynamically generated barcodes on exam cards and certificates
- **Verification Seals:** SVG graphic on certificates and result verification pages
- **Empty States:** Illustrations for "no students registered," "no results yet" (use icon-based illustrations)

## Iconography

**Library:** Material Icons (via CDN)
- Dashboard: dashboard, assessment, school
- Students: person, group, badge
- Payments: payment, receipt, account_balance
- Documents: description, upload_file, picture_as_pdf
- Actions: check_circle, cancel, edit, delete, download
- Navigation: menu, arrow_back, more_vert

## Accessibility

- All forms must have proper labels and ARIA attributes
- Tables must have proper headers and scope attributes
- Color is never the only indicator of status (use icons + text)
- Keyboard navigation fully supported for all interactive elements
- Focus indicators on all focusable elements
- Min touch target size: 44px × 44px for mobile

## Responsive Behavior

- **Desktop (1280px+):** Full sidebar, multi-column layouts, expanded tables
- **Tablet (768-1279px):** Collapsible sidebar, 2-column grids, horizontal scroll for wide tables
- **Mobile (< 768px):** Bottom navigation, single column, card-based table alternatives, stacked forms