"use client";

import { useState } from "react";
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
import { LockResetRounded } from "@mui/icons-material";
import type { AxiosError } from "axios";
import NextLink from "next/link";
import { AuthShell } from "@/app/components/auth-shell";
import api from "@/lib/api";

type ApiErrorResponse = {
  message?: string | string[];
};

export default function ResetPasswordPage() {
  const [form, setForm] = useState({
    username: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange =
    (field: "username" | "newPassword" | "confirmPassword") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (form.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password-simple", {
        username: form.username,
        newPassword: form.newPassword,
      });
      setSuccess(data.message || "Password updated successfully");
      setForm({ username: "", newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      const message = error.response?.data?.message || "Unable to reset password";
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Access recovery"
      title="Reset password"
      subtitle="Temporary reset mode for the current project setup."
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2.5 }}>
          {success}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2.25}>
          <TextField fullWidth label="Username" value={form.username} onChange={handleChange("username")} required />
          <TextField
            fullWidth
            label="New password"
            type="password"
            value={form.newPassword}
            onChange={handleChange("newPassword")}
            required
          />
          <TextField
            fullWidth
            label="Confirm new password"
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
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LockResetRounded />}
          sx={{ mt: 3 }}
        >
          {loading ? "Updating..." : "Update password"}
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: "center" }}>
        Back to{" "}
        <MuiLink component={NextLink} href="/login">
          login
        </MuiLink>
      </Typography>
    </AuthShell>
  );
}
