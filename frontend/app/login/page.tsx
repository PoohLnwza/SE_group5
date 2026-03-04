'use client';
// สวัสดี
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Link as MuiLink,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LoginRounded,
  LocalHospitalRounded,
} from '@mui/icons-material';
import NextLink from 'next/link';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { username, password });
      localStorage.setItem('access_token', data.access_token);
      router.push('/profile');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(ellipse at 20% 50%, rgba(124,77,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(0,188,212,0.1) 0%, transparent 50%), #0A0E1A',
        px: 2,
      }}
    >
      {/* Floating decorative orbs */}
      <Box
        sx={{
          position: 'fixed',
          top: '10%',
          left: '5%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(124,77,255,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'fixed',
          bottom: '15%',
          right: '10%',
          width: 250,
          height: 250,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(0,188,212,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      <Card
        sx={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Logo & Title */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #7C4DFF 0%, #448AFF 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
                boxShadow: '0 8px 24px rgba(124,77,255,0.4)',
              }}
            >
              <LocalHospitalRounded sx={{ fontSize: 32, color: '#fff' }} />
            </Box>
            <Typography variant="h5" sx={{ color: '#E8EAED', mb: 0.5 }}>
              ADHD Clinic
            </Typography>
            <Typography variant="body2" sx={{ color: '#9AA0A6' }}>
              เข้าสู่ระบบเพื่อใช้งาน
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="ชื่อผู้ใช้"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ mb: 2.5 }}
              autoFocus
              required
            />
            <TextField
              fullWidth
              label="รหัสผ่าน"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
              required
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: '#9AA0A6' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              startIcon={
                loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <LoginRounded />
                )
              }
              sx={{ mb: 2.5, py: 1.5 }}
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </Button>
          </Box>

          <Typography
            variant="body2"
            sx={{ textAlign: 'center', color: '#9AA0A6' }}
          >
            ยังไม่มีบัญชี?{' '}
            <MuiLink
              component={NextLink}
              href="/register"
              sx={{
                color: '#7C4DFF',
                fontWeight: 600,
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              สมัครสมาชิก
            </MuiLink>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
