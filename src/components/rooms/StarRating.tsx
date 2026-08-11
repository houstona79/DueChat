import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRow({
  value,
  size = "sm",
  className,
}: {
  value: number;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${value.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn(
            size === "lg" ? "size-5" : "size-3.5",
            n <= Math.round(value)
              ? "fill-primary text-primary"
              : "text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}

export function StarPicker({
  value,
  onPick,
  disabled,
}: {
  value: number;
  onPick: (stars: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onPick(n)}
          aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
          className="grid size-9 place-items-center rounded-lg hover:bg-secondary disabled:opacity-60"
        >
          <Star
            aria-hidden
            className={cn(
              "size-5",
              n <= value ? "fill-primary text-primary" : "text-muted-foreground/50",
            )}
          />
        </button>
      ))}
    </div>
  );
}
