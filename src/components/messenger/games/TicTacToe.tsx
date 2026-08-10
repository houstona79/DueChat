import { useState } from "react";
import { cn } from "@/lib/utils";

type Cell = "X" | "O" | null;

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function winner(board: Cell[]): Cell {
  for (const [a, b, c] of LINES) {
    if (board[a!] && board[a!] === board[b!] && board[a!] === board[c!]) return board[a!]!;
  }
  return null;
}

/** Picks a winning or blocking square when it can, otherwise plays the centre or at random. */
function cpuMove(board: Cell[]): number {
  const empty = board.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
  for (const mark of ["O", "X"] as const) {
    for (const i of empty) {
      const next = [...board];
      next[i] = mark;
      if (winner(next) === mark) return i;
    }
  }
  if (board[4] === null) return 4;
  return empty[Math.floor(Math.random() * empty.length)] ?? -1;
}

export function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(() => Array<Cell>(9).fill(null));
  const [busy, setBusy] = useState(false);
  const won = winner(board);
  const full = board.every((c) => c !== null);

  const play = (index: number) => {
    if (board[index] || won || busy) return;
    const next = [...board];
    next[index] = "X";
    setBoard(next);
    if (winner(next) || next.every((c) => c !== null)) return;
    setBusy(true);
    window.setTimeout(() => {
      const move = cpuMove(next);
      if (move >= 0) {
        const after = [...next];
        after[move] = "O";
        setBoard(after);
      }
      setBusy(false);
    }, 300);
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground" role="status">
        {won === "X"
          ? "You win!"
          : won === "O"
            ? "The bot wins."
            : full
              ? "A draw."
              : "You are X — tap a square."}
      </p>
      <div className="mt-3 grid w-full max-w-[240px] grid-cols-3 gap-1.5">
        {board.map((cell, i) => (
          <button
            key={i}
            type="button"
            onClick={() => play(i)}
            aria-label={`Square ${i + 1}${cell ? `, ${cell}` : ", empty"}`}
            className={cn(
              "grid aspect-square place-items-center rounded-xl bg-secondary text-2xl font-bold",
              cell === "X" && "text-primary",
              cell === "O" && "text-muted-foreground",
            )}
          >
            {cell}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setBoard(Array<Cell>(9).fill(null))}
        className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs font-medium"
      >
        New game
      </button>
    </div>
  );
}