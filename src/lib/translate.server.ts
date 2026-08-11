import { LANGUAGES, DEFAULT_LANGUAGE } from "./languages";

const MODEL = "google/gemini-3.1-flash-lite";

export async function hashText(text: string) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function languageName(code: string) {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

export function isSupportedLanguage(code: string) {
  return LANGUAGES.some((l) => l.code === code);
}

/** Translate a batch of short strings with Lovable AI. Returns source -> translation. */
export async function translateWithAi(texts: string[], target: string) {
  if (texts.length === 0 || target === DEFAULT_LANGUAGE) return {};
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Translation is not configured");

  const payload = texts.map((text, index) => ({ id: index, text }));
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            `You are a translation engine for a chat app. Translate each item's text into ${languageName(target)} (${target}). ` +
            "Keep meaning, tone and slang natural. Preserve emoji, URLs, @mentions, punctuation, capitalisation style and any :: sentinel tokens exactly. " +
            "Never add commentary. If an item is already in the target language, repeat it unchanged. " +
            'Reply with JSON only: {"items":[{"id":number,"text":"translation"}]}.',
        },
        { role: "user", content: JSON.stringify({ items: payload }) },
      ],
    }),
  });

  if (res.status === 429) throw new Error("Translation is busy right now. Please try again shortly.");
  if (res.status === 402) throw new Error("Translation credits are exhausted.");
  if (!res.ok) throw new Error(`Translation failed (${res.status})`);

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: { items?: { id?: number; text?: string }[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Translation returned an unreadable response");
  }

  const out: Record<string, string> = {};
  for (const item of parsed.items ?? []) {
    if (typeof item?.id !== "number" || typeof item.text !== "string") continue;
    const source = texts[item.id];
    if (source) out[source] = item.text;
  }
  return out;
}