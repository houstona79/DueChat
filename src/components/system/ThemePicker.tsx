import { Palette } from "lucide-react";

import { SKINS, useSkin } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

/** Colour-theme swatch grid, used in Settings > Accessibility > Appearance. */
export function ThemePicker() {
  const { skin, setSkin } = useSkin();

  return (
    <fieldset className="mt-5">
      <legend className="text-[11px] font-medium text-muted-foreground">Colour theme</legend>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {SKINS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={skin === s.id}
            onClick={() => setSkin(s.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 text-[11px] font-semibold",
              skin === s.id ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
            )}
          >
            <span
              aria-hidden
              className="size-5 rounded-full border border-border"
              style={{ background: s.swatch }}
            />
            {s.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Compact messenger header control that cycles through the colour themes. */
export function ThemeSkinButton({ className }: { className?: string }) {
  const { skin, setSkin } = useSkin();
  const current = SKINS.find((s) => s.id === skin) ?? SKINS[0]!;

  const next = () => {
    const i = SKINS.findIndex((s) => s.id === skin);
    setSkin(SKINS[(i + 1) % SKINS.length]!.id);
  };

  return (
    <button
      type="button"
      onClick={next}
      aria-label={`Colour theme: ${current.label}. Switch to next theme`}
      title={`Colour theme: ${current.label}`}
      className={cn(
        "grid size-9 min-h-9 min-w-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
        className,
      )}
    >
      <Palette className="size-4" aria-hidden />
    </button>
  );
}
