'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Typography, Box, Card, CardContent, Button, TextField } from '@mui/material';
import api from '@/lib/api'; // 👈 1. เปลี่ยนมาใช้ api ตัวกลาง

export default function BookAppointmentPage({ params }: { params: { scheduleId: string } }) {
  const router = useRouter();
  const scheduleId = Number(params.scheduleId);
  
  // 💡 หมายเหตุ: ในอนาคตคุณควรดึง patient_id จากข้อมูลผู้ใช้ที่ล็อกอิน 
  // หรือให้เลือกจากรายชื่อบุตรหลาน
  const CURRENT_PATIENT_ID = 1; 

  const [roomId, setRoomId] = useState(''); 

  const handleConfirmBooking = async () => {
    try {
      // 👈 2. ใช้ api.post แทน fetch
      const res = await api.post('/appointments', {
        patient_id: CURRENT_PATIENT_ID,
        schedule_id: scheduleId,
        // room_id: roomId ? Number(roomId) : null
      });
      
      alert('จองคิวสำเร็จ!');
      router.push('/appointments/parent/history'); 
    } catch (err: any) {
      // 👈 3. ดึง Message จาก Backend
      const msg = err?.response?.data?.message || 'ไม่สามารถจองคิวได้';
      alert(msg);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" color="primary" gutterBottom sx={{ fontWeight: 'bold' }}>
        ยืนยันการจองนัดหมาย
      </Typography>
      <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" color="text.primary">รหัสคิวแพทย์: {scheduleId}</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            โปรดตรวจสอบความถูกต้องก่อนกดยืนยัน
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" fullWidth onClick={() => router.back()}>
              ย้อนกลับ
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              fullWidth 
              onClick={handleConfirmBooking}
              sx={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #448AFF 100%)' }}
            >
              ยืนยันการจอง
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}