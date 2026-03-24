'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { AppShell, DashboardCard, StatCard } from '@/app/components/app-shell';
import { parentNav } from '@/app/components/navigation';
import api from '@/lib/api';
import type { Profile } from '@/lib/access';
import { formatDate, formatTime, titleCase } from '@/lib/format';

type Appointment = {
  appointment_id: number;
  status: string | null;
  child: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  work_schedules: {
    work_date: string | null;
    start_time: string | null;
    end_time: string | null;
    staff: {
      first_name: string | null;
      last_name: string | null;
      role: string | null;
    } | null;
  } | null;
  room: {
    room_name: string | null;
  } | null;
};

export default function AppointmentHistoryPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAppointments = async () => {
    setLoading(true);
    setError('');

    try {
      const [{ data: profileData }, { data }] = await Promise.all([
        api.get<Profile>('/auth/profile'),
        api.get<Appointment[]>('/appointments'),
      ]);
      setProfile(profileData);
      setAppointments(data);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to load appointment history';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancelAppointment = async (appointmentId: number) => {
    if (!window.confirm('Cancel this appointment?')) {
      return;
    }

    try {
      await api.patch(`/appointments/${appointmentId}/cancel`);
      fetchAppointments();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to cancel appointment';
      window.alert(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  return (
    <AppShell
      title="Appointment History"
      subtitle="Track booked visits, room details, and status changes for each child."
      navTitle="Guardian Care"
      navItems={parentNav()}
      badge="Parent"
      profileName={profile?.username}
      profileMeta="Appointment records"
      actions={
        <>
          <Button variant="outlined" onClick={() => router.push('/dashboard/parent')}>
            Dashboard
          </Button>
          <Button variant="contained" onClick={() => router.push('/appointments/parent')}>
            Book new appointment
          </Button>
        </>
      }
    >
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(3, 1fr)' }} gap={2} mb={3}>
        <StatCard label="Total records" value={appointments.length} />
        <StatCard label="Active" value={appointments.filter((item) => item.status !== 'cancelled').length} />
        <StatCard label="Cancelled" value={appointments.filter((item) => item.status === 'cancelled').length} />
      </Box>

      {loading ? (
        <Box display="grid" minHeight={320} sx={{ placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={2.5}>
          {appointments.length === 0 ? (
            <DashboardCard>
              <Typography variant="h5">No history yet</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Once appointments are booked, they will appear here.
              </Typography>
            </DashboardCard>
          ) : (
            appointments.map((appointment) => (
              <DashboardCard key={appointment.appointment_id}>
                <Box display="flex" justifyContent="space-between" gap={2} flexWrap="wrap">
                  <Box>
                    <Typography variant="h6">
                      {appointment.child?.first_name || '-'} {appointment.child?.last_name || ''}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                      Specialist: {appointment.work_schedules?.staff?.first_name || '-'} {appointment.work_schedules?.staff?.last_name || ''}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      Date: {formatDate(appointment.work_schedules?.work_date || null)}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      Time: {formatTime(appointment.work_schedules?.start_time || null)} - {formatTime(appointment.work_schedules?.end_time || null)}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      Room: {appointment.room?.room_name || '-'}
                    </Typography>
                  </Box>

                  <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={1.25}>
                    <Chip label={titleCase(appointment.status)} color={appointment.status === 'cancelled' ? 'error' : 'success'} />
                    {appointment.status !== 'cancelled' && (
                      <Button variant="outlined" color="error" onClick={() => handleCancelAppointment(appointment.appointment_id)}>
                        Cancel appointment
                      </Button>
                    )}
                  </Stack>
                </Box>
              </DashboardCard>
            ))
          )}
        </Stack>
      )}
    </AppShell>
  );
}
