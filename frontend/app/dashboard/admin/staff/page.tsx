"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { AxiosError } from "axios";
import { AppShell, DashboardCard } from "@/app/components/app-shell";
import { staffNav } from "@/app/components/navigation";
import api from "@/lib/api";
import { titleCase } from "@/lib/format";
import type { Profile } from "@/lib/access";

type StaffManagement = {
  users: Array<{
    user_id: number;
    username: string;
    user_type: string;
    is_active: boolean;
    roles: Array<string | null>;
    staff_profile: {
      staff_id: number;
      first_name: string | null;
      last_name: string | null;
      role: string | null;
      status: string | null;
    } | null;
  }>;
};

const roleOptions = ["doctor", "nurse", "psychologist", "admin"];

type ApiErrorResponse = {
  message?: string | string[];
};

export default function AdminStaffPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [data, setData] = useState<StaffManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<number, string>>({});

  const load = async () => {
    try {
      const [{ data: profileData }, { data: managementData }] = await Promise.all([
        api.get<Profile>("/auth/profile"),
        api.get<StaffManagement>("/users/admin/staff-management"),
      ]);
      setProfile(profileData);
      setData(managementData);
      setSelectedRoles(
        Object.fromEntries(
          managementData.users.map((user) => [user.user_id, user.staff_profile?.role || "nurse"]),
        ),
      );
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      if (error.response?.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login");
        return;
      }
      const message = error.response?.data?.message;
      setError(Array.isArray(message) ? message.join(", ") : (message ?? "Unable to load staff management"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [router]);

  const users = useMemo(() => data?.users ?? [], [data]);

  const handleAssignRole = async (userId: number) => {
    setSavingUserId(userId);
    setError("");
    try {
      await api.patch(`/users/admin/${userId}/assign-role`, {
        roleName: selectedRoles[userId],
      });
      await load();
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      const message = error.response?.data?.message;
      setError(Array.isArray(message) ? message.join(", ") : (message ?? "Unable to assign role"));
    } finally {
      setSavingUserId(null);
    }
  };

  if (loading) {
    return (
      <Box minHeight="100vh" display="grid" sx={{ placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AppShell
      title="Staff Role Management"
      subtitle="Assign operational roles, review active staff profiles, and promote accounts into working teams."
      navTitle="Clinic Ops"
      navItems={staffNav(profile)}
      badge="Admin"
      profileName={profile?.username}
      profileMeta="Admin control"
      actions={
        <>
          <Button variant="contained" onClick={() => router.push("/dashboard/staff/create-user")}>
            Create user
          </Button>
          <Button variant="outlined" onClick={() => router.push("/dashboard/staff")}>
            Staff overview
          </Button>
        </>
      }
    >
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Stack spacing={2.5}>
        {users.map((user) => (
          <DashboardCard key={user.user_id}>
            <Box display="flex" justifyContent="space-between" gap={2} flexWrap="wrap">
              <Box>
                <Typography variant="h6">{user.username}</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  Type: {titleCase(user.user_type)} • Roles: {user.roles.filter(Boolean).map((role) => titleCase(role)).join(", ") || "-"}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  Staff profile: {user.staff_profile?.first_name || "-"} {user.staff_profile?.last_name || ""}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1.25 }} flexWrap="wrap">
                  <Chip label={user.is_active ? "Active" : "Inactive"} color={user.is_active ? "success" : "error"} />
                  {user.staff_profile?.status && <Chip label={titleCase(user.staff_profile.status)} />}
                </Stack>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "center" }}>
                <TextField
                  select
                  size="small"
                  value={selectedRoles[user.user_id] || "nurse"}
                  onChange={(event) =>
                    setSelectedRoles((prev) => ({
                      ...prev,
                      [user.user_id]: event.target.value,
                    }))
                  }
                  sx={{ minWidth: 180 }}
                >
                  {roleOptions.map((role) => (
                    <MenuItem key={role} value={role}>
                      {titleCase(role)}
                    </MenuItem>
                  ))}
                </TextField>
                <Button variant="contained" onClick={() => handleAssignRole(user.user_id)} disabled={savingUserId === user.user_id}>
                  {savingUserId === user.user_id ? "Saving..." : "Assign role"}
                </Button>
              </Stack>
            </Box>
          </DashboardCard>
        ))}
      </Stack>
    </AppShell>
  );
}
