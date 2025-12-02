# Amaanah Public Website - Design Guidelines

## Design Approach

**Selected Approach:** Modern Educational SaaS with Islamic Heritage Touches  
**Reference Inspiration:** Coursera, Khan Academy, Duolingo (friendly education UX) + Islamic geometric pattern subtlety  
**Justification:** Public-facing examination platform needs approachable professionalism that builds trust while engaging prospective students and institutions. Balance contemporary web trends with cultural authenticity.

## Color System

### Primary Palette
- **Teal Primary:** `#0D9488` (HSL: 174, 84%, 32%) - Primary CTAs, links, accents
- **Emerald Dark:** `#047857` (HSL: 160, 84%, 25%) - Headings, emphasis, hover states
- **Teal Light:** `#5EEAD4` (HSL: 173, 80%, 65%) - Gradient accents, highlights
- **Mint Wash:** `#F0FDFA` (HSL: 166, 76%, 97%) - Section backgrounds, cards
- **Pure White:** `#FFFFFF` - Primary backgrounds
- **Charcoal:** `#1F2937` (HSL: 220, 25%, 17%) - Body text, dark elements

### Supporting Colors
- **Warm Gold:** `#F59E0B` (HSL: 38, 92%, 50%) - Achievement badges, Islamic accent
- **Soft Coral:** `#FB7185` (HSL: 351, 95%, 71%) - Secondary CTAs, highlights
- **Sage Green:** `#6EE7B7` (HSL: 156, 73%, 67%) - Success states
- **Slate Gray:** `#64748B` (HSL: 215, 16%, 47%) - Secondary text, muted elements

### Gradients
- **Hero Gradient:** `linear-gradient(135deg, #0D9488 0%, #047857 100%)`
- **Card Accent:** `linear-gradient(to right, #5EEAD4 0%, #0D9488 100%)`
- **Section Overlay:** `linear-gradient(180deg, rgba(13,148,136,0.05) 0%, rgba(255,255,255,0) 100%)`

## Typography System

**Primary Font:** Inter (headings, UI)  
**Body Font:** Inter (optimized for web reading)  
**Arabic Font:** Amiri (elegant, traditional for Arabic content)  
**Accent Font:** Playfair Display (optional decorative headers)

**Hierarchy:**
- Hero Headline: 3.5rem (56px), Bold, tight tracking, teal gradient text effect
- Page Title: 2.5rem (40px), Bold
- Section Headers: 2rem (32px), Semibold
- Subheadings: 1.5rem (24px), Medium
- Body Large: 1.125rem (18px), Regular, slate gray
- Body Text: 1rem (16px), Regular, line-height 1.7
- Small Text: 0.875rem (14px), Medium
- Captions: 0.75rem (12px), Regular

## Layout System

**Spacing Units:** 4, 8, 16, 24, 32, 48, 64, 96 (Tailwind: 1, 2, 4, 6, 8, 12, 16, 24)

**Section Padding:** py-16 to py-24 (desktop), py-12 (mobile)  
**Container Max-Width:** max-w-7xl for full sections, max-w-4xl for content  
**Component Spacing:** gap-8 for card grids, gap-6 for feature lists

## Page Structure & Components

### Hero Section (Full Viewport Impact)
- **Layout:** Two-column split on desktop (60/40 text/image)
- **Height:** 85vh minimum with graceful overflow
- **Background:** Large hero image (students in exam hall, diverse, professional, bright lighting) with teal gradient overlay (opacity 15%)
- **Content:** 
  - Headline with gradient text effect
  - Supporting paragraph (18px)
  - Dual CTA buttons (Primary teal solid + Secondary outline white with backdrop-blur-md)
  - Trust indicators below (e.g., "10,000+ Students Registered")
- **Image Placement:** Right side showing modern exam environment or student success moment

### Features Section
- **Grid:** 3-column desktop, 1-column mobile
- **Cards:** White background, subtle shadow (shadow-lg), rounded-2xl (16px)
- **Card Padding:** p-8
- **Icons:** Teal circular backgrounds (64px diameter) with white icons inside
- **Content:** Icon + Title (20px semibold) + Description (16px gray)
- **Hover:** Lift effect (translate-y-1) + increased shadow

