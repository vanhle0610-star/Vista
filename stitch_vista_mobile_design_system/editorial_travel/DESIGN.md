---
name: Editorial Travel
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3f4850'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#707881'
  outline-variant: '#bfc7d2'
  surface-tint: '#006398'
  primary: '#006194'
  on-primary: '#ffffff'
  primary-container: '#007bb9'
  on-primary-container: '#fdfcff'
  inverse-primary: '#93ccff'
  secondary: '#006971'
  on-secondary: '#ffffff'
  secondary-container: '#9ff0fa'
  on-secondary-container: '#096f78'
  tertiary: '#006947'
  on-tertiary: '#ffffff'
  tertiary-container: '#00855b'
  on-tertiary-container: '#f5fff6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#9ff0fa'
  secondary-fixed-dim: '#83d3dd'
  on-secondary-fixed: '#001f23'
  on-secondary-fixed-variant: '#004f56'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  badge:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system delivers an editorial, modern mobile travel companion designed for effortless trip planning, itinerary management, and group collaboration. It embodies clarity, sophistication, and breathability—pairing crisp typography with expansive card-based layouts and deep oceanic sky tones.

### Key Values & Aesthetic Principles
- **Modern Editorial:** Clear hierarchy with decisive bold headings, delicate captions, and generous negative space reminiscent of modern travel print journals.
- **Utilitarian Elegance:** Complex multi-day itineraries, group member rosters, and budget tracking metrics are distilled into glanceable, high-legibility cards.
- **Intelligent Accentuation:** Specialized deep teal tones mark AI-powered trip generation and automated recommendations, clearly distinguished from general navigation and system actions.
- **Mobile First Touch Precision:** Tailored specifically for modern compact touch screens (393px viewport base) with 44px+ touch targets, comfortable bottom navigation, and elevated FAB quick actions.

## Colors

The palette leverages a sunlit, coastal atmosphere grounded by deep slate neutrals for high contrast, ergonomic reading, and Vietnamese diacritics legibility.

### Primary & Action Colors
- **Primary Main (`#0284C7`):** Signature sky blue. Represents journeys, open skies, and primary actions (e.g., CTA buttons, active tab states, selection controls).
- **Primary Pressed (`#0369A1`):** Deep cobalt for active/pressed touch feedback on primary surfaces.
- **Primary Light (`#38BDF8`):** Vivid sky accent used for secondary badges, subtle borders, and progress indicator highlights.
- **Primary Soft (`#EFF6FF`):** Soft ice-tinted background fill for active filter chips, tag highlights, and selected state backdrops.

### AI Co-Pilot Accent
- **AI Accent (`#006C75`):** Deep oceanic teal reserved for AI smart features, automatic route optimizers, and smart assistant callouts.
- **AI Pressed (`#00565D`):** Darker teal state for pressed interactions on AI components.
- **AI Soft (`#E6F4F5`):** Tinted container background for AI recommendation cards.

### Surfaces & Backgrounds
- **Screen Canvas (`#F8FAFC`):** Slate-50 cool grey providing low eye strain and clean contrast against cards.
- **Surface Elevation (`#FFFFFF`):** Pure white container background for cards, bottom sheets, navigation bars, and inputs.
- **Divider & Border (`#E2E8F0`):** Hairline border for crisp separation without visual clutter.

### Typography & Content Neutrals
- **Text Main (`#0F172A`):** Deep slate-900 for headings, main titles, and critical figures.
- **Text Secondary (`#334155`):** Slate-700 for supporting labels and body descriptions.
- **Text Muted (`#64748B`):** Slate-500 for secondary timestamps, icons, helper text, and placeholders.
- **Text Disabled (`#94A3B8`):** Slate-400 for inactive elements and disabled action controls.

### Functional Status Indicators
- **Success (`#10B981` / Soft: `#ECFDF5`):** Status indicators for confirmed members and completed itinerary steps.
- **Warning (`#F59E0B` / Soft: `#FFFBEB`):** Upcoming trips and alerts.
- **Danger (`#EF4444` / Soft: `#FEF2F2`):** Destructive actions, warnings, and budget overruns.

## Typography

The typography leverages `Inter` with fallbacks to system sans-serif (`-apple-system`, `BlinkMacSystemFont`, `Roboto`), optimized for Vietnamese diacritics and compact touchviewports.

### Rules & Hierarchy
- **Diacritic Clearance:** Line heights maintain a minimum factor of 1.35x–1.45x across all Vietnamese accent combinations (hỏi, ngã, nặng, sắc, huyền).
- **Display & Section Titles:**
  - `headline-lg` (32px Bold / ExtraBold): For primary screen headers (e.g., "My Trips", "Khám phá thế giới").
  - `headline-md` (24px Bold): For modal headings, section titles ("Điểm đến nổi bật"), and location details.
  - `headline-sm` (18px Bold): For card titles, destination landmarks, and itinerary highlights.
- **Content & Microcopy:**
  - `body-md` (14px Regular) & `body-lg` (15px Regular): Standard paragraphs, descriptions, and user notes.
  - `label-sm` (12px Medium) & `badge` (11px Bold Uppercase/Capitalized): Pill tags, meta timestamps, member counts, and status indicators.

## Layout & Spacing

A strict 4px/8px modular base rhythm governs vertical cadences and component architecture, tailored for modern mobile viewports (375px to 428px wide, with 393px standard).

