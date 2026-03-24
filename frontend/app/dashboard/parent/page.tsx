"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { AppShell, DashboardCard, StatCard } from "@/app/components/app-shell";
import { parentNav } from "@/app/components/navigation";
import api from "@/lib/api";
import type { Profile } from "@/lib/access";
import { formatDate, formatTime, titleCase } from "@/lib/format";

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

export default function ParentDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [
          { data: profileData },
          { data: scheduleData },
          { data: appointmentData },
        ] = await Promise.all([
          api.get<Profile>("/auth/profile"),
          api.get<Schedule[]>("/appointments/schedules"),
          api.get<Appointment[]>("/appointments"),
        ]);
        setProfile(profileData);
        setSchedules(scheduleData);
        setAppointments(appointmentData);
      } catch (err: any) {
        if (err?.response?.status === 401) {
          localStorage.removeItem("access_token");
          router.push("/login");
          return;
        }
        const message =
          err?.response?.data?.message || "Unable to load parent dashboard";
        setError(Array.isArray(message) ? message.join(", ") : message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const nextAvailable = schedules[0];
  const activeAppointments = useMemo(
    () =>
      appointments.filter((appointment) => appointment.status !== "cancelled"),
    [appointments],
  );

  if (loading) {
    return (
      <Box minHeight="100vh" display="grid" sx={{ placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AppShell
      title="Parent Dashboard"
      subtitle="Start from a clean overview: upcoming visits, available booking slots, and recent family activity."
      navTitle="Guardian Care"
      navItems={parentNav()}
      badge="Parent"
      profileName={profile?.username}
      profileMeta="Family appointment management"
      actions={
        <>
          <Button
            variant="contained"
            onClick={() => router.push("/appointments/parent")}
          >
            Book appointment
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.push("/assessments/parent")}
          >
            Start assessment
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.push("/appointments/parent/history")}
          >
            View history
          </Button>
        </>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box
        display="grid"
        gridTemplateColumns={{ xs: "1fr", md: "repeat(4, 1fr)" }}
        gap={2}
        mb={3}
      >
        <StatCard
          label="Open slots"
          value={schedules.length}
          helper="Available times to book now"
        />
        <StatCard
          label="Active visits"
          value={activeAppointments.length}
          helper="Current non-cancelled appointments"
        />
        <StatCard
          label="History records"
          value={appointments.length}
          helper="Total records in this account"
        />
        <StatCard
          label="Next visit"
          value={nextAvailable ? formatDate(nextAvailable.work_date) : "-"}
          helper={
            nextAvailable
              ? `${formatTime(nextAvailable.start_time)} - ${formatTime(nextAvailable.end_time)}`
              : "No schedule selected yet"
          }
        />
      </Box>

      <Box
        display="grid"
        gridTemplateColumns={{ xs: "1fr", xl: "1.35fr 0.95fr" }}
        gap={2.5}
      >
        <DashboardCard>
          <Box
            display="flex"
            justifyContent="space-between"
            gap={2}
            flexWrap="wrap"
            mb={2.5}
          >
            <Box>
              <Typography variant="h5">Recommended next booking</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                Surface the earliest available slot so parents can act quickly.
              </Typography>
            </Box>
            <Button
              variant="text"
              onClick={() => router.push("/appointments/parent")}
            >
              See all slots
            </Button>
          </Box>

          {nextAvailable ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1.1fr 1fr" },
                gap: 2,
                p: 2.5,
                borderRadius: 6,
                background:
                  "linear-gradient(135deg, rgba(203, 220, 185, 0.5) 0%, rgba(234, 224, 189, 0.46) 100%)",
              }}
            >
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 5,
                  color: "#f8f4e8",
                  background:
                    "linear-gradient(135deg, #5f8f68 0%, #86a67c 58%, #d6bf86 100%)",
                  boxShadow: "0 18px 36px rgba(95, 143, 104, 0.2)",
                }}
              >
                <Typography variant="body2" sx={{ opacity: 0.84 }}>
                  Earliest slot
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ mt: 1.25, fontSize: { xs: "2rem", md: "2.45rem" } }}
                >
                  {formatDate(nextAvailable.work_date)}
                </Typography>
                <Typography sx={{ mt: 0.75, opacity: 0.92 }}>
                  {formatTime(nextAvailable.start_time)} -{" "}
                  {formatTime(nextAvailable.end_time)}
                </Typography>
                <Chip
                  label={titleCase(nextAvailable.staff?.role)}
                  sx={{ mt: 2, background: "rgba(248,244,232,0.18)", color: "#f8f4e8" }}
                />
              </Box>
              <Stack spacing={2}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 5,
                    background: "rgba(250,247,239,0.58)",
                    border: "1px solid rgba(248,244,232,0.56)",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Doctor / specialist
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    {nextAvailable.staff?.first_name || "-"}{" "}
                    {nextAvailable.staff?.last_name || ""}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 5,
                    background: "rgba(250,247,239,0.58)",
                    border: "1px solid rgba(248,244,232,0.56)",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Booking readiness
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    89%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={89}
                    sx={{
                      mt: 1.5,
                      height: 10,
                      borderRadius: 999,
                      backgroundColor: "rgba(154, 176, 130, 0.18)",
                    }}
                  />
                </Box>
              </Stack>
            </Box>
          ) : (
            <Typography color="text.secondary">
              No available schedule right now.
            </Typography>
          )}
        </DashboardCard>

        <Stack spacing={2.5}>
          <DashboardCard>
            <Typography variant="h5">Quick focus</Typography>
            <Stack spacing={1.75} sx={{ mt: 2.25 }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 5,
                  background:
                    "linear-gradient(135deg, rgba(250,247,239,0.72) 0%, rgba(221, 232, 207, 0.74) 100%)",
                }}
              >
                <Typography sx={{ fontWeight: 700 }}>Booking</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                  Keep the next open slot visible so parents can book with fewer steps.
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 5,
                  background:
                    "linear-gradient(135deg, rgba(250,247,239,0.72) 0%, rgba(239, 231, 204, 0.76) 100%)",
                }}
              >
                <Typography sx={{ fontWeight: 700 }}>Assessments</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                  Keep child assessments one click away from the dashboard.
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 5,
                  background:
                    "linear-gradient(135deg, rgba(250,247,239,0.72) 0%, rgba(228, 235, 210, 0.78) 100%)",
                }}
              >
                <Typography sx={{ fontWeight: 700 }}>History</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                  Surface the most recent family activity without crowding the page.
                </Typography>
              </Box>
            </Stack>
          </DashboardCard>

          <DashboardCard>
            <Typography variant="h5">Recent family activity</Typography>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              {appointments.slice(0, 3).map((appointment) => (
                <Box
                  key={appointment.appointment_id}
                  sx={{
                    p: 2,
                    borderRadius: 4,
                    background: "rgba(250,247,239,0.62)",
                    border: "1px solid rgba(171, 183, 145, 0.18)",
                  }}
                >
                  <Typography sx={{ fontWeight: 700 }}>
                    {appointment.child?.first_name || "-"}{" "}
                    {appointment.child?.last_name || ""}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    {formatDate(appointment.work_schedules?.work_date || null)}{" "}
                    at{" "}
                    {formatTime(appointment.work_schedules?.start_time || null)}
                  </Typography>
                  <Chip
                    label={titleCase(appointment.status)}
                    size="small"
                    sx={{ mt: 1.25 }}
                  />
                </Box>
              ))}
              {appointments.length === 0 && (
                <Typography color="text.secondary">
                  No appointment history yet.
                </Typography>
              )}
            </Stack>
          </DashboardCard>
        </Stack>
      </Box>
    </AppShell>
  );
}
