import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { fetchProfilePoints } from "@/lib/credits";

/** Shows a member's credit total as "points" on their profile. */
export function PointsBadge({ userId }: { userId: string }) {
  const { data: points } = useQuery({
    queryKey: ["profile-points", userId],
    queryFn: () => fetchProfilePoints(userId),
    staleTime: 30_000,
  });

  if (points == null) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium"
      title="Points earned and received on DueChat"
    >
      <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
      <span>{points.toLocaleString()} points</span>
    </div>
  );
}
