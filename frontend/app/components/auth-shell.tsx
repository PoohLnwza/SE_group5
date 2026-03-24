'use client';

import { Box, Paper, Stack, Typography } from '@mui/material';
import { cardSx } from './app-shell';

export function AuthShell({
  title,
  subtitle,
  eyebrow,
  children,
}: {
  title: string;
  subtitle: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        py: 3,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1180,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.05fr 0.95fr' },
          gap: 2.5,
          alignItems: 'stretch',
        }}
      >
        <Paper
          sx={{
            ...cardSx,
            p: { xs: 3, md: 5 },
            minHeight: { lg: 680 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background:
              'linear-gradient(135deg, rgba(209, 222, 189, 0.72) 0%, rgba(239, 234, 208, 0.76) 52%, rgba(222, 230, 201, 0.72) 100%)',
          }}
        >
          <Box>
            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 800 }}>
              {eyebrow}
            </Typography>
            <Typography
              variant="h1"
              sx={{
                mt: 2,
                maxWidth: 540,
                fontSize: { xs: '2.4rem', md: '4rem' },
                lineHeight: 0.98,
              }}
            >
              Calm, clear clinic operations.
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mt: 2, maxWidth: 520, fontSize: '1.05rem' }}
            >
              A cleaner workspace for parent booking, staff operations, and admin control in
              one coordinated interface.
            </Typography>
          </Box>

          <Stack spacing={2.5} sx={{ mt: 5 }}>
            <Paper sx={{ ...cardSx, background: 'rgba(250,247,239,0.62)' }}>
              <Typography variant="subtitle2" color="text.secondary">
                What is improved
              </Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>
                Better layout separation, clearer side navigation, and lighter visual weight.
              </Typography>
            </Paper>
            <Box
              sx={{
                height: 220,
                borderRadius: '20px',
                background:
                  'radial-gradient(circle at 25% 35%, rgba(248, 244, 232, 0.72), transparent 18%), radial-gradient(circle at 70% 25%, rgba(214, 201, 157, 0.44), transparent 24%), linear-gradient(135deg, #5e8d66 0%, #87a67f 52%, #d7c188 100%)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 0 rgba(248,244,232,0.34)',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: '22px 28px auto auto',
                  width: 96,
                  height: 96,
                  borderRadius: '32px',
                  background: 'rgba(248,244,232,0.22)',
                  boxShadow:
                    '140px 44px 0 -10px rgba(248,244,232,0.24), 58px 112px 0 6px rgba(248,244,232,0.18)',
                },
              }}
            />
          </Stack>
        </Paper>

        <Paper sx={{ ...cardSx, p: { xs: 3, md: 4 } }}>
          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 800 }}>
            {eyebrow}
          </Typography>
          <Typography variant="h3" sx={{ mt: 1.25 }}>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, mb: 4 }}>
            {subtitle}
          </Typography>
          {children}
        </Paper>
      </Box>
    </Box>
  );
}
