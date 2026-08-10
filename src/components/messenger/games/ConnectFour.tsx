import { useState } from "react";
import { cn } from "@/lib/utils";

type Disc = "you" | "bot" | null;
const COLS = 7;
const ROWS = 6;

const emptyBoard = (): Disc[] => Array<Disc>(COLS * ROWS).fill(null);
const at = (board: Disc[], col: number, row: number) => board[row * COLS + col] ?? null;

function drop(board: Disc[], col: number, disc: Disc): Disc[] | null {
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (at(board, col, row) === null) {
      const next = [...board];
      next[row * COLS + col] = disc;
      return next;
    }
  }
  return null;
}

function wins(board: Disc[], disc: Disc) {
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (at(board, col, row) !== disc) continue;
      for (const [dc, dr] of dirs) {
        let count = 0;
        for (let step = 0; step < 4; step += 1) {
          const c = col + dc! * step;
          const r = row + dr! * step;
          if (c < 0 || c >= COLS || r < 0 || r >= ROWS) break;
          if (at(board, c, r) !== disc) break;
          count += 1;
        }
        if (count === 4) return true;
      }
    }
  }
  return false;
}

export function ConnectFour() {
  const [board, setBoard] = useState<Disc[]>(emptyBoard);
  const [result, setResult] = useState<"you" | "bot" | "draw" | null>(null);

  const play = (col: number) => {
    if (result) return;
    const mine = drop(board, col, "you");
    if (!mine) return;
    if (wins(mine, "you")) {
      setBoard(mine);
      setResult("you");
      return;
    }
    const options = Array.from({ length: COLS }, (_, c) => c).filter((c) => drop(mine, c, "bot"));
    if (options.length === 0) {
      setBoard(mine);
      setResult("draw");
      return;
    }
    let choice =
      options.find((c) => {
        const test = drop(mine, c, "bot");
        return test ? wins(test, "bot") : false;
      }) ??
      options.find((c) => {
        const test = drop(mine, c, "you");
        return test ? wins(test, "you") : false;
      }) ??
      null;
    if (choice === null || choice === undefined) {
      const ordered = [3, 2, 4, 1, 5, 0, 6].filter((c) => options.includes(c));
      choice = ordered[0] ?? options[0]!;
    }
    const after = drop(mine, choice, "bot") ?? mine;
    setBoard(after);
    if (wins(after, "bot")) setResult("bot");
    else if (after.every((c) => c !== null)) setResult("draw");
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground" role="status">
        {result === "you"
          ? "Four in a row — you win!"
          : result === "bot"
            ? "The bot got four in a row."
            : result === "draw"
              ? "The board is full — a draw."
              : "Tap a column to drop a disc."}
      </p>
      <div className="mt-3 grid grid-cols-7 gap-1 rounded-xl bg-secondary p-1.5">
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const col = i % COLS;
          const disc = board[i] ?? null;
          return (
            <button
              key={i}
              type="button"
              onClick={() => play(col)}
              aria-label={`Column ${col + 1}`}
              className={cn(
                "aspect-square rounded-full",
                disc === "you" ? "bg-primary" : disc === "bot" ? "bg-destructive" : "bg-background",
              )}
            />
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => {
          setBoard(emptyBoard());
          setResult(null);
        }}
        className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs font-medium"
      >
        New game
      </button>
    </div>
  );
}