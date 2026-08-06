import { useQuery } from "@tanstack/react-query";
import { fetchRoles, type AppRole, type UserRole } from "@/lib/admin";

/** Site-wide roles (admin/moderator) for every user, used to badge names. */
export function useSiteRoles(enabled = true) {
  return useQuery({ queryKey: ["user-roles"], queryFn: fetchRoles, enabled });
}

export function siteRoleOf(roles: UserRole[] | undefined, userId: string): AppRole | null {
  if (roles?.some((r) => r.user_id === userId && r.role === "admin")) return "admin";
  if (roles?.some((r) => r.user_id === userId && r.role === "moderator")) return "moderator";
  return null;
}

export function siteRoleLabel(role: AppRole | null) {
  return role === "admin" ? "Admin" : role === "moderator" ? "Moderator" : null;
}

/** Admins are red; moderators use the app accent. */
export function siteRoleTextClass(role: AppRole | null) {
  return role === "admin" ? "text-destructive" : role === "moderator" ? "text-primary" : undefined;
}

export function siteRoleBadgeClass(role: AppRole | null) {
  return role === "admin"
    ? "bg-destructive/15 text-destructive"
    : "bg-primary/15 text-primary";
}

/** Reds are reserved for admins, so custom colors are filtered client-side too. */
export function isRedish(hex: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return r >= 120 && r > g * 2 && r > b * 2;
}

/** Role colors win over a personal name color. */
export function nameColorStyle(role: AppRole | null, color: string | null | undefined) {
  if (role || !color || isRedish(color)) return undefined;
  return { color } as const;
}
