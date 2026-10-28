// VISTA Mobile Editorial Travel Design System Tokens
// Synchronized with Web and stitch_vista_mobile_design_system (DESIGN.md)

export const tokens = {
  colors: {
    // 1. Primary Sky Blue Theme (Editorial Travel Standard)
    primary: '#0284C7',
    primaryDark: '#0369A1',
    primaryPressed: '#0369A1',
    primaryLight: '#38BDF8',
    primarySoft: '#EFF6FF',
    skyBlue: '#0284C7',
    skyBlueLight: '#38BDF8',
    skyBlueSoft: '#EFF6FF',

    // 2. AI Co-Pilot Accent (Deep Oceanic Teal)
    aiCoPilot: '#006C75',
    aiSoft: '#E6F4F5',
    aiTeal: '#006C75',
    aiTealPressed: '#00565D',
    aiTealSoft: '#E6F4F5',
    cyan: '#00cec9',
    cyanLight: '#81ecec',
    cyanGlow: 'rgba(0, 206, 201, 0.45)',

    // 3. Canvas & Surfaces (Clean Slate Tones)
    canvas: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceSubtle: '#F1F5F9',
    surfaceHighlight: '#F1F5F9',
    border: '#E2E8F0',
    borderSubtle: 'rgba(15, 23, 42, 0.06)',
    borderLight: '#E2E8F0',

    // 4. Typography & Ink (High-contrast Slate Hierarchy)
    ink: '#0F172A',
    textPrimary: '#0F172A',
    textMain: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    textDisabled: '#94A3B8',
    muted: '#64748B',
    mutedDark: '#334155',

    // 5. Functional Semantic Status Colors
    success: '#10B981',
    successSoft: '#ECFDF5',
    successLight: 'rgba(16, 185, 129, 0.15)',
    warning: '#F59E0B',
    warningSoft: '#FFFBEB',
    danger: '#EF4444',
    dangerSoft: '#FEF2F2',
    dangerLight: 'rgba(239, 68, 68, 0.15)',
    accent: '#F59E0B',

    // 6. Pill, Badge & Chip Styling
    tealPillBg: 'rgba(0, 108, 117, 0.12)',
    tealPillText: '#006C75',
    tagBg: '#EFF6FF',
    tagText: '#0284C7',

    // 7. Stitch Compatibility Tokens (Material You / Legacy Mapping)
    stitchPrimary: '#0284C7',
    stitchPrimaryFixed: '#d3e4ff',
    stitchSecondary: '#006C75',
    stitchSecondaryFixed: '#5af9f3',
    stitchTertiary: '#0284C7',
    stitchTertiaryFixed: '#e9ddff',
    stitchBackground: '#F8FAFC',
    stitchSurface: '#FFFFFF',
    stitchCard: '#FFFFFF',
    stitchOnSurface: '#0F172A',
    stitchOnSurfaceVariant: '#334155',
    stitchOutline: '#E2E8F0',
    stitchContainerLow: '#F8FAFC',
    stitchContainerHigh: '#EFF6FF',
    stitchContainerLowest: '#FFFFFF',

    // Legacy Dark Palette Keys (gracefully aliased)
    navyDeep: '#0F172A',
    navyCanvas: '#F8FAFC',
    navySurface: '#FFFFFF',
    navyCard: '#FFFFFF',
    navyBorder: '#E2E8F0',
    skyBlueMist: '#EFF6FF',
    skyBlueShimmer: '#38BDF8',
    skyBlueGlow: '#0284C7',
    iridescentBorder: 'rgba(2, 132, 199, 0.25)',
    iridescentGlow: 'rgba(2, 132, 199, 0.15)',
    mintGlow: '#10B981',
    mintText: '#10B981',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22,
    modal: 22,
    full: 9999,
  },
  font: {
    micro: 10,
    small: 12,
    caption: 12,
    body: 14,
    subtitle: 16,
    heading: 18,
    display: 24,
    title: 32,
  },
  shadows: {
    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    cardLift: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    buttonPrimary: {
      shadowColor: '#0284C7',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 10,
      elevation: 3,
    },
    buttonAi: {
      shadowColor: '#006C75',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 3,
    },
    fab: {
      shadowColor: '#0284C7',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 6,
    },
  },
} as const;

export type ThemeTokens = typeof tokens;
