'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Container, Typography, Box, Card, CardContent, 
  Button, Chip, CircularProgress, Alert 
} from '@mui/material';
import api from '@/lib/api'; // 👈 1. Import api มาใช้งาน

export default function ParentAppointmentsPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

 useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/appointments/schedules');
        
        // 👈 เพิ่ม Console.log เพื่อดูว่า Backend ส่งอะไรมา
        console.log('ข้อมูลจาก Backend:', res); 

        // 👈 เช็คว่าข้อมูลอยู่ใน .data (Axios) หรือเป็น Array ตรงๆ (Fetch)
        const schedulesData = res.data ? res.data : res; 
        
        if (Array.isArray(schedulesData)) {
           setSchedules(schedulesData);
        } else {
           // กรณี Backend ส่งกลับมาเป็น Format อื่น
           setSchedules(schedulesData?.data || []); 
        }

      } catch (err: any) {
        const msg = err?.response?.data?.message || err.message || 'ไม่สามารถดึงข้อมูลตารางแพทย์ได้';
        setError(msg);
        
        if (err?.response?.status === 401) {
            router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, [router]);

  // ฟังก์ชันแปลงวันที่ให้อ่านง่าย
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
          ตารางคิวแพทย์ที่ว่าง
        </Typography>
        <Button variant="outlined" onClick={() => router.push('/appointments/parent/history')}>
          ดูประวัตินัดหมายของฉัน
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" my={5}><CircularProgress /></Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
          {schedules.length === 0 ? (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography color="text.secondary">ไม่มีคิวแพทย์ที่ว่างในขณะนี้</Typography>
            </Box>
          ) : (
            schedules.map((schedule) => (
              <Box key={schedule.schedule_id}>
                <Card sx={{ 
                  transition: '0.3s', 
                  '&:hover': { boxShadow: '0 8px 24px rgba(124,77,255,0.15)', transform: 'translateY(-4px)' } 
                }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      แพทย์: {schedule.staff?.first_name} {schedule.staff?.last_name}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 1 }}>
                      วันที่: {formatDateTime(schedule.work_date)}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                      สถานะ: <Chip label="ว่าง" color="success" size="small" />
                    </Typography>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      fullWidth
                      onClick={() => router.push(`/appointments/parent/book/${schedule.schedule_id}`)}
                      sx={{
                        background: 'linear-gradient(135deg, #7C4DFF 0%, #448AFF 100%)',
                      }}
                    >
                      เลือกคิวนี้
                    </Button>
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