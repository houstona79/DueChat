import { Accessibility, RotateCcw, X } from "lucide-react";
import { useState } from "react";

import { TEXT_SCALES, useA11y, type A11yPrefs } from "@/hooks/use-a11y";
import { useTheme } from "@/hooks/use-theme";
import { ThemePicker } from "@/components/system/ThemePicker";

const TOGGLES: { key: keyof A11yPrefs; label: string; hint: string }[] = [
  {
    key: "highContrast",
    label: "High contrast",
    hint: "Stronger text and border contrast throughout DueChat.",
  },
  {
    key: "reduceMotion",
    label: "Reduce motion",
    hint: "Turns off animations, transitions and smooth scrolling.",
  },
  {
    key: "underlineLinks",
    label: "Always underline links",
    hint: "Links stay underlined so they don't rely on colour alone.",
  },
  {
    key: "largeTargets",
    label: "Larger tap targets",
    hint: "Buttons and links get a 44×44 pixel minimum size.",
  },
  {
    key: "focusRing",
    label: "Bold focus outline",
    hint: "Thicker keyboard focus ring for easier tracking.",
  },
];

/** Per-device accessibility (ADA / WCAG) preferences, stored on this browser. */
export function AccessibilitySettings() {
  const { prefs, update, reset } = useA11y();
  const { theme, setTheme } = useTheme();

  return (
    <section
      aria-labelledby="a11y-heading"
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Accessibility className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="a11y-heading" className="text-base font-semibold">
            Accessibility
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            These settings apply to DueChat on this device and save automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold"
        >
          <RotateCcw className="size-3.5" aria-hidden /> Reset
        </button>
      </div>

      <fieldset className="mt-5">
        <legend className="text-[11px] font-medium text-muted-foreground">Text size</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TEXT_SCALES.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={prefs.textScale === s.value}
              onClick={() => update("textScale", s.value)}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${
                prefs.textScale === s.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-[11px] font-medium text-muted-foreground">Appearance</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={theme === t}
              onClick={() => setTheme(t)}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold capitalize ${
                theme === t ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
              }`}
            >
              {t} mode
            </button>
          ))}
        </div>
      </fieldset>

      <ThemePicker />

      <ul className="mt-5 space-y-2">
        {TOGGLES.map((t) => {
          const on = prefs[t.key] === true;
          return (
            <li key={t.key}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-secondary px-3 py-3">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => update(t.key, e.target.checked as never)}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{t.label}</span>
                  <span className="block text-xs text-muted-foreground">{t.hint}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Sidebar/header button that opens the accessibility panel in an overlay. */
export function AccessibilityButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Accessibility settings"
        title="Accessibility settings"
        className={
          className ??
          "grid size-9 min-h-9 min-w-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        }
      >
        <Accessibility className="size-4" aria-hidden />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Accessibility settings"
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close accessibility settings"
                className="grid size-9 min-h-9 min-w-9 place-items-center rounded-xl bg-secondary text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <AccessibilitySettings />
          </div>
        </div>
      ) : null}
    </>
  );
}
