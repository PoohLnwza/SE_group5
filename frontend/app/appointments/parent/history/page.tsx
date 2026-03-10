'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Container, Typography, Box, Card, CardContent, 
  Button, Chip, CircularProgress, Alert 
} from '@mui/material';
import api from '@/lib/api'; // 👈 1. นำเข้า api

export default function AppointmentHistoryPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 💡 หมายเหตุ: ฝั่ง Backend (Service) ของคุณเขียนให้ดึงตามสิทธิ์อยู่แล้ว 
  // ถ้าเป็น Parent จะดึงเฉพาะของลูกคนนั้นๆ มาให้เอง
  const fetchAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      // 👈 2. ใช้ api.get (ไม่ต้องใส่ Token เองแล้ว)
      const { data } = await api.get('/appointments');
      setAppointments(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'ไม่สามารถดึงข้อมูลนัดหมายได้';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancelAppointment = async (appointmentId: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกนัดหมายนี้?')) return;

    try {
      // 👈 3. ใช้ api.patch ให้ตรงกับ Backend
      await api.patch(`/appointments/${appointmentId}/cancel`);
      
      alert('ยกเลิกนัดหมายสำเร็จ!');
      fetchAppointments(); 
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'ไม่สามารถยกเลิกนัดหมายได้';
      alert(msg);
    }
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
          🩺 ประวัตินัดหมายของฉัน
        </Typography>
        <Button variant="contained" onClick={() => router.push('/appointments/parent')}>
          + จองคิวใหม่
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" my={5}><CircularProgress /></Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {appointments.length === 0 ? (
            <Typography color="text.secondary" textAlign="center">คุณยังไม่มีประวัติการนัดหมาย</Typography>
          ) : (
            appointments.map((appt) => (
              <Card key={appt.appointment_id} sx={{ 
                borderLeft: appt.status === 'cancelled' ? '6px solid #f44336' : '6px solid #4caf50',
                opacity: appt.status === 'cancelled' ? 0.7 : 1
              }}>
                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6">
                      แพทย์: {appt.work_schedules?.staff?.first_name} {appt.work_schedules?.staff?.last_name}
                    </Typography>
                    <Typography color="text.secondary">
                      📅 วันที่: {formatDateTime(appt.work_schedules?.work_date)}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Chip 
                        label={appt.status === 'cancelled' ? 'ยกเลิกแล้ว' : 'นัดหมายสำเร็จ'} 
                        color={appt.status === 'cancelled' ? 'error' : 'success'} 
                        size="small" 
                      />
                    </Box>
                  </Box>
                  {appt.status !== 'cancelled' && (
                    <Button 
                      variant="outlined" 
                      color="error"
                      onClick={() => handleCancelAppointment(appt.appointment_id)}
                    >
                      ยกเลิกนัด
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      )}
    </Container>
  );
}