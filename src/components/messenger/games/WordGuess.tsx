import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { readBest, saveBest } from "@/lib/game-scores";

const WORDS = [
  "chats", "rooms", "music", "voice", "video", "party", "smile", "night",
  "cloud", "spark", "river", "green", "tiger", "pixel", "beach", "lemon",
  "candy", "storm", "piano", "robot", "happy", "brave", "juice", "flame",
];

const MAX_TRIES = 6;
type Mark = "hit" | "near" | "miss";

function score(guess: string, answer: string): Mark[] {
  const marks: Mark[] = Array.from({ length: 5 }, () => "miss");
  const pool = answer.split("");
  guess.split("").forEach((letter, i) => {
    if (pool[i] === letter) {
      marks[i] = "hit";
      pool[i] = "";
    }
  });
  guess.split("").forEach((letter, i) => {
    if (marks[i] === "hit") return;
    const at = pool.indexOf(letter);
    if (at >= 0) {
      marks[i] = "near";
      pool[at] = "";
    }
  });
  return marks;
}

export function WordGuess() {
  const [answer, setAnswer] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [best, setBest] = useState<number | null>(null);

  const restart = useCallback(() => {
    setAnswer(WORDS[Math.floor(Math.random() * WORDS.length)] ?? "chats");
    setGuesses([]);
    setDraft("");
  }, []);

  // Word is chosen after mount so SSR and client markup match.
  useEffect(() => {
    restart();
    setBest(readBest("word"));
  }, [restart]);

  const won = guesses.includes(answer) && answer !== "";
  const done = won || guesses.length >= MAX_TRIES;

  useEffect(() => {
    if (won) setBest(saveBest("word", guesses.length, true));
  }, [won, guesses.length]);

  const submit = () => {
    const guess = draft.toLowerCase();
    if (guess.length !== 5 || done) return;
    setGuesses((prev) => [...prev, guess]);
    setDraft("");
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Guess the 5-letter word
          {best !== null ? ` · Best ${best} tries` : ""}
        </p>
        <button
          onClick={restart}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          New word
        </button>
      </div>

      <div className="mt-3 space-y-1.5">
        {Array.from({ length: MAX_TRIES }, (_, row) => {
          const guess = guesses[row];
          const marks = guess ? score(guess, answer) : null;
          return (
            <div key={row} className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 5 }, (_, col) => (
                <span
                  key={col}
                  className={cn(
                    "grid aspect-square place-items-center rounded-lg border border-border font-display text-base font-semibold uppercase",
                    marks?.[col] === "hit" && "border-primary bg-primary text-primary-foreground",
                    marks?.[col] === "near" && "border-primary/40 bg-primary/20",
                    marks?.[col] === "miss" && "bg-secondary text-muted-foreground",
                  )}
                >
                  {guess?.[col] ?? ""}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      {done ? (
        <p className="mt-3 text-sm" aria-live="polite">
          {won ? (
            <span className="text-primary">
              Got it in {guesses.length} {guesses.length === 1 ? "try" : "tries"}!
            </span>
          ) : (
            <span className="text-muted-foreground">
              Out of tries — the word was <strong className="uppercase">{answer}</strong>.
            </span>
          )}
        </p>
      ) : (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 5))}
            aria-label="Your guess"
            placeholder="Type 5 letters"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-xl bg-secondary px-3 py-2.5 text-sm uppercase outline-none"
          />
          <button
            type="submit"
            disabled={draft.length !== 5}
            className="rounded-xl bg-primary px-3.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Guess
          </button>
        </form>
      )}
    </div>
  );
}