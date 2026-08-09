type VideoKind = { kind: "file"; src: string } | { kind: "embed"; src: string; title: string };

export function videoEmbedOf(body: string): VideoKind | null {
  const trimmed = body.trim();
  if (!/^https:\/\/\S+$/i.test(trimmed) || /\s/.test(trimmed)) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (/\.(mp4|webm|ogg|ogv|mov|m4v)$/i.test(url.pathname)) {
    return { kind: "file", src: trimmed };
  }

  // YouTube
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    if (id) return ytEmbed(id, url);
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    if (v) return ytEmbed(v, url);
    const m = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
    if (m?.[1]) return ytEmbed(m[1], url);
  }

  // Vimeo
  if (host === "vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (id && /^\d+$/.test(id)) {
      return { kind: "embed", src: `https://player.vimeo.com/video/${id}`, title: "Vimeo video" };
    }
  }

  return null;
}

function ytEmbed(rawId: string, url: URL): VideoKind | null {
  const id = rawId.replace(/[^\w-]/g, "");
  if (!id) return null;
  const t = url.searchParams.get("t") ?? url.searchParams.get("start");
  const start = t ? String(parseInt(t, 10) || 0) : "";
  const q = start ? `?start=${start}` : "";
  return {
    kind: "embed",
    src: `https://www.youtube-nocookie.com/embed/${id}${q}`,
    title: "YouTube video",
  };
}

export function MessageVideo({ video }: { video: VideoKind }) {
  return (
    <div className="w-[78%] max-w-sm overflow-hidden rounded-2xl border border-border bg-card">
      {video.kind === "file" ? (
        <video
          src={video.src}
          controls
          preload="metadata"
          playsInline
          className="aspect-video w-full bg-black object-contain"
        />
      ) : (
        <iframe
          src={video.src}
          title={video.title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="aspect-video w-full border-0"
        />
      )}
    </div>
  );
}
