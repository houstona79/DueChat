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
/** Relative luminance of a #rrggbb color. */
function luminance(rgb: number[]) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function toHex(rgb: number[]) {
  return `#${rgb
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function parseHex(hex: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1] ?? "", 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Personal name colors are nudged per theme so they always clear WCAG AA
 * against the current background: darkened for the light theme, lightened
 * for the dark theme, emitted as a CSS light-dark() pair.
 */
export function readableNameColor(hex: string) {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  let light = [...rgb];
  for (let i = 0; i < 40 && luminance(light) > 0.17; i++) light = light.map((v) => v * 0.94);
  let dark = [...rgb];
  for (let i = 0; i < 40 && luminance(dark) < 0.36; i++) dark = dark.map((v) => v + (255 - v) * 0.07);
  return `light-dark(${toHex(light)}, ${toHex(dark)})`;
}

/** Role colors win over a personal name color. */
export function nameColorStyle(role: AppRole | null, color: string | null | undefined) {
  if (role || !color || isRedish(color)) return undefined;
  return { color: readableNameColor(color) } as const;
}
