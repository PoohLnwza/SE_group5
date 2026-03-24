import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import StaffVisitsClient from "./staff-visits-client";

export default function StaffVisitsPage() {
  return (
    <Suspense
      fallback={
        <Box minHeight="100vh" display="grid" sx={{ placeItems: "center" }}>
          <CircularProgress />
        </Box>
      }
    >
      <StaffVisitsClient />
    </Suspense>
  );
}
