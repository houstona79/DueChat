export type NowPlaying = { artist: string | null; title: string | null; raw: string | null };

const TIMEOUT = 6000;

function splitTitle(raw: string): NowPlaying {
  const clean = raw.replace(/\s+/g, " ").trim();
  if (!clean) return { artist: null, title: null, raw: null };
  const parts = clean.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    const artist = parts[0]!.trim();
    const title = parts.slice(1).join(" - ").trim();
    return { artist: artist || null, title: title || null, raw: clean };
  }
  return { artist: null, title: clean, raw: clean };
}

async function get(url: string, headers?: Record<string, string>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    return await fetch(url, {
      headers: headers ?? {},
      signal: controller.signal,
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Icecast: /status-json.xsl next to the mount point. */
async function fromIcecastJson(streamUrl: URL): Promise<string | null> {
  const mount = streamUrl.pathname;
  const candidates = [
    new URL("/status-json.xsl", streamUrl).toString(),
    new URL("./status-json.xsl", streamUrl).toString(),
  ];
  for (const candidate of candidates) {
    try {
      const res = await get(candidate);
      if (!res.ok) continue;
      const data = (await res.json()) as {
        icestats?: { source?: unknown };
      };
      const source = data.icestats?.source;
      const sources = Array.isArray(source) ? source : source ? [source] : [];
      const rows = sources as Array<{
        listenurl?: string;
        server_name?: string;
        title?: string;
        yp_currently_playing?: string;
        artist?: string;
      }>;
      const match = rows.find((r) => (r.listenurl ?? "").endsWith(mount)) ?? rows[0];
      if (!match) continue;
      const raw =
        match.yp_currently_playing ??
        (match.artist && match.title ? `${match.artist} - ${match.title}` : match.title);
      if (raw) return raw;
    } catch {
      // try next
    }
  }
  return null;
}

/** Shoutcast v1 (/7.html) and v2 (/currentsong, /stats?json=1). */
async function fromShoutcast(streamUrl: URL): Promise<string | null> {
  const endpoints = [
    new URL("/currentsong?sid=1", streamUrl).toString(),
    new URL("/7.html", streamUrl).toString(),
    new URL("/stats?sid=1&json=1", streamUrl).toString(),
  ];
  for (const endpoint of endpoints) {
    try {
      const res = await get(endpoint, { "User-Agent": "Mozilla/5.0" });
      if (!res.ok) continue;
      const text = (await res.text()).trim();
      if (!text) continue;
      if (endpoint.includes("json=1")) {
        const data = JSON.parse(text) as { songtitle?: string };
        if (data.songtitle) return data.songtitle;
        continue;
      }
      if (endpoint.endsWith("/7.html")) {
        const body = text.replace(/<[^>]*>/g, "");
        const fields = body.split(",");
        const song = fields.slice(6).join(",").trim();
        if (song) return song;
        continue;
      }
      if (!/[<>]/.test(text)) return text;
    } catch {
      // try next
    }
  }
  return null;
}

/** Last resort: read inline ICY metadata straight off the stream. */
async function fromIcyStream(streamUrl: URL): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(streamUrl.toString(), {
      headers: { "Icy-MetaData": "1", "User-Agent": "Mozilla/5.0" },
      signal: controller.signal,
    });
    const metaint = Number(res.headers.get("icy-metaint"));
    if (!res.body || !Number.isFinite(metaint) || metaint <= 0) {
      void res.body?.cancel();
      return null;
    }
    const reader = res.body.getReader();
    let seen = 0;
    let buffer = new Uint8Array(0);
    const limit = metaint + 4096;
    while (seen < limit) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const next = new Uint8Array(buffer.length + value.length);
      next.set(buffer);
      next.set(value, buffer.length);
      buffer = next;
      seen = buffer.length;
      if (buffer.length > metaint) {
        const length = buffer[metaint]! * 16;
        if (length === 0) return null;
        if (buffer.length >= metaint + 1 + length) {
          const chunk = buffer.slice(metaint + 1, metaint + 1 + length);
          void reader.cancel();
          const text = new TextDecoder().decode(chunk);
          const match = /StreamTitle='([^']*)'/.exec(text);
          return match?.[1] ?? null;
        }
      }
    }
    void reader.cancel();
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function readNowPlaying(url: string): Promise<NowPlaying> {
  let streamUrl: URL;
  try {
    streamUrl = new URL(url);
  } catch {
    return { artist: null, title: null, raw: null };
  }
  const raw =
    (await fromIcecastJson(streamUrl)) ??
    (await fromShoutcast(streamUrl)) ??
    (await fromIcyStream(streamUrl));
  return raw ? splitTitle(raw) : { artist: null, title: null, raw: null };
}