### Mobile Grid & Safety
- **Outer Canvas Margins:** 16px (`1rem`) horizontal screen padding keeps touch targets clear of device bezels.
- **Content Gutters:** 12px–16px (`0.75rem`–`1rem`) between card grids and horizontal carousels.
- **Touch Targets:** Minimum 44px height/width on all interactive triggers, buttons, input fields, and icon toggles.
- **Safe Area Insets:** Top header accounting for iOS dynamic island / status bar (47px safe top) and bottom navigation clearing home indicator bar (34px safe bottom).

## Elevation & Depth

Visual hierarchy combines clean tonal surfaces with subtle, tinted ambient shadows for layered floating depth without heavy drop borders.

### Elevation Hierarchy
- **Level 0 (Flat / Canvas):** `#F8FAFC` background canvas for base content surfaces.
- **Level 1 (Card Rest):** Background `#FFFFFF` with boundary border `1px solid #E2E8F0` and subtle ambient shadow `0 2px 8px -2px rgba(15, 23, 42, 0.05)`.
- **Level 2 (Interactive Hover / Pressed):** Card lift with `0 8px 16px -4px rgba(15, 23, 42, 0.08)`.
- **Level 3 (Navigation Bars & Floating Headers):** Backdrop blur `blur(16px)` on `rgba(255, 255, 255, 0.92)` with hair divider `1px solid #E2E8F0` and `0 -4px 12px rgba(0, 0, 0, 0.03)`.
- **Level 4 (Floating Action Button & Overlays):** Deep tinted shadow `0 8px 20px -2px rgba(2, 132, 199, 0.35)` using primary sky color for the centered `+` action button.
- **Level 5 (Modals & Bottom Sheets):** Dimmer backdrop `rgba(15, 23, 42, 0.45)` with sheet shadow `0 -10px 25px -5px rgba(15, 23, 42, 0.12)`.

## Shapes

The shape vocabulary uses soft, modern curvatures balanced between friendliness and structured editorial clean lines.

### Radius Scale
- **Small (6px–8px):** Status badges, tag chips, and micro progress bars.
- **Medium (10px–12px):** Action buttons, input containers, segmented control pills, and dropdown triggers.
- **Large (16px–18px):** Content cards, trip hero thumbnails, and bottom banner modules.
- **Extra-Large (22px–24px):** Bottom sheet upper corners and sticky modal dialogs.
- **Pill / Circular (`9999px`):** Avatar thumbnails, circular FABs, counter dots, and floating back/share action pills.

## Components

### 1. Navigation & Bars
- **Top Header Bar:** 56px height. Left back chevron or brand lockup, centered title (18px SemiBold), right dual action cluster (Share & Favorite, or Notification bell with unread dot). Translucent background with backdrop blur on scroll.
- **Bottom Navigation Bar:** 64px height (+ home indicator offset). 5-item layout:
  - 1: Trang chủ (Home)
  - 2: My Trips (Folder icon)
  - 3: Center FAB (+)
  - 4: Thông báo (Bell)
  - 5: Cá nhân (User)
- **Center Action FAB (+):** 52px diameter circle elevated -18px above the nav bar baseline, painted in Primary `#0284C7` with white icon and soft sky glow.

### 2. Action Buttons
- **Primary Button:** Height 48px, background `#0284C7`, text `#FFFFFF` 15px SemiBold, radius 12px. Pressed state `#0369A1`. Full-width on form bottoms.
- **Outline Button:** Height 48px, background `#FFFFFF`, border `1.5px solid #E2E8F0`, text `#0F172A` 15px SemiBold.
- **AI Action CTA:** Height 44px–48px, background `#006C75`, icon sparkles/AI prefix, text `#FFFFFF` 15px SemiBold. Soft glow shadow.
- **Quick Action Circle:** 40px circle, background `#F8FAFC` or `#EFF6FF`, border `1px solid #E2E8F0`, holds icons for map, calendar, or share.

### 3. Form Inputs & Search
- **Search Bar:** Height 44px, background `#FFFFFF` or `#F1F5F9`, radius 12px, prefix search icon (`#64748B`), clear button on right.
- **Text Input & Select Fields:** Height 50px, border `1px solid #E2E8F0`, radius 12px, font 15px Regular `#0F172A`. Focused state: border `#0284C7` with 3px `#EFF6FF` outer halo.
- **Password Input:** Suffix eye/eye-off toggle button with 44px touch pad.

### 4. Trip Card
- Container: Background `#FFFFFF`, border `1px solid #E2E8F0`, radius 16px, padding 12px.
- Thumbnail: Aspect ratio 16:9 or 80x80px square (in horizontal list view), radius 12px.
- Meta Stack: Top status pill (e.g. "Đang diễn ra" - Emerald, "Sắp tới" - Amber), Trip Title (17px Bold `#0F172A`), Date subtext with calendar icon (`#64748B`).
- Bottom row: Avatar stack (up to 3 avatars overlapping by 8px, plus +N badge) and budget progress indicator bar (`#0284C7` filled track against `#F1F5F9` background).

### 5. Itinerary Timeline Item
- Numbered node on a vertical `#E2E8F0` connector rail.
- Time stamp badge (`08:00 - 08:30`), landmark title (16px SemiBold), subtitle note, and transport connector tag (e.g., "15 phút lái xe • 6.2 km" pill in `#F1F5F9`).

### 6. Badges & Chips
- Status Badges: Padding 4px 8px, radius 6px, 11px Bold text. Color paired to status tones (e.g. Active `#ECFDF5` / `#10B981`).
- Filter Chips: Padding 8px 14px, radius 9999px. Inactive: `#FFFFFF` border `#E2E8F0` text `#334155`. Active: `#0284C7` background with white text or `#EFF6FF` background with `#0284C7` text.