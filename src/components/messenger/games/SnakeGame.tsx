import { useEffect, useRef, useState } from "react";
import { readBest, saveBest } from "@/lib/game-scores";
import { cn } from "@/lib/utils";

const SIZE = 12;
const START = [{ x: 6, y: 6 }];

type Point = { x: number; y: number };

const randomFood = (snake: Point[]): Point => {
  for (let tries = 0; tries < 200; tries += 1) {
    const p = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
  return { x: 0, y: 0 };
};

export function SnakeGame() {
  const [snake, setSnake] = useState<Point[]>(START);
  const [food, setFood] = useState<Point>({ x: 2, y: 2 });
  const [dir, setDir] = useState<Point>({ x: 1, y: 0 });
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number | null>(() => readBest("snake"));
  const dirRef = useRef(dir);
  dirRef.current = dir;

  useEffect(() => {
    if (over) return;
    const id = window.setInterval(() => {
      setSnake((current) => {
        const head = current[0]!;
        const d = dirRef.current;
        const next = { x: head.x + d.x, y: head.y + d.y };
        if (
          next.x < 0 ||
          next.y < 0 ||
          next.x >= SIZE ||
          next.y >= SIZE ||
          current.some((s) => s.x === next.x && s.y === next.y)
        ) {
          setOver(true);
          return current;
        }
        const grew = next.x === food.x && next.y === food.y;
        const body = [next, ...current];
        if (grew) {
          setScore((s) => s + 1);
          setFood(randomFood(body));
        } else {
          body.pop();
        }
        return body;
      });
    }, 180);
    return () => window.clearInterval(id);
  }, [over, food]);

  useEffect(() => {
    if (!over) return;
    setBest(saveBest("snake", score));
  }, [over, score]);

  const turn = (next: Point) =>
    setDir((current) => (current.x + next.x === 0 && current.y + next.y === 0 ? current : next));

  useEffect(() => {
    const keys: Record<string, Point> = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
    };
    const onKey = (e: KeyboardEvent) => {
      const next = keys[e.key];
      if (!next) return;
      e.preventDefault();
      setDir((current) =>
        current.x + next.x === 0 && current.y + next.y === 0 ? current : next,
      );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const reset = () => {
    setSnake(START);
    setFood({ x: 2, y: 2 });
    setDir({ x: 1, y: 0 });
    setScore(0);
    setOver(false);
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground" role="status">
        Score {score}
        {best !== null ? ` · best ${best}` : ""}
        {over ? " · game over" : ""}
      </p>
      <div
        className="mt-3 grid gap-px rounded-xl bg-secondary p-1.5"
        style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
        aria-label="Snake board"
      >
        {Array.from({ length: SIZE * SIZE }, (_, i) => {
          const x = i % SIZE;
          const y = Math.floor(i / SIZE);
          const isHead = snake[0]?.x === x && snake[0]?.y === y;
          const isBody = snake.some((s) => s.x === x && s.y === y);
          const isFood = food.x === x && food.y === y;
          return (
            <span
              key={i}
              className={cn(
                "aspect-square rounded-[2px]",
                isHead
                  ? "bg-primary"
                  : isBody
                    ? "bg-primary/60"
                    : isFood
                      ? "bg-destructive"
                      : "bg-background",
              )}
            />
          );
        })}
      </div>
      <div className="mt-3 grid w-full max-w-[180px] grid-cols-3 gap-1.5">
        <span />
        <button
          type="button"
          onClick={() => turn({ x: 0, y: -1 })}
          aria-label="Move up"
          className="rounded-xl bg-secondary py-2 text-xs"
        >
          ▲
        </button>
        <span />
        <button
          type="button"
          onClick={() => turn({ x: -1, y: 0 })}
          aria-label="Move left"
          className="rounded-xl bg-secondary py-2 text-xs"
        >
          ◀
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-secondary py-2 text-[11px] font-medium"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => turn({ x: 1, y: 0 })}
          aria-label="Move right"
          className="rounded-xl bg-secondary py-2 text-xs"
        >
          ▶
        </button>
        <span />
        <button
          type="button"
          onClick={() => turn({ x: 0, y: 1 })}
          aria-label="Move down"
          className="rounded-xl bg-secondary py-2 text-xs"
        >
          ▼
        </button>
        <span />
      </div>
    </div>
  );
}