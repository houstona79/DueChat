import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { readBest, saveBest } from "@/lib/game-scores";

const FACES = ["🎧", "🚀", "🌊", "🍕", "🎲", "🌙", "⚡", "🐙"];

type Card = { id: number; face: string; flipped: boolean; done: boolean };

function deal(): Card[] {
  const deck = [...FACES, ...FACES]
    .map((face, i) => ({ face, key: Math.random(), id: i }))
    .sort((a, b) => a.key - b.key)
    .map((c, i) => ({ id: i, face: c.face, flipped: false, done: false }));
  return deck;
}

export function MemoryMatch() {
  const [cards, setCards] = useState<Card[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [lock, setLock] = useState(false);

  const restart = useCallback(() => {
    setCards(deal());
    setPicked([]);
    setMoves(0);
    setLock(false);
  }, []);

  // Dealt after mount so SSR markup matches (Math.random differs per render).
  useEffect(() => {
    restart();
    setBest(readBest("memory"));
  }, [restart]);

  const won = cards.length > 0 && cards.every((c) => c.done);

  useEffect(() => {
    if (won) setBest(saveBest("memory", moves, true));
  }, [won, moves]);

  const flip = (index: number) => {
    if (lock || cards[index]?.flipped || cards[index]?.done) return;
    const next = cards.map((c, i) => (i === index ? { ...c, flipped: true } : c));
    const chosen = [...picked, index];
    setCards(next);
    setPicked(chosen);
    if (chosen.length < 2) return;
    setMoves((m) => m + 1);
    const [a, b] = chosen;
    if (next[a].face === next[b].face) {
      setCards(next.map((c, i) => (i === a || i === b ? { ...c, done: true } : c)));
      setPicked([]);
      return;
    }
    setLock(true);
    window.setTimeout(() => {
      setCards((prev) =>
        prev.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)),
      );
      setPicked([]);
      setLock(false);
    }, 700);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Moves {moves}
          {best !== null ? ` · Best ${best}` : ""}
          {won ? " · Solved!" : ""}
        </p>
        <button
          onClick={restart}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          New game
        </button>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {cards.map((card, i) => (
          <button
            key={card.id}
            onClick={() => flip(i)}
            aria-label={card.flipped || card.done ? `Card ${card.face}` : "Hidden card"}
            className={cn(
              "grid aspect-square place-items-center rounded-xl border border-border text-2xl transition-colors",
              card.done
                ? "border-primary/40 bg-primary/15"
                : card.flipped
                  ? "bg-secondary"
                  : "bg-card hover:bg-secondary",
            )}
          >
            <span className={card.flipped || card.done ? "" : "opacity-0"}>{card.face}</span>
          </button>
        ))}
      </div>
    </div>
  );
}