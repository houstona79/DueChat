const PREFIX = "duechat:game-best:";
const memory = new Map<string, number>();

function store(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const test = "__duechat_test__";
    window.localStorage.setItem(test, "1");
    window.localStorage.removeItem(test);
    return window.localStorage;
  } catch {
    try {
      return typeof window !== "undefined" ? window.sessionStorage : null;
    } catch {
      return null;
    }
  }
}

export function readBest(game: string): number | null {
  const s = store();
  if (!s) return memory.get(game) ?? null;
  const raw = s.getItem(PREFIX + game);
  const value = raw === null ? NaN : Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** Saves the score when it beats the stored best. `lower` treats smaller as better. */
export function saveBest(game: string, score: number, lower = false): number {
  const current = readBest(game);
  const better =
    current === null ? true : lower ? score < current : score > current;
  const next = better ? score : current;
  if (better) {
    memory.set(game, score);
    store()?.setItem(PREFIX + game, String(score));
  }
  return next ?? score;
}