# Amaanah Examination Management System - Design Guidelines

## Design Approach

**Selected Approach:** Clean, Modern Minimalist with Amaanah Traditional Colors
**Color Palette:** Green (Primary), White, Black
**Justification:** A professional, trustworthy aesthetic that reflects Amaanah's identity while maintaining excellent usability for an administrative examination system.

## Color System

### Primary Colors
| Color | HSL | Hex | Usage |
|-------|-----|-----|-------|
| Amaanah Green | 141 72% 32% | #1E8F4D | Primary actions, branding, key highlights |
| Rich Black | 160 26% 7% | #0B1C16 | Text, dark backgrounds |
| Pure White | 0 0% 100% | #FFFFFF | Backgrounds, cards |

### Supporting Colors
| Color | HSL | Hex | Usage |
|-------|-----|-----|-------|
| Dark Green | 147 63% 18% | #0F5A2F | Emphasis, dark accents |
| Mint Accent | 153 45% 92% | #E5F5EA | Soft backgrounds, highlights |
| Neutral Gray | 150 10% 45% | #6B7A73 | Muted text, borders |
| Destructive Red | 4 76% 50% | #D92B2B | Errors, warnings, delete actions |
| Warning Amber | 36 90% 55% | #F5A623 | Caution states |

## Typography System

**Primary Font:** Inter (clean, modern sans-serif)
**Arabic Font:** Noto Naskh Arabic, Amiri
**Monospace:** JetBrains Mono (for codes, index numbers)

**Hierarchy:**
- Page Titles: 1.875rem (30px), Medium weight, tracking-tight
- Section Headers: 1.5rem (24px), Medium weight
- Card Headers: 1.125rem (18px), Medium weight
- Body Text: 1rem (16px), Regular weight
- Labels: 0.875rem (14px), Medium weight
- Helper Text: 0.75rem (12px), Regular weight
- Index Numbers/Codes: JetBrains Mono, 0.875rem

## Layout System

**Spacing Scale:** 4, 8, 12, 16, 24, 32, 48, 64 (Tailwind: 1, 2, 3, 4, 6, 8, 12, 16)

**Component Padding:**
- Cards: p-4 to p-6
- Buttons: Default sizing from shadcn
- Form fields: Standard shadcn spacing
- Section gaps: gap-6

**Grid System:**
- Dashboard: 12-column responsive grid
- Card grids: 1-4 columns depending on viewport
- Form layouts: max-w-2xl for single column forms
- Tables: Full width with horizontal scroll on mobile

## Core Components

### Navigation
- **Sidebar:** Clean white/off-white with green accents, 16rem width
- **Header:** Minimal with essential controls (notifications, language, theme, profile)
- **Active State:** Green background with white text for active menu items

### Cards & Containers
- **Cards:** Slight off-white (#FAFBFA), subtle border, small shadow
- **Border Radius:** 0.5rem (8px) - clean and modern
- **Shadows:** Very subtle for clean look

### Buttons
- **Primary:** Green background, white text
- **Secondary:** Light gray background, dark text
- **Outline:** Transparent with border
- **Ghost:** Transparent, subtle hover state
- **Destructive:** Red background for dangerous actions

### Data Display
- **Tables:** Clean with subtle row borders, sticky headers
- **Badges:** Small, rounded-full, color-coded by status
- **Stats Cards:** Grid layout with icon, number, label

### Forms
- **Inputs:** Clean borders, focus ring in green
- **Labels:** Medium weight, positioned above inputs
- **Error States:** Red border, red helper text

## Status Colors

| Status | Light Mode | Dark Mode | Usage |
|--------|------------|-----------|-------|
| Success/Approved | Green | Lighter Green | Approvals, completed |
| Pending | Amber/Yellow | Amber | Waiting for action |
| Rejected/Error | Red | Red | Errors, rejections |
| Active | Green | Green | Currently active items |
| Inactive | Gray | Gray | Disabled items |

## Accessibility Guidelines

- Minimum contrast ratio: 4.5:1 for body text
- Focus indicators on all interactive elements
- Color is never the sole indicator (use icons + text)
- Minimum touch target: 44px x 44px
- Proper ARIA labels on all interactive elements
- Keyboard navigation fully supported

## RTL/Arabic Support

- Full RTL layout support when Arabic selected
- Sidebar moves to right side
- Text alignment switches appropriately
- Arabic fonts loaded for proper rendering
- All icons and layouts mirror correctly

## Responsive Breakpoints

- **Mobile:** < 768px - Single column, stacked layouts
- **Tablet:** 768px - 1024px - 2 column grids, collapsible sidebar
- **Desktop:** > 1024px - Full multi-column layouts, fixed sidebar

## Design Principles

1. **Cleanliness:** Generous whitespace, minimal visual clutter
2. **Consistency:** Same patterns and spacing throughout
3. **Hierarchy:** Clear visual hierarchy using typography and spacing
4. **Professionalism:** Trustworthy, official appearance for examination system
5. **Accessibility:** Inclusive design for all users
6. **Bilingual:** Equal treatment for English and Arabic content