### About/Mission Section
- **Layout:** Alternating two-column (image left/right alternates)
- **Background:** Mint wash (#F0FDFA) with subtle geometric Islamic pattern overlay (10% opacity)
- **Images:** Professional photos of facilities, exam centers, ceremonies
- **Content:** Large headings + 2-3 paragraphs + bullet points highlighting values

### How It Works / Process
- **Layout:** Horizontal step flow with connecting lines
- **Steps:** Numbered circles (teal gradient) with titles below
- **Visual:** Step numbers 1-4 connected by teal dashed lines
- **Background:** White with subtle radial gradient from center

### Testimonials
- **Grid:** 2-column desktop, 1-column mobile
- **Cards:** Light mint background, rounded-xl, p-6
- **Content:** Quote icon (gold), testimonial text (italic), student photo (circular 48px), name + institution (14px)
- **Styling:** Subtle left border (4px teal)

### Statistics/Impact Section
- **Layout:** 4-column stat blocks, centered
- **Background:** Teal gradient background with white text
- **Stats:** Large numbers (48px bold white) + labels (18px white 80% opacity)
- **Icons:** Subtle white outline icons above numbers

### CTA Section (Pre-Footer)
- **Background:** Card with teal-to-emerald gradient
- **Content:** Centered headline (white) + CTA buttons (white background with teal text + white outline)
- **Height:** py-20, generous padding
- **Visual:** Subtle geometric pattern overlay

### Footer
- **Background:** Charcoal (#1F2937)
- **Layout:** 4-column grid (About, Quick Links, Resources, Contact)
- **Content:** Logo + description, navigation links, social icons (teal hover)
- **Bottom Bar:** Copyright + language switcher + privacy links
- **Text Color:** Light gray with white headings

## Component Specifications

### Buttons
- **Primary:** Teal background, white text, rounded-lg (8px), px-6 py-3, semibold, shadow-md, hover:shadow-lg + scale-105
- **Secondary:** White background, teal text, teal border, same sizing
- **Buttons on Images:** White background with backdrop-blur-md, teal text, shadow-xl for visibility
- **Icon Buttons:** Circular, 40px diameter, teal background, white icon

### Cards
- **Border Radius:** rounded-2xl (16px) for feature cards, rounded-xl (12px) for smaller elements
- **Shadows:** shadow-md default, shadow-lg on hover
- **Borders:** 1px solid rgba(13,148,136,0.1) for subtle definition
- **Backgrounds:** White or mint wash depending on section contrast

### Forms (Newsletter, Contact)
- **Input Fields:** White background, border-2 teal on focus, rounded-lg, p-3
- **Labels:** Above inputs, 14px medium weight, charcoal
- **Spacing:** gap-4 between fields
- **Submit Button:** Full-width primary button

### Navigation
- **Header:** Sticky, white background, subtle shadow on scroll
- **Logo:** Left aligned, 40px height
- **Menu Items:** Horizontal, hover:text-teal, active:font-semibold
- **Mobile:** Hamburger menu, slide-in drawer with backdrop
- **CTA in Nav:** Primary button for "Register Now" or "Login"

## Animations (Subtle & Purposeful)

- **Scroll Reveal:** Fade-up effect on section entry (subtle, 300ms)
- **Hover States:** Lift effects on cards (translate-y-1, 200ms ease)
- **Button Hovers:** Scale-105 + shadow increase (150ms)
- **Hero Entry:** Gentle fade-in on headline + CTA (500ms stagger)
- **Stat Counter:** Count-up animation on scroll into view
- **NO:** Parallax, excessive motion, distracting effects

## Images

### Hero Image
- **Description:** Modern, bright exam hall or diverse students studying with confidence. Professional photography, natural lighting, inclusive representation
- **Treatment:** Teal gradient overlay (15% opacity) blending from top-left
- **Placement:** Right 40% of hero section, extends full height

### Section Images
- **About Section:** 2-3 images showing facilities, exam centers, graduation ceremonies
- **Features:** Icon-based, no photography in feature cards
- **Testimonials:** Circular student headshots (48px diameter)
- **Process Section:** Illustrative icons or simple graphics (no photos)

### Image Style Guidelines
- **Tone:** Bright, optimistic, professional
- **Colors:** Natural tones that complement teal palette
- **Subjects:** Diverse students, modern facilities, technology integration
- **Quality:** High-resolution, professionally composed

## Accessibility & Bilingual Support

- **Contrast:** Minimum 4.5:1 for body text, 7:1 for headings
- **Focus States:** 2px teal outline on all interactive elements
- **RTL Support:** Full layout mirroring for Arabic, Amiri font loaded
- **Touch Targets:** 44px minimum for all interactive elements
- **Screen Readers:** Proper ARIA labels, semantic HTML structure

## Responsive Breakpoints

- **Mobile:** <768px - Single column, stacked hero, larger touch targets
- **Tablet:** 768-1024px - 2-column grids, collapsible navigation
- **Desktop:** >1024px - Full multi-column layouts, fixed navigation

## Design Principles

1. **Warmth:** Welcoming teal tones create approachable yet professional atmosphere
2. **Clarity:** Generous whitespace and clear typography hierarchy
3. **Trust:** Official aesthetic through structured layouts and professional imagery
4. **Heritage:** Subtle Islamic geometric patterns in backgrounds (never overwhelming)
5. **Engagement:** Strategic use of gradients and animations to guide attention
6. **Inclusivity:** Bilingual excellence, accessible design for all users