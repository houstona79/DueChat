import { useState } from "react";
import { cn } from "@/lib/utils";
import { Game2048 } from "./games/Game2048";
import { MemoryMatch } from "./games/MemoryMatch";
import { WordGuess } from "./games/WordGuess";

const GAMES = [
  { id: "memory", label: "Memory" },
  { id: "2048", label: "2048" },
  { id: "word", label: "Word guess" },
] as const;

type GameId = (typeof GAMES)[number]["id"];

export function GamesPanel() {
  const [active, setActive] = useState<GameId>("memory");

  return (
    <div className="p-4">
      <div className="flex gap-1.5" role="tablist" aria-label="Games">
        {GAMES.map((game) => (
          <button
            key={game.id}
            role="tab"
            aria-selected={active === game.id}
            onClick={() => setActive(game.id)}
            className={cn(
              "h-9 rounded-xl px-3 text-xs font-medium",
              active === game.id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-secondary",
            )}
          >
            {game.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {active === "memory" ? <MemoryMatch /> : null}
        {active === "2048" ? <Game2048 /> : null}
        {active === "word" ? <WordGuess /> : null}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">
        Solo games — your best scores are saved on this device.
      </p>
    </div>
  );
}
