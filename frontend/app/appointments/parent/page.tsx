'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Typography,
} from '@mui/material';
import { AppShell, DashboardCard } from '@/app/components/app-shell';
import { parentNav } from '@/app/components/navigation';
import api from '@/lib/api';
import type { Profile } from '@/lib/access';
import { formatDate, formatTime, titleCase } from '@/lib/format';

type Schedule = {
  schedule_id: number;
  work_date: string | null;
  start_time: string | null;
  end_time: string | null;
  slot_status: string | null;
  staff: {
    first_name: string | null;
    last_name: string | null;
    role: string | null;
  } | null;
};

export default function ParentAppointmentsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      setError('');

      try {
        const [{ data: profileData }, { data }] = await Promise.all([
          api.get<Profile>('/auth/profile'),
          api.get<Schedule[]>('/appointments/schedules'),
        ]);
        setProfile(profileData);
        setSchedules(data);
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Unable to load schedules';
        setError(Array.isArray(message) ? message.join(', ') : message);

        if (err?.response?.status === 401) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [router]);

  return (
    <AppShell
      title="Appointment Booking"
      subtitle="Choose a specialist and time slot from the available clinic schedule."
      navTitle="Guardian Care"
      navItems={parentNav()}
      badge="Parent"
      profileName={profile?.username}
      profileMeta="Booking workspace"
      actions={
        <>
          <Button variant="outlined" onClick={() => router.push('/dashboard/parent')}>
            Back to dashboard
          </Button>
          <Button variant="contained" onClick={() => router.push('/appointments/parent/history')}>
            Appointment history
          </Button>
        </>
      }
    >
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box display="grid" minHeight={320} sx={{ placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }} gap={2.5}>
          {schedules.length === 0 ? (
            <DashboardCard sx={{ gridColumn: '1 / -1' }}>
              <Typography variant="h5">No slots available</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Staff have not published appointment schedules yet.
              </Typography>
            </DashboardCard>
          ) : (
            schedules.map((schedule) => (
              <DashboardCard key={schedule.schedule_id}>
                <Box display="flex" justifyContent="space-between" gap={2} alignItems="flex-start">
                  <Box>
                    <Typography variant="h6">
                      {schedule.staff?.first_name || '-'} {schedule.staff?.last_name || ''}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      {formatDate(schedule.work_date)}
                    </Typography>
                  </Box>
                  <Chip label={titleCase(schedule.staff?.role)} size="small" />
                </Box>

                <Typography color="text.secondary" sx={{ mt: 2 }}>
                  Time: {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                  Slot status: {titleCase(schedule.slot_status)}
                </Typography>

                <Button
                  variant="contained"
                  fullWidth
                  sx={{ mt: 3 }}
                  onClick={() => router.push(`/appointments/parent/book/${schedule.schedule_id}`)}
                >
                  Select this slot
                </Button>
              </DashboardCard>
            ))
          )}
        </Box>
      )}
    </AppShell>
  );
}
