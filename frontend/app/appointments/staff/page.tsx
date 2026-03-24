"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { AppShell, DashboardCard } from "@/app/components/app-shell";
import { staffNav } from "@/app/components/navigation";
import api from "@/lib/api";
import { formatDate, formatTime, titleCase } from "@/lib/format";
import type { Profile } from "@/lib/access";

type Schedule = {
  schedule_id: number;
  work_date: string | null;
  start_time: string | null;
  end_time: string | null;
  slot_status: string | null;
  appointments: {
    appointment_id: number;
    status: string | null;
    child: {
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
};

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
};

const scheduleManagerRoles = new Set(["doctor", "psychologist", "admin"]);

export default function StaffAppointmentsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    work_date: "",
    start_time: "",
    end_time: "",
  });

  const canManageSchedules = (() => {
    const roles = new Set<string>([
      ...(profile?.staffRole ? [profile.staffRole] : []),
      ...(profile?.roleNames ?? []),
    ]);

    return Array.from(roles).some((role) => scheduleManagerRoles.has(role));
  })();

  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const [{ data: profileData }, { data: appointmentData }, { data: scheduleData }] =
        await Promise.all([
          api.get<Profile>("/auth/profile"),
          api.get<Appointment[]>("/appointments"),
          api.get<Schedule[]>("/appointments/my-schedules"),
        ]);

      setProfile(profileData);
      setAppointments(appointmentData);
      setSchedules(scheduleData);
    } catch (err: any) {
      const message = err?.response?.data?.message || "Unable to load appointments";
      setError(Array.isArray(message) ? message.join(", ") : message);

      if (err?.response?.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [router]);

  const handleCreateSchedule = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await api.post("/appointments/schedules", form);
      setForm({ work_date: "", start_time: "", end_time: "" });
      await fetchData();
    } catch (err: any) {
      const message = err?.response?.data?.message || "Unable to create schedule";
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!window.confirm("Delete this schedule?")) {
      return;
    }

    try {
      await api.delete(`/appointments/schedules/${scheduleId}`);
      await fetchData();
    } catch (err: any) {
      const message = err?.response?.data?.message || "Unable to delete schedule";
      setError(Array.isArray(message) ? message.join(", ") : message);
    }
  };

  const handleCancelAppointment = async (appointmentId: number) => {
    if (!window.confirm("Cancel this appointment?")) {
      return;
    }

    try {
      await api.patch(`/appointments/${appointmentId}/cancel`);
      await fetchData();
    } catch (err: any) {
      const message = err?.response?.data?.message || "Unable to cancel appointment";
      setError(Array.isArray(message) ? message.join(", ") : message);
    }
  };

  return (
    <AppShell
      title="Schedule & Appointments"
      subtitle="Create working slots, review queue activity, and keep appointment status under control."
      navTitle="Clinic Ops"
      navItems={staffNav(profile)}
      badge="Staff"
      profileName={profile?.username}
      profileMeta="Operations board"
      actions={
        <Button variant="contained" onClick={() => router.push("/visits/staff")}>
          Open visit records
        </Button>
      }
    >
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box display="grid" minHeight={320} sx={{ placeItems: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box display="grid" gridTemplateColumns={{ xs: "1fr", xl: "0.95fr 1.05fr" }} gap={2.5}>
          <Stack spacing={2.5}>
            <DashboardCard>
              <Typography variant="h5">Create schedule</Typography>
              {!canManageSchedules && (
                <Alert severity="info" sx={{ mt: 2.25 }}>
                  Your role can review appointments but cannot publish schedule slots.
                </Alert>
              )}
              <Box component="form" onSubmit={handleCreateSchedule} sx={{ mt: 2.25 }}>
                <Stack spacing={2}>
                  <TextField
                    label="Work date"
                    type="date"
                    value={form.work_date}
                    onChange={(event) => setForm((prev) => ({ ...prev, work_date: event.target.value }))}
                    disabled={!canManageSchedules || submitting}
                    slotProps={{ inputLabel: { shrink: true } }}
                    required
                  />
                  <TextField
                    label="Start time"
                    type="time"
                    value={form.start_time}
                    onChange={(event) => setForm((prev) => ({ ...prev, start_time: event.target.value }))}
                    disabled={!canManageSchedules || submitting}
                    slotProps={{ inputLabel: { shrink: true } }}
                    required
                  />
                  <TextField
                    label="End time"
                    type="time"
                    value={form.end_time}
                    onChange={(event) => setForm((prev) => ({ ...prev, end_time: event.target.value }))}
                    disabled={!canManageSchedules || submitting}
                    slotProps={{ inputLabel: { shrink: true } }}
                    required
                  />
                  <Button type="submit" variant="contained" disabled={!canManageSchedules || submitting}>
                    {submitting ? "Creating..." : "Publish schedule"}
                  </Button>
                </Stack>
              </Box>
            </DashboardCard>

            <DashboardCard>
              <Typography variant="h5">My schedules</Typography>
              <Stack spacing={1.5} sx={{ mt: 2.25 }}>
                {schedules.length === 0 && (
                  <Typography color="text.secondary">No schedules published yet.</Typography>
                )}
                {schedules.map((schedule) => (
                  <Box
                    key={schedule.schedule_id}
                    sx={{
                      p: 2,
                      borderRadius: 4,
                      background: "rgba(255,255,255,0.56)",
                      border: "1px solid rgba(122, 156, 156, 0.14)",
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" gap={2} flexWrap="wrap">
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>{formatDate(schedule.work_date)}</Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                          {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                          Booked child: {schedule.appointments?.child ? `${schedule.appointments.child.first_name || "-"} ${schedule.appointments.child.last_name || ""}` : "None"}
                        </Typography>
                      </Box>
                      <Stack alignItems={{ xs: "flex-start", sm: "flex-end" }} spacing={1.25}>
                        <Chip label={titleCase(schedule.slot_status)} />
                        {!schedule.appointments && canManageSchedules && (
                          <Button variant="outlined" color="error" onClick={() => handleDeleteSchedule(schedule.schedule_id)}>
                            Delete
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </DashboardCard>
          </Stack>

          <DashboardCard>
            <Typography variant="h5">Current appointment list</Typography>
            <Stack spacing={1.5} sx={{ mt: 2.25 }}>
              {appointments.length === 0 && (
                <Typography color="text.secondary">No appointments found.</Typography>
              )}
              {appointments.map((appointment) => (
                <Box
                  key={appointment.appointment_id}
                  sx={{
                    p: 2,
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.56)",
                    border: "1px solid rgba(122, 156, 156, 0.14)",
                  }}
                >
                  <Box display="flex" justifyContent="space-between" gap={2} flexWrap="wrap">
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>
                        {appointment.child?.first_name || "-"} {appointment.child?.last_name || ""}
                      </Typography>
                      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Specialist: {appointment.work_schedules?.staff?.first_name || "-"} {appointment.work_schedules?.staff?.last_name || ""}
                      </Typography>
                      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Date: {formatDate(appointment.work_schedules?.work_date || null)}
                      </Typography>
                      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Time: {formatTime(appointment.work_schedules?.start_time || null)} - {formatTime(appointment.work_schedules?.end_time || null)}
                      </Typography>
                    </Box>
                    <Stack alignItems={{ xs: "flex-start", sm: "flex-end" }} spacing={1.25}>
                      <Chip label={titleCase(appointment.status)} color={appointment.status === "cancelled" ? "error" : "success"} />
                      {appointment.status !== "cancelled" && (
                        <Button
                          variant="contained"
                          onClick={() => router.push(`/visits/staff?appointmentId=${appointment.appointment_id}`)}
                        >
                          Open visit
                        </Button>
                      )}
                      {appointment.status !== "cancelled" && (
                        <Button variant="outlined" color="error" onClick={() => handleCancelAppointment(appointment.appointment_id)}>
                          Cancel
                        </Button>
                      )}
                    </Stack>
                  </Box>
                </Box>
              ))}
            </Stack>
          </DashboardCard>
        </Box>
      )}
    </AppShell>
  );
}
