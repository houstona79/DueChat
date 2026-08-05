import { cn } from "@/lib/utils";
import { initials } from "@/lib/messenger";

const ACCENTS: Record<string, string> = {
  "accent-1": "bg-accent-1/20 text-accent-1",
  "accent-2": "bg-accent-2/20 text-accent-2",
  "accent-3": "bg-accent-3/20 text-accent-3",
  "accent-4": "bg-accent-4/20 text-accent-4",
};

export function Avatar({
  name,
  accent,
  online,
  size = "md",
}: {
  name: string;
  accent: string;
  online?: boolean;
  size?: "md" | "sm";
}) {
  return (
    <span className="relative inline-flex shrink-0">
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-2xl font-display font-semibold",
          size === "md" ? "size-11 text-sm" : "size-9 text-xs",
          ACCENTS[accent] ?? ACCENTS["accent-1"],
        )}
      >
        {initials(name)}
      </span>
      {online ? (
        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-online" />
      ) : null}
    </span>
  );
}