'use client';

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#5F8F68',
      light: '#91B78F',
      dark: '#355F43',
      contrastText: '#F8F4E8',
    },
    secondary: {
      main: '#D9B57A',
      light: '#E9D2A6',
      dark: '#A68049',
    },
    background: {
      default: '#ECE8DA',
      paper: '#FCFAF3',
    },
    text: {
      primary: '#2F4A35',
      secondary: '#74856D',
    },
    error: {
      main: '#B86A5A',
    },
    success: {
      main: '#4F7E57',
    },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.05em',
    },
    h2: {
      fontWeight: 800,
      letterSpacing: '-0.04em',
    },
    h3: {
      fontWeight: 800,
      letterSpacing: '-0.04em',
    },
    h4: {
      fontWeight: 800,
      letterSpacing: '-0.03em',
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 700,
    },
    button: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            'radial-gradient(circle at top left, rgba(164, 188, 140, 0.22), transparent 28%), radial-gradient(circle at top right, rgba(206, 220, 181, 0.18), transparent 24%), radial-gradient(circle at bottom right, rgba(228, 212, 171, 0.16), transparent 24%), linear-gradient(180deg, #dddcca 0%, #ece8da 46%, #f4f0e5 100%)',
          color: '#2F4A35',
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
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #5f8f68 0%, #89ae82 58%, #d8c289 100%)',
          boxShadow: '0 18px 28px rgba(95, 143, 104, 0.2)',
          '&:hover': {
            background: 'linear-gradient(135deg, #4e7856 0%, #75946f 58%, #c7ae75 100%)',
            boxShadow: '0 20px 34px rgba(95, 143, 104, 0.26)',
          },
        },
        outlined: {
          borderColor: 'rgba(120, 146, 107, 0.28)',
          background: 'rgba(248, 244, 232, 0.45)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 16,
            backgroundColor: 'rgba(250, 247, 240, 0.78)',
            '&:hover': {
              backgroundColor: 'rgba(252, 249, 243, 0.9)',
            },
            '&.Mui-focused': {
              backgroundColor: 'rgba(255, 252, 247, 0.96)',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
          backgroundColor: 'rgba(168, 192, 145, 0.22)',
          color: '#4C744F',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          background:
            'linear-gradient(180deg, rgba(252, 250, 243, 0.96) 0%, rgba(246, 243, 234, 0.96) 100%)',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(191, 197, 170, 0.22)',
          boxShadow: '0 16px 34px rgba(95, 118, 83, 0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

export default theme;
