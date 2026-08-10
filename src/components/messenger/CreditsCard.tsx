import { Coins } from "lucide-react";
import { useCredits } from "@/hooks/use-chat";
import { DAILY_CREDIT_GRANT } from "@/lib/credits";

/** Sidebar card showing the credit balance used for gifts. */
export function CreditsCard({ meId }: { meId: string | undefined }) {
  const { data: balance, isLoading } = useCredits(meId);
  if (!meId) return null;

  return (
    <section
      aria-label="Gift credits"
      className="mx-1 mb-2 flex items-center gap-3 rounded-2xl bg-secondary px-3 py-2.5"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
        <Coins className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">
          {isLoading ? "…" : `${balance ?? 0} credits`}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {DAILY_CREDIT_GRANT} free credits every day · spend them on gifts
        </span>
      </span>
    </section>
  );
}