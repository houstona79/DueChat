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

/** Admins and moderators are both red. */
export function siteRoleTextClass(role: AppRole | null) {
  return role === "admin" || role === "moderator" ? "text-staff" : undefined;
}

export function siteRoleBadgeClass(role: AppRole | null) {
  return role === "admin" || role === "moderator"
    ? "bg-staff/15 text-staff"
    : "bg-primary/15 text-primary";
}

/** Reds are reserved for staff, so custom colors are filtered client-side too. */
export function isRedish(hex: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1] ?? "", 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return r >= 120 && r > g * 2 && r > b * 2;
}

/** Role colors win over a personal name color. */
/**
 * Keeps a personal name color inside a luminance band that stays readable
 * (WCAG AA-ish) on both the light and dark surfaces.
 */
export function readableNameColor(hex: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1] ?? "", 16);
  let rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (c: number[]) => {
    const [r, g, b] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const MIN = 0.12;
  const MAX = 0.45;
  for (let i = 0; i < 24 && lum(rgb) > MAX; i++) rgb = rgb.map((v) => Math.round(v * 0.92));
  for (let i = 0; i < 24 && lum(rgb) < MIN; i++)
    rgb = rgb.map((v) => Math.round(v + (255 - v) * 0.08));
  return `#${rgb.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("")}`;
}

/** Role colors win over a personal name color. */
export function nameColorStyle(role: AppRole | null, color: string | null | undefined) {
  if (role || !color || isRedish(color)) return undefined;
  return { color: readableNameColor(color) } as const;
}
