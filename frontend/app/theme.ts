'use client';

import { createTheme } from '@mui/material/styles';

/* ─── OKLCH-derived palette ───────────────────────────────────────────────────
 * Brand hue: ~147° (green). As lightness rises, chroma drops (no garish pastels).
 * Neutrals carry a tiny chroma=0.01-0.015 at brand hue for cohesion.
 *
 * Primary green
 *   oklch(58% 0.09 147)  → #5F8F68   base
 *   oklch(72% 0.07 147)  → #91B78F   light
 *   oklch(38% 0.08 147)  → #355F43   dark
 *   oklch(97% 0.01 90)   → #F8F4E8   contrastText (warm tint)
 *
 * Warm-tinted neutrals (hue ~90, chroma 0.01-0.015)
 *   oklch(93% 0.012 90)  → #ECE8DA   bg.default
 *   oklch(98% 0.008 90)  → #FCFAF3   bg.paper
 *
 * Text (green-tinted, not pure gray)
 *   oklch(30% 0.06 147)  → #2F4A35   primary
 *   oklch(55% 0.04 147)  → #74856D   secondary
 *
 * Semantic
 *   oklch(55% 0.12 25)   → #B86A5A   error
 *   oklch(52% 0.09 147)  → #4F7E57   success
 *
 * Explicit surface colours (replaces rgba alpha values)
 *   oklch(82% 0.04 147)  → #C5D0BB   border / outline
 *   oklch(91% 0.04 147)  → #E8F0E3   chip bg
 *   oklch(97% 0.012 90)  → #FAF7F0   outlined button / input bg
 *   oklch(88% 0.03 147)  → #DDEBD8   card border
 * ─────────────────────────────────────────────────────────────────────────── */

// Explicit colours — no rgba alpha smells except shadows (natural cast needed)
const C = {
  // Primary
  primary:         '#5F8F68',
  primaryLight:    '#91B78F',
  primaryDark:     '#355F43',
  primaryContrast: '#F8F4E8',

  // Backgrounds (warm-tinted neutrals)
  bgDefault: '#ECE8DA',
  bgPaper:   '#FCFAF3',

  // Text (green-tinted, never pure gray)
  textPrimary:   '#2F4A35',
  textSecondary: '#74856D',

  // Semantic
  error:   '#B86A5A',
  success: '#4F7E57',

  // Explicit surfaces (previously rgba)
  border:       '#C5D0BB',  // oklch(82% 0.04 147)
  chipBg:       '#E8F0E3',  // oklch(91% 0.04 147)
  inputBg:      '#FAF7F0',  // oklch(97% 0.012 90)
  inputBgHover: '#FCF9F5',  // oklch(97.5% 0.01 90)
  inputBgFocus: '#FFFDFA',  // oklch(99% 0.006 90)
  outlinedBg:   '#F5F2E8',  // oklch(96% 0.013 90)
  cardBorder:   '#DDE8D8',  // oklch(90% 0.04 147)
} as const;

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main:         C.primary,
      light:        C.primaryLight,
      dark:         C.primaryDark,
      contrastText: C.primaryContrast,
    },
    secondary: {
      main:  '#D9B57A',
      light: '#E9D2A6',
      dark:  '#A68049',
    },
    background: {
      default: C.bgDefault,
      paper:   C.bgPaper,
    },
    text: {
      primary:   C.textPrimary,
      secondary: C.textSecondary,
    },
    error:   { main: C.error },
    success: { main: C.success },
    divider: C.border,
  },

  typography: {
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.05em' },
    h2: { fontWeight: 800, letterSpacing: '-0.04em' },
    h3: { fontWeight: 800, letterSpacing: '-0.04em' },
    h4: { fontWeight: 800, letterSpacing: '-0.03em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700, letterSpacing: '-0.01em' },
  },

  shape: { borderRadius: 10 },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Radial decorative overlays kept with low-alpha — background is known,
        // contrast is predictable, and explicit colors would require 5+ extra tokens.
        body: {
          background: `
            radial-gradient(circle at top left,  oklch(79% 0.07 147 / 0.18), transparent 28%),
            radial-gradient(circle at top right, oklch(85% 0.06 130 / 0.14), transparent 24%),
            radial-gradient(circle at bottom right, oklch(88% 0.05 85 / 0.12), transparent 24%),
            linear-gradient(180deg, #dddcca 0%, ${C.bgDefault} 46%, #f4f0e5 100%)
          `,
          color: C.textPrimary,
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          padding: '12px 20px',
          fontSize: '0.96rem',
          borderRadius: 16,
          minHeight: 44, // 44px touch target minimum
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${C.primaryDark} 0%, ${C.primary} 55%, ${C.primaryLight} 100%)`,
          // Shadow retains alpha — natural cast requires colour bleed
          boxShadow: `0 8px 20px oklch(58% 0.09 147 / 0.22)`,
          '&:hover': {
            background: `linear-gradient(135deg, #3d6b4a 0%, #507860 55%, #7d9e7b 100%)`,
            boxShadow: `0 10px 24px oklch(58% 0.09 147 / 0.28)`,
          },
        },
        outlined: {
          borderColor: C.border,
          background:  C.outlinedBg,
          '&:hover': {
            borderColor: C.primaryLight,
            background:  C.inputBgHover,
          },
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 16,
            backgroundColor: C.inputBg,
            '&:hover':     { backgroundColor: C.inputBgHover },
            '&.Mui-focused': { backgroundColor: C.inputBgFocus },
          },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
          backgroundColor: C.chipBg,
          color: C.primaryDark,
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          background: `linear-gradient(180deg, ${C.bgPaper} 0%, #F6F3EA 100%)`,
          border: `1px solid ${C.cardBorder}`,
          // Shadow keeps alpha — shadows in nature always have colour cast
          boxShadow: '0 8px 24px oklch(38% 0.08 147 / 0.07)',
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
});

export default theme;
