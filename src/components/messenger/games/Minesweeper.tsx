import { useState } from "react";
import { cn } from "@/lib/utils";

const SIZE = 8;
const MINES = 10;

type Tile = { mine: boolean; open: boolean; flag: boolean; near: number };

function neighbours(index: number): number[] {
  const x = index % SIZE;
  const y = Math.floor(index / SIZE);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue;
      out.push(ny * SIZE + nx);
    }
  }
  return out;
}

function build(): Tile[] {
  const tiles: Tile[] = Array.from({ length: SIZE * SIZE }, () => ({
    mine: false,
    open: false,
    flag: false,
    near: 0,
  }));
  let placed = 0;
  while (placed < MINES) {
    const i = Math.floor(Math.random() * tiles.length);
    if (tiles[i]!.mine) continue;
    tiles[i]!.mine = true;
    placed += 1;
  }
  for (let i = 0; i < tiles.length; i += 1) {
    tiles[i]!.near = neighbours(i).filter((n) => tiles[n]!.mine).length;
  }
  return tiles;
}

export function Minesweeper() {
  const [tiles, setTiles] = useState<Tile[]>(build);
  const [state, setState] = useState<"play" | "lost" | "won">("play");
  const [flagMode, setFlagMode] = useState(false);

  const reveal = (index: number) => {
    if (state !== "play") return;
    const next = tiles.map((t) => ({ ...t }));
    if (flagMode) {
      if (!next[index]!.open) next[index]!.flag = !next[index]!.flag;
      setTiles(next);
      return;
    }
    if (next[index]!.flag || next[index]!.open) return;
    if (next[index]!.mine) {
      next.forEach((t) => {
        if (t.mine) t.open = true;
      });
      setTiles(next);
      setState("lost");
      return;
    }
    const queue = [index];
    while (queue.length > 0) {
      const current = queue.pop()!;
      const tile = next[current]!;
      if (tile.open || tile.mine) continue;
      tile.open = true;
      if (tile.near === 0) queue.push(...neighbours(current).filter((n) => !next[n]!.open));
    }
    setTiles(next);
    if (next.every((t) => t.open || t.mine)) setState("won");
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground" role="status">
        {state === "lost"
          ? "Boom — you hit a mine."
          : state === "won"
            ? "Cleared! Every safe tile is open."
            : `${MINES} mines hidden · ${tiles.filter((t) => t.flag).length} flagged`}
      </p>
      <div className="mt-3 grid grid-cols-8 gap-1">
        {tiles.map((tile, i) => (
          <button
            key={i}
            type="button"
            onClick={() => reveal(i)}
            aria-label={`Tile ${i + 1}`}
            className={cn(
              "grid aspect-square place-items-center rounded-md text-xs font-bold",
              tile.open
                ? tile.mine
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-background text-foreground"
                : "bg-secondary",
            )}
          >
            {tile.open ? (tile.mine ? "✳" : tile.near || "") : tile.flag ? "🚩" : ""}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setFlagMode((v) => !v)}
          aria-pressed={flagMode}
          className={cn(
            "rounded-xl px-3 py-2 text-xs font-medium",
            flagMode ? "bg-primary/15 text-primary" : "bg-secondary",
          )}
        >
          {flagMode ? "Flag mode on" : "Flag mode off"}
        </button>
        <button
          type="button"
          onClick={() => {
            setTiles(build());
            setState("play");
          }}
          className="rounded-xl bg-secondary px-3 py-2 text-xs font-medium"
        >
          New board
        </button>
      </div>
    </div>
  );
}