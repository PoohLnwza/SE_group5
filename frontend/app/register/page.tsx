"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { PersonAddRounded } from "@mui/icons-material";
import NextLink from "next/link";
import { AuthShell } from "@/app/components/auth-shell";
import api from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange =
    (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", {
        username: form.username,
        password: form.password,
        userType: "parent",
      });
      router.push("/login");
    } catch (err: any) {
      const message = err?.response?.data?.message || "Unable to create account right now";
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Parent registration"
      title="Create account"
      subtitle="For guardians and parents who need to manage appointments and follow-up history."
    >
      <Alert severity="info" sx={{ mb: 2.5 }}>
        This page creates a parent account. Staff roles are assigned later by admin.
      </Alert>
      {error && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2.25}>
          <TextField fullWidth label="Username" value={form.username} onChange={handleChange("username")} required />
          <TextField fullWidth label="Password" type="password" value={form.password} onChange={handleChange("password")} required />
          <TextField
            fullWidth
            label="Confirm password"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange("confirmPassword")}
            required
          />
        </Stack>
        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAddRounded />}
          sx={{ mt: 3 }}
        >
          {loading ? "Creating..." : "Create account"}
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: "center" }}>
        Already have an account?{" "}
        <MuiLink component={NextLink} href="/login">
          Sign in
        </MuiLink>
      </Typography>
    </AuthShell>
  );
}
