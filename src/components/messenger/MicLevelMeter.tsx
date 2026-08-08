import { cn } from "@/lib/utils";

export function MicLevelMeter({
  level,
  active,
  className,
}: {
  level: number;
  active: boolean;
  className?: string;
}) {
  // Convert 0-1 level into 6 discrete segments so it reads like a classic VU.
  const segments = 6;
  const filled = active ? Math.max(1, Math.round(level * segments)) : 0;

  return (
    <div
      aria-label="Microphone input level"
      aria-valuenow={Math.round(level * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      role="meter"
      className={cn("flex flex-col-reverse gap-px", className)}
      title="Microphone input level"
    >
      {Array.from({ length: segments }).map((_, i) => {
        const on = i < filled;
        return (
          <div
            key={i}
            className={cn(
              "h-1.5 w-4 rounded-sm transition-colors duration-75",
              on
                ? i >= segments - 2
                  ? "bg-red-500"
                  : i >= segments - 4
                    ? "bg-amber-400"
                    : "bg-emerald-500"
                : "bg-muted",
            )}
          />
        );
      })}
    </div>
  );
}
