export type Message = {
  id: string;
  threadId: string;
  author: "me" | "them";
  text: string;
  at: number;
};

export type Thread = {
  id: string;
  name: string;
  handle: string;
  accent: string;
  online: boolean;
  messages: Message[];
};

const STORAGE_KEY = "messenger.threads.v1";

const uid = () => Math.random().toString(36).slice(2, 10);
const minutesAgo = (m: number) => Date.now() - m * 60_000;

function seed(): Thread[] {
  const mk = (
    id: string,
    name: string,
    handle: string,
    accent: string,
    online: boolean,
    lines: Array<[Message["author"], string, number]>,
  ): Thread => ({
    id,
    name,
    handle,
    accent,
    online,
    messages: lines.map(([author, text, mins]) => ({
      id: uid(),
      threadId: id,
      author,
      text,
      at: minutesAgo(mins),
    })),
  });

  return [
    mk("mira", "Mira Okonjo", "@mira", "accent-1", true, [
      ["them", "did you see the new build? the sidebar finally feels right", 92],
      ["me", "yes — the density is so much better", 88],
      ["them", "let's ship it before standup tomorrow", 12],
    ]),
    mk("dev-loop", "Dev Loop", "3 members", "accent-2", true, [
      ["them", "deploy is green ✅", 240],
      ["me", "nice. i'll take the migration next", 231],
      ["them", "pushed the fix for the flaky test", 45],
    ]),
    mk("theo", "Theo Bergman", "@theo", "accent-3", false, [
      ["me", "coffee thursday?", 1500],
      ["them", "always. 9am, usual place", 1440],
    ]),
    mk("lena", "Lena Reyes", "@lena", "accent-4", true, [
      ["them", "sending over the type specimens tonight", 300],
    ]),
  ];
}

const REPLIES = [
  "got it 👌",
  "makes sense — give me a few minutes",
  "haha okay, that's fair",
  "on it now",
  "can we pick this up later today?",
  "just pushed something, take a look",
  "agreed. let's do that",
];

let cache: Thread[] | null = null;
const listeners = new Set<() => void>();

function persist(threads: Thread[]) {
  cache = threads;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  }
  listeners.forEach((l) => l());
}

export function getThreads(): Thread[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Thread[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        cache = parsed;
        return cache;
      }
    } catch {
      /* fall through to seed */
    }
  }
  const fresh = seed();
  cache = fresh;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function sendMessage(threadId: string, text: string) {
  const threads = getThreads().map((t) =>
    t.id === threadId
      ? {
          ...t,
          messages: [
            ...t.messages,
            { id: uid(), threadId, author: "me" as const, text, at: Date.now() },
          ],
        }
      : t,
  );
  persist(threads);

  const delay = 900 + Math.random() * 1200;
  window.setTimeout(() => {
    const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)]!;
    persist(
      getThreads().map((t) =>
        t.id === threadId
          ? {
              ...t,
              messages: [
                ...t.messages,
                { id: uid(), threadId, author: "them" as const, text: reply, at: Date.now() },
              ],
            }
          : t,
      ),
    );
  }, delay);
}

export function lastMessage(thread: Thread) {
  return thread.messages[thread.messages.length - 1];
}

export function formatTime(at: number) {
  const d = new Date(at);
  const sameDay = new Date().toDateString() === d.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}