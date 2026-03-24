"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AxiosError } from "axios";
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
import { AppShell, DashboardCard, StatCard } from "@/app/components/app-shell";
import { staffNav } from "@/app/components/navigation";
import api from "@/lib/api";
import { formatDate } from "@/lib/format";
import { hasRole, type Profile } from "@/lib/access";

type ApiErrorResponse = {
  message?: string | string[];
};

type ParentOption = {
  parent_id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  users: {
    user_id: number;
    username: string;
  };
  _count: {
    child_parent: number;
  };
};

type ChildOption = {
  child_id: number;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  _count: {
    child_parent: number;
  };
};

type LinkContext = {
  parents: ParentOption[];
  children: ChildOption[];
};

type LinkedParent = {
  parent_id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  users: {
    user_id: number;
    username: string;
  };
  child_parent: Array<{
    child: {
      child_id: number;
      first_name: string | null;
      last_name: string | null;
      birth_date: string | null;
      deleted_at: string | null;
    } | null;
  }>;
};

const linkManagerRoles = ["admin", "nurse", "doctor"];

export default function StaffFamilyLinksPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [linkedParents, setLinkedParents] = useState<LinkedParent[]>([]);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedChildId, setSelectedChildId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManageLinks = useMemo(
    () => profile?.user_type === "staff" && hasRole(profile, linkManagerRoles),
    [profile],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [{ data: profileData }, { data: contextData }, { data: linksData }] = await Promise.all([
        api.get<Profile>("/auth/profile"),
        api.get<LinkContext>("/child-parent/context"),
        api.get<LinkedParent[]>("/child-parent"),
      ]);

      setProfile(profileData);
      setParents(contextData.parents);
      setChildren(contextData.children);
      setLinkedParents(linksData);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      if (error.response?.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login");
        return;
      }

      const message = error.response?.data?.message;
      setError(Array.isArray(message) ? message.join(", ") : (message ?? "Unable to load family links"));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedParentId || !selectedChildId) {
      setError("Select both a parent and a child");
      return;
    }

    setSaving(true);
    try {
      await api.post("/child-parent", {
        parent_id: Number(selectedParentId),
        child_id: Number(selectedChildId),
      });

      setSelectedParentId("");
      setSelectedChildId("");
      setSuccess("Child linked to parent");
      await loadData();
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      const message = error.response?.data?.message;
      setError(Array.isArray(message) ? message.join(", ") : (message ?? "Unable to link child"));
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (parentId: number, childId: number) => {
    if (!window.confirm("Remove this child from the selected parent?")) {
      return;
    }

    setError("");
    setSuccess("");
    try {
      await api.delete(`/child-parent/${childId}`, {
        params: {
          parentId,
        },
      });

      setSuccess("Relationship removed");
      await loadData();
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      const message = error.response?.data?.message;
      setError(Array.isArray(message) ? message.join(", ") : (message ?? "Unable to remove link"));
    }
  };

  if (loading) {
    return (
      <Box minHeight="100vh" display="grid" sx={{ placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!canManageLinks) {
    return (
      <AppShell
        title="Family Links"
        subtitle="Link child records to parent accounts from a single staff workspace."
        navTitle="Clinic Ops"
        navItems={staffNav(profile)}
        badge="Staff"
        profileName={profile?.username}
        profileMeta="Relationship manager"
        actions={
          <Button variant="outlined" onClick={() => router.push("/dashboard/staff")}>
            Back to overview
          </Button>
        }
      >
        <Alert severity="warning">Only admin, nurse, and doctor roles can manage child-parent links.</Alert>
      </AppShell>
    );
  }

  const linkedChildrenCount = linkedParents.reduce((sum, parent) => sum + parent.child_parent.length, 0);

  return (
    <AppShell
      title="Family Links"
      subtitle="Match child records with parent accounts so booking, assessments, and access rules follow the right family."
      navTitle="Clinic Ops"
      navItems={staffNav(profile)}
      badge="Staff"
      profileName={profile?.username}
      profileMeta="Relationship manager"
      actions={
        <>
          <Button variant="outlined" onClick={() => router.push("/dashboard/staff/create-user")}>
            Create user
          </Button>
          <Button variant="outlined" onClick={() => router.push("/dashboard/staff")}>
            Staff overview
          </Button>
        </>
      }
    >
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "repeat(3, 1fr)" }} gap={2.5} mb={2.5}>
        <StatCard label="Parents" value={parents.length} helper="Active parent profiles" />
        <StatCard label="Children" value={children.length} helper="Child records available to link" />
        <StatCard label="Links" value={linkedChildrenCount} helper="Current parent-child relationships" />
      </Box>

      <Box display="grid" gridTemplateColumns={{ xs: "1fr", xl: "0.95fr 1.05fr" }} gap={2.5}>
        <Stack spacing={2.5}>
          <DashboardCard>
            <Typography variant="h5">Create link</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Choose one parent account and one child record, then save the relationship.
            </Typography>

            <Box component="form" onSubmit={handleCreateLink} sx={{ mt: 2.5 }}>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Parent account"
                  value={selectedParentId}
                  onChange={(event) => setSelectedParentId(event.target.value)}
                  required
                  fullWidth
                >
                  {parents.map((parent) => (
                    <MenuItem key={parent.parent_id} value={String(parent.parent_id)}>
                      {`${parent.first_name || "-"} ${parent.last_name || ""}`.trim()} | @{parent.users.username}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Child record"
                  value={selectedChildId}
                  onChange={(event) => setSelectedChildId(event.target.value)}
                  required
                  fullWidth
                >
                  {children.map((child) => (
                    <MenuItem key={child.child_id} value={String(child.child_id)}>
                      {`${child.first_name || "-"} ${child.last_name || ""}`.trim()} | Birth date {formatDate(child.birth_date)}
                    </MenuItem>
                  ))}
                </TextField>

                <Button type="submit" variant="contained" disabled={saving}>
                  {saving ? "Linking..." : "Link child to parent"}
                </Button>
              </Stack>
            </Box>
          </DashboardCard>

          <DashboardCard>
            <Typography variant="h5">Available records</Typography>
            <Stack spacing={1.5} sx={{ mt: 2.25 }}>
              {children.slice(0, 8).map((child) => (
                <Box
                  key={child.child_id}
                  sx={{
                    p: 2,
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.56)",
                    border: "1px solid rgba(122, 156, 156, 0.14)",
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" gap={2} flexWrap="wrap">
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>
                        {child.first_name || "-"} {child.last_name || ""}
                      </Typography>
                      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Birth date: {formatDate(child.birth_date)}
                      </Typography>
                    </Box>
                    <Chip label={`${child._count.child_parent} link(s)`} />
                  </Stack>
                </Box>
              ))}
              {children.length > 8 && (
                <Typography color="text.secondary">
                  Showing 8 of {children.length} child records.
                </Typography>
              )}
            </Stack>
          </DashboardCard>
        </Stack>

        <DashboardCard>
          <Typography variant="h5">Current family links</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Review each parent profile and remove relationships that should no longer grant access.
          </Typography>

          <Stack spacing={1.5} sx={{ mt: 2.25 }}>
            {linkedParents.length === 0 && (
              <Typography color="text.secondary">No parent accounts found.</Typography>
            )}

            {linkedParents.map((parent) => (
              <Box
                key={parent.parent_id}
                sx={{
                  p: 2.25,
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.56)",
                  border: "1px solid rgba(122, 156, 156, 0.14)",
                }}
              >
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>
                      {parent.first_name || "-"} {parent.last_name || ""}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      Username: @{parent.users.username}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      Phone: {parent.phone || "-"}
                    </Typography>
                  </Box>
                  <Chip label={`${parent.child_parent.length} linked child(ren)`} />
                </Stack>

                <Stack spacing={1.25} sx={{ mt: 2 }}>
                  {parent.child_parent.length === 0 && (
                    <Typography color="text.secondary">No linked children yet.</Typography>
                  )}

                  {parent.child_parent.map((item) => {
                    const child = item.child;
                    if (!child) {
                      return null;
                    }

                    return (
                      <Box
                        key={`${parent.parent_id}-${child.child_id}`}
                        sx={{
                          p: 1.75,
                          borderRadius: 3,
                          background: "rgba(248, 246, 239, 0.92)",
                          border: "1px solid rgba(204, 209, 187, 0.35)",
                        }}
                      >
                        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1.5}>
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>
                              {child.first_name || "-"} {child.last_name || ""}
                            </Typography>
                            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                              Birth date: {formatDate(child.birth_date)}
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => handleUnlink(parent.parent_id, child.child_id)}
                          >
                            Unlink
                          </Button>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            ))}
          </Stack>
        </DashboardCard>
      </Box>
    </AppShell>
  );
}
