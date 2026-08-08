import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { readBest, saveBest } from "@/lib/game-scores";

type Grid = number[][];
type Dir = "up" | "down" | "left" | "right";

const SIZE = 4;

function empty(): Grid {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => 0));
}

function addTile(grid: Grid): Grid {
  const spots: Array<[number, number]> = [];
  grid.forEach((row, r) => row.forEach((v, c) => (v === 0 ? spots.push([r, c]) : undefined)));
  if (spots.length === 0) return grid;
  const spot = spots[Math.floor(Math.random() * spots.length)]!;
  const next = grid.map((row) => [...row]);
  next[spot[0]]![spot[1]] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function collapse(line: number[]): { line: number[]; gained: number } {
  const values = line.filter((v) => v !== 0);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < values.length; i += 1) {
    const current = values[i]!;
    if (values[i + 1] === current) {
      out.push(current * 2);
      gained += current * 2;
      i += 1;
    } else {
      out.push(current);
    }
  }
  while (out.length < SIZE) out.push(0);
  return { line: out, gained };
}

function rows(grid: Grid, dir: Dir): number[][] {
  if (dir === "left") return grid.map((row) => [...row]);
  if (dir === "right") return grid.map((row) => [...row].reverse());
  const cols: number[][] = [];
  for (let c = 0; c < SIZE; c += 1) {
    const col = grid.map((row) => row[c]!);
    cols.push(dir === "up" ? col : col.reverse());
  }
  return cols;
}

function unrows(lines: number[][], dir: Dir): Grid {
  const grid = empty();
  lines.forEach((line, i) => {
    const ordered = dir === "right" || dir === "down" ? [...line].reverse() : line;
    ordered.forEach((value, j) => {
      if (dir === "left" || dir === "right") grid[i]![j] = value;
      else grid[j]![i] = value;
    });
  });
  return grid;
}

function move(grid: Grid, dir: Dir): { grid: Grid; gained: number; moved: boolean } {
  let gained = 0;
  const lines = rows(grid, dir).map((line) => {
    const result = collapse(line);
    gained += result.gained;
    return result.line;
  });
  const next = unrows(lines, dir);
  const moved = JSON.stringify(next) !== JSON.stringify(grid);
  return { grid: next, gained, moved };
}

function stuck(grid: Grid): boolean {
  return (["up", "down", "left", "right"] as Dir[]).every((dir) => !move(grid, dir).moved);
}

const TILE_STYLES: Record<number, string> = {
  0: "bg-secondary/60 text-transparent",
  2: "bg-secondary text-foreground",
  4: "bg-secondary text-foreground",
  8: "bg-primary/25 text-foreground",
  16: "bg-primary/35 text-foreground",
  32: "bg-primary/50 text-primary-foreground",
  64: "bg-primary/65 text-primary-foreground",
};

export function Game2048() {
  const [grid, setGrid] = useState<Grid>(empty);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [over, setOver] = useState(false);

  const restart = useCallback(() => {
    setGrid(addTile(addTile(empty())));
    setScore(0);
    setOver(false);
  }, []);

  // Tiles are seeded after mount so SSR and client markup match.
  useEffect(() => {
    restart();
    setBest(readBest("2048"));
  }, [restart]);

  const push = useCallback(
    (dir: Dir) => {
      setGrid((prev) => {
        const result = move(prev, dir);
        if (!result.moved) return prev;
        const next = addTile(result.grid);
        setScore((s) => {
          const total = s + result.gained;
          setBest(saveBest("2048", total));
          return total;
        });
        setOver(stuck(next));
        return next;
      });
    },
    [],
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Score {score}
          {best !== null ? ` · Best ${best}` : ""}
          {over ? " · No moves left" : ""}
        </p>
        <button
          onClick={restart}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          New game
        </button>
      </div>
      <div
        role="grid"
        aria-label="2048 board"
        tabIndex={0}
        onKeyDown={(e) => {
          const map: Record<string, Dir> = {
            ArrowUp: "up",
            ArrowDown: "down",
            ArrowLeft: "left",
            ArrowRight: "right",
          };
          const dir = map[e.key];
          if (!dir) return;
          e.preventDefault();
          push(dir);
        }}
        className="mt-3 grid grid-cols-4 gap-2 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {grid.flatMap((row, r) =>
          row.map((value, c) => (
            <div
              key={`${r}-${c}`}
              role="gridcell"
              className={cn(
                "grid aspect-square place-items-center rounded-xl font-display text-lg font-semibold tabular-nums",
                TILE_STYLES[value] ?? "bg-primary text-primary-foreground",
              )}
            >
              {value === 0 ? "" : value}
            </div>
          )),
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <span />
        <button
          onClick={() => push("up")}
          aria-label="Move up"
          className="grid h-11 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-secondary"
        >
          <ArrowUp className="size-4" />
        </button>
        <span />
        <button
          onClick={() => push("left")}
          aria-label="Move left"
          className="grid h-11 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-secondary"
        >
          <ArrowLeft className="size-4" />
        </button>
        <button
          onClick={() => push("down")}
          aria-label="Move down"
          className="grid h-11 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-secondary"
        >
          <ArrowDown className="size-4" />
        </button>
        <button
          onClick={() => push("right")}
          aria-label="Move right"
          className="grid h-11 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-secondary"
        >
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}