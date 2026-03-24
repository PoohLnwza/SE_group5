import type { Profile } from "@/lib/access";
import { getEffectiveRoles } from "@/lib/access";
import type { NavItem } from "./app-shell";

export function parentNav(): NavItem[] {
  return [
    { label: "Dashboard", href: "/dashboard/parent" },
    { label: "Book Appointment", href: "/appointments/parent" },
    { label: "Assessments", href: "/assessments/parent" },
    { label: "History", href: "/appointments/parent/history" },
    { label: "Profile", href: "/profile" },
  ];
}

export function staffNav(profile: Profile | null): NavItem[] {
  const items: NavItem[] = [
    { label: "Overview", href: "/dashboard/staff" },
    { label: "Appointments", href: "/appointments/staff" },
    { label: "Visit Records", href: "/visits/staff" },
    { label: "Assessments", href: "/assessments/staff" },
    { label: "Create User", href: "/dashboard/staff/create-user" },
    { label: "Family Links", href: "/dashboard/staff/family-links" },
  ];

  for (const role of getEffectiveRoles(profile)) {
    if (role === "admin") {
      items.push({ label: "Staff Roles", href: "/dashboard/admin/staff" });
      continue;
    }

    items.push({
      label: `${role[0]?.toUpperCase() || ""}${role.slice(1)} Desk`,
      href: `/dashboard/staff/${role}`,
    });
  }

  items.push({ label: "Profile", href: "/profile" });

  return dedupeNav(items);
}

function dedupeNav(items: NavItem[]) {
  const map = new Map<string, NavItem>();
  items.forEach((item) => map.set(item.href, item));
  return Array.from(map.values());
}
