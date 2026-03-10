'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Container, Typography, Box, Card, CardContent, 
  Button, Chip, CircularProgress, Alert 
} from '@mui/material';

const API_BASE_URL = 'http://localhost:5001';

export default function StaffAppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ==========================================
  // 1. ส่วนดึงข้อมูล (ปรับปรุงเพื่อใช้ดู UI)
  // ==========================================
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      /* --- คอมเม้นส่วนเช็ค Token ไว้ชั่วคราว ---
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('กรุณาเข้าสู่ระบบก่อน');
      }
      --------------------------------------- */

      /* --- คอมเม้นส่วนดึง API จริง ไว้ชั่วคราว ---
      const res = await fetch(`${API_BASE_URL}/appointments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error');
      setAppointments(data);
      --------------------------------------- */

      // === เพิ่มข้อมูลจำลอง (Mock Data) ตรงนี้เพื่อให้เห็นภาพหน้าจอ ===
      const mockData = [
        {
          appointment_id: 1,
          status: 'scheduled',
          child: { first_name: 'น้องเอ', last_name: 'นามสมมติ' },
          work_schedules: { work_date: new Date().toISOString() }
        },
        {
          appointment_id: 2,
          status: 'cancelled',
          child: { first_name: 'น้องบี', last_name: 'ใจดี' },
          work_schedules: { work_date: new Date().toISOString() }
        }
      ];
      setAppointments(mockData);

    } catch (err: any) {
      setError(err.message);
      /* --- คอมเม้นส่วน Redirect ไป Login ---
      if (err.message.includes('เข้าสู่ระบบ')) {
        setTimeout(() => router.push('/login'), 2000);
      }
      ------------------------------------ */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // ==========================================
  // 2. หมอยกเลิกนัดหมาย (ปิดการทำงานจริงไว้ก่อน)
  // ==========================================
  const handleCancelAppointment = async (appointmentId: number) => {
    alert('ระบบจำลอง: กดปุ่มยกเลิก ID ' + appointmentId);
    // ในโหมด UI เราจะไม่ยิง API จริง
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" color="primary">
          🩺 ตารางนัดหมายของฉัน (แพทย์)
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" my={5}><CircularProgress /></Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3 }}>
          {appointments.length === 0 ? (
            <Box><Typography color="text.secondary">ยังไม่มีผู้ป่วยจองคิวเข้ามาในขณะนี้</Typography></Box>
          ) : (
            appointments.map((appt) => (
              <Box key={appt.appointment_id}>
                <Card sx={{ opacity: appt.status === 'cancelled' ? 0.6 : 1, borderLeft: appt.status === 'cancelled' ? '4px solid red' : '4px solid #4caf50' }}>
                  <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        ผู้ป่วย: {appt.child?.first_name || 'ไม่ระบุชื่อ'} {appt.child?.last_name || ''}
                      </Typography>
                      <Typography color="text.secondary">
                        วันที่และเวลา: {formatDateTime(appt.work_schedules?.work_date)}
                      </Typography>
                      <Typography color="text.secondary" sx={{ mt: 1 }}>
                        สถานะ: 
                        <Chip 
                          label={appt.status === 'cancelled' ? 'ยกเลิกแล้ว' : 'รอตรวจ'} 
                          color={appt.status === 'cancelled' ? 'error' : 'success'} 
                          size="small" 
                          sx={{ ml: 1 }} 
                        />
                      </Typography>
                    </Box>
                    
                    {appt.status !== 'cancelled' && (
                      <Button 
                        variant="outlined" 
                        color="error"
                        onClick={() => handleCancelAppointment(appt.appointment_id)}
                      >
                        ยกเลิกคิวนี้
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Box>
            ))
          )}
        </Box>
      )}
    </Container>
  );
}