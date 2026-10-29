/**
 * FINN Design Tokens
 * Restrained, deliberate, production-quality financial design tokens.
 */

export const tokens = {
  colors: {
    brand: {
      forest: '#1B4332',
      forestHover: '#143326',
      forestLight: '#EBF3EE',
      forestMuted: '#2D6A4F',
      forestBorder: '#C2DBCB',
    },
    neutral: {
      bgMainLight: '#FBFBF9',
      bgMainDark: '#0F1210',
      surfaceLight: '#FFFFFF',
      surfaceDark: '#151917',
      surfaceSubtleLight: '#F6F7F5',
      surfaceSubtleDark: '#1C221F',
      borderLight: '#E8EAE6',
      borderDark: '#242D28',
      textPrimaryLight: '#141716',
      textPrimaryDark: '#F0F3F1',
      textSecondaryLight: '#58605C',
      textSecondaryDark: '#9BA6A0',
      textMutedLight: '#8A928E',
      textMutedDark: '#6B7771',
    },
    semantic: {
      positive: '#166534',
      positiveBg: '#F0FDF4',
      positiveDark: '#4ADE80',
      negative: '#991B1B',
      negativeBg: '#FEF2F2',
      negativeDark: '#F87171',
      warning: '#92400E',
      warningBg: '#FFFBEB',
      warningDark: '#FBBF24',
      info: '#1E40AF',
      infoBg: '#EFF6FF',
    },
    charts: [
      '#1B4332', // Forest (Main)
      '#2D6A4F', // Dark Mint
      '#52B788', // Sage green
      '#748E83', // Slate green
      '#3A506B', // Deep steel
      '#9C7A5B', // Warm ochre
      '#D08C51', // Terracotta
      '#6C757D', // Muted stone
    ]
  },
  typography: {
    fontSans: "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.8125rem',  // 13px - optimized for financial data tables
      base: '0.875rem', // 14px - primary UI text
      md: '1rem',       // 16px
      lg: '1.125rem',   // 18px - card titles
      xl: '1.25rem',    // 20px - section headers
      '2xl': '1.5rem',  // 24px - page titles
      '3xl': '1.875rem',// 30px - primary net worth figures
    },
    weights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    }
  },
  radii: {
    sm: '0.25rem',  // 4px
    md: '0.375rem', // 6px
    base: '0.5rem', // 8px (default cards, buttons)
    lg: '0.75rem',  // 12px
    full: '9999px', // for status dots & subtle badges
  },
  shadows: {
    none: 'none',
    subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
    elevated: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
    modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
  },
  transitions: {
    default: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
    fast: '100ms ease-out',
  }
} as const;
