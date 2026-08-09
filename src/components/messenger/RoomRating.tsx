import { useState } from "react";
import { Baby, Check, Wine } from "lucide-react";
import { ROOM_RATING_LABEL, type RoomRating as Rating } from "@/lib/chat";
import { cn } from "@/lib/utils";

export function RatingBadge({ rating, className }: { rating: Rating; className?: string }) {
  return (
    <span
      title={ROOM_RATING_LABEL[rating]}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        rating === "R" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary",
        className,
      )}
    >
      {rating}
    </span>
  );
}

export function RatingControl({
  rating,
  canEdit,
  onChange,
}: {
  rating: Rating;
  canEdit: boolean;
  onChange: (next: Rating) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!canEdit) return <RatingBadge rating={rating} />;

  const pick = async (next: Rating) => {
    setBusy(true);
    try {
      await onChange(next);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Room rating: ${ROOM_RATING_LABEL[rating]}. Change rating`}
        title="Change room rating"
      >
        <RatingBadge rating={rating} className="border border-border/60 px-2.5 py-1" />
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-border bg-popover p-1.5 shadow-xl">
          {(["G", "R"] as Rating[]).map((option) => (
            <button
              key={option}
              disabled={busy}
              onClick={() => pick(option)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-secondary disabled:opacity-60",
                option === rating && "bg-secondary",
              )}
            >
              {option === "R" ? (
                <Wine className="size-4 text-destructive" aria-hidden />
              ) : (
                <Baby className="size-4 text-primary" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-medium">
                  {option} — {ROOM_RATING_LABEL[option]}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {option === "R" ? "18+ content, members confirm age" : "Keep it family friendly"}
                </span>
              </span>
              {option === rating ? <Check className="size-4 text-primary" aria-hidden /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
