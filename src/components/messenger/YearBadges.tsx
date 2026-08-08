import { Star } from "lucide-react";
import type { Profile } from "@/lib/chat";
import { cn } from "@/lib/utils";

/** Distinct color per membership year, cycling after the palette runs out. */
const TIERS = [
  { label: "1 Year", cls: "bg-primary/15 text-primary ring-primary/30" },
  { label: "2 Years", cls: "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30" },
  { label: "3 Years", cls: "bg-amber-500/15 text-amber-500 ring-amber-500/30" },
  { label: "4 Years", cls: "bg-sky-500/15 text-sky-500 ring-sky-500/30" },
  { label: "5 Years", cls: "bg-fuchsia-500/15 text-fuchsia-500 ring-fuchsia-500/30" },
  { label: "6 Years", cls: "bg-orange-500/15 text-orange-500 ring-orange-500/30" },
  { label: "7 Years", cls: "bg-teal-500/15 text-teal-500 ring-teal-500/30" },
  { label: "8 Years", cls: "bg-violet-500/15 text-violet-500 ring-violet-500/30" },
];

/** Full years between the join date and now. */
export function membershipYears(joinedAt: string | null | undefined) {
  if (!joinedAt) return 0;
  const joined = new Date(joinedAt);
  if (Number.isNaN(joined.getTime())) return 0;
  const now = new Date();
  let years = now.getFullYear() - joined.getFullYear();
  const anniversary = new Date(joined);
  anniversary.setFullYear(joined.getFullYear() + years);
  if (anniversary.getTime() > now.getTime()) years -= 1;
  return Math.max(0, years);
}

/** One colored badge for every full year a member has been on DueChat. */
export function YearBadges({ profile }: { profile: Profile }) {
  const years = membershipYears(profile.created_at);
  if (years < 1) return null;

  return (
    <section aria-label="Membership anniversary badges" className="flex flex-wrap gap-1.5">
      {Array.from({ length: years }, (_, i) => {
        const tier = TIERS[i % TIERS.length]!;
        const label = `${i + 1} ${i === 0 ? "Year" : "Years"} on DueChat`;
        return (
          <span
            key={i}
            title={label}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
              tier.cls,
            )}
          >
            <Star className="size-3 fill-current" aria-hidden />
            <span>{i + 1}y</span>
            <span className="sr-only">{label}</span>
          </span>
        );
      })}
    </section>
  );
}