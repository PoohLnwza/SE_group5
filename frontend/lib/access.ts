export type Profile = {
  user_id: number;
  username: string;
  user_type: "staff" | "parent";
  is_active: boolean;
  staffRole?: string | null;
  roleNames?: string[];
};

export function getEffectiveRoles(profile: Profile | null) {
  if (!profile) {
    return [];
  }

  return Array.from(
    new Set([
      ...(profile.staffRole ? [profile.staffRole] : []),
      ...(profile.roleNames ?? []),
    ]),
  );
}

export function hasRole(profile: Profile | null, roles: string[]) {
  const effectiveRoles = new Set(getEffectiveRoles(profile));

  if (effectiveRoles.has("admin")) {
    return true;
  }

  return roles.some((role) => effectiveRoles.has(role));
}

export function getPrimaryStaffRoute(profile: Profile | null) {
  if (!profile) {
    return "/login";
  }

  if (profile.user_type === "parent") {
    return "/dashboard/parent";
  }

  if (hasRole(profile, ["admin"])) {
    return "/dashboard/admin/staff";
  }

  if (hasRole(profile, ["doctor"])) {
    return "/dashboard/staff/doctor";
  }

  if (hasRole(profile, ["psychologist"])) {
    return "/dashboard/staff/psychologist";
  }

  if (hasRole(profile, ["nurse"])) {
    return "/dashboard/staff/nurse";
  }

  return "/dashboard/staff";
}
