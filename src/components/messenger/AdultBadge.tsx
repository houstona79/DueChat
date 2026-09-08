import { useQuery } from "@tanstack/react-query";
import { fetchIsAdult } from "@/lib/chat";

/**
 * Shows the 18+ line for a member without reading their birth date:
 * the check happens in the database and only returns yes/no.
 */
export function AdultBadge({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["is-adult", userId],
    queryFn: () => fetchIsAdult(userId),
    staleTime: 5 * 60_000,
  });
  if (!data) return null;
  return <p className="text-xs text-muted-foreground">Verified 18+</p>;
}
