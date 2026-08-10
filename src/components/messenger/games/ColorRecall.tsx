import { useEffect, useRef, useState } from "react";
import { readBest, saveBest } from "@/lib/game-scores";
import { cn } from "@/lib/utils";

const PADS = [
  { id: 0, on: "bg-primary", off: "bg-primary/30", label: "Blue pad" },
  { id: 1, on: "bg-destructive", off: "bg-destructive/30", label: "Red pad" },
  { id: 2, on: "bg-accent", off: "bg-accent/40", label: "Green pad" },
  { id: 3, on: "bg-foreground", off: "bg-foreground/30", label: "Grey pad" },
];

/** Simon-style memory game: repeat the growing sequence of pads. */
export function ColorRecall() {
  const [sequence, setSequence] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "showing" | "input" | "lost">("idle");
  const [best, setBest] = useState<number | null>(() => readBest("color-recall"));
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  const playSequence = (seq: number[]) => {
    setState("showing");
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    seq.forEach((pad, i) => {
      timers.current.push(
        window.setTimeout(() => setFlash(pad), i * 700 + 200),
        window.setTimeout(() => setFlash(null), i * 700 + 600),
      );
    });
    timers.current.push(
      window.setTimeout(
        () => {
          setStep(0);
          setState("input");
        },
        seq.length * 700 + 300,
      ),
    );
  };

  const start = () => {
    const seq = [Math.floor(Math.random() * 4)];
    setSequence(seq);
    playSequence(seq);
  };

  const tap = (pad: number) => {
    if (state !== "input") return;
    if (sequence[step] !== pad) {
      setState("lost");
      setBest(saveBest("color-recall", Math.max(sequence.length - 1, 0)));
      return;
    }
    if (step + 1 === sequence.length) {
      const next = [...sequence, Math.floor(Math.random() * 4)];
      setSequence(next);
      playSequence(next);
      return;
    }
    setStep(step + 1);
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground" role="status">
        {state === "idle"
          ? "Watch the pads, then repeat the order."
          : state === "showing"
            ? "Watch…"
            : state === "input"
              ? `Your turn — round ${sequence.length}`
              : `Missed it at round ${sequence.length}.`}
        {best !== null ? ` · best ${best}` : ""}
      </p>
      <div className="mt-3 grid w-full max-w-[240px] grid-cols-2 gap-2">
        {PADS.map((pad) => (
          <button
            key={pad.id}
            type="button"
            onClick={() => tap(pad.id)}
            aria-label={pad.label}
            className={cn(
              "aspect-square rounded-2xl transition-colors",
              flash === pad.id ? pad.on : pad.off,
            )}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={start}
        className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs font-medium"
      >
        {state === "idle" ? "Start" : "Restart"}
      </button>
    </div>
  );
}