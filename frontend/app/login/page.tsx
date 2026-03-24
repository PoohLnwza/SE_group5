"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { LoginRounded, Visibility, VisibilityOff } from "@mui/icons-material";
import type { AxiosError } from "axios";
import NextLink from "next/link";
import { AuthShell } from "@/app/components/auth-shell";
import api from "@/lib/api";
import { getPrimaryStaffRoute, type Profile } from "@/lib/access";

type ApiErrorResponse = {
  message?: string | string[];
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", { username, password });
      localStorage.setItem("access_token", data.access_token);
      const { data: profile } = await api.get<Profile>("/auth/profile");
      router.push(getPrimaryStaffRoute(profile));
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      const message = error.response?.data?.message || "Login failed";
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="ADHD clinic portal"
      title="Sign in"
      subtitle="Use your clinic account to access the right workspace for your role."
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2.25}>
          <TextField
            fullWidth
            label="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoFocus
            required
          />
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Stack>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginRounded />}
          sx={{ mt: 3 }}
        >
          {loading ? "Signing in..." : "Open workspace"}
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: "center" }}>
        Forgot password?{" "}
        <MuiLink component={NextLink} href="/reset-password">
          Reset here
        </MuiLink>
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: "center" }}>
        Need a parent account?{" "}
        <MuiLink component={NextLink} href="/register">
          Register
        </MuiLink>
      </Typography>
    </AuthShell>
  );
}
