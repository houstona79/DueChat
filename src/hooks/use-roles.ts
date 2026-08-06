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
