import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Check } from "lucide-react";

type Puzzle = { a: number; b: number; op: "+" | "-"; answer: number };

function makePuzzle(): Puzzle {
  const op: "+" | "-" = Math.random() < 0.5 ? "+" : "-";
  let a = Math.floor(Math.random() * 9) + 2;
  let b = Math.floor(Math.random() * 8) + 1;
  if (op === "-" && b > a) [a, b] = [b, a];
  return { a, b, op, answer: op === "+" ? a + b : a - b };
}

export function HumanCheck({
  verified,
  onVerifiedChange,
}: {
  verified: boolean;
  onVerifiedChange: (v: boolean) => void;
}) {
  // Generated after mount so SSR and client markup match (Math.random differs).
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setPuzzle(makePuzzle());
  }, []);

  const reset = useCallback(() => {
    setPuzzle(makePuzzle());
    setValue("");
    setError(false);
    onVerifiedChange(false);
  }, [onVerifiedChange]);

  useEffect(() => {
    if (verified || !puzzle) return;
    const trimmed = value.trim();
    const guess = Number(trimmed);
    if (trimmed === "" || Number.isNaN(guess)) {
      setError(false);
      return;
    }
    if (guess === puzzle.answer) {
      setError(false);
      onVerifiedChange(true);
    } else if (trimmed.length >= String(puzzle.answer).length) {
      setError(true);
    }
  }, [value, puzzle, verified, onVerifiedChange]);

  if (verified) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
        <Check className="size-4 text-primary" aria-hidden="true" />
        <span>Human verification passed.</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-secondary px-3 py-2.5">
      <div className="flex items-center justify-between">
        <label htmlFor="human-check" className="text-[11px] font-medium text-muted-foreground">
          Human verification
        </label>
        <button
          type="button"
          onClick={reset}
          aria-label="New question"
          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="select-none font-display text-sm tabular-nums">
          {puzzle ? (
            <>
              {puzzle.a} {puzzle.op === "+" ? "+" : "\u2212"} {puzzle.b} =
            </>
          ) : (
            <>&nbsp;</>
          )}
        </span>
        <input
          id="human-check"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          disabled={!puzzle}
          maxLength={3}
          onChange={(e) => setValue(e.target.value.replace(/[^\d-]/g, ""))}
          className="w-16 rounded-lg bg-background px-2.5 py-1.5 text-sm outline-none"
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-destructive">
          That&apos;s not quite right &mdash; try again.
        </p>
      ) : null}
    </div>
  );
}
