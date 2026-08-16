type VideoKind =
  | { kind: "file"; src: string }
  | { kind: "embed"; src: string; title: string; portrait?: boolean; link?: string };

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

  // TikTok — /@user/video/ID, /v/ID, /embed/ID (vm.tiktok.com short links can't be resolved client-side)
  if (host === "tiktok.com" || host === "m.tiktok.com") {
    const m =
      url.pathname.match(/\/video\/(\d+)/) ??
      url.pathname.match(/^\/v\/(\d+)/) ??
      url.pathname.match(/^\/embed\/(?:v2\/)?(\d+)/);
    if (m?.[1]) {
      return {
        kind: "embed",
        src: `https://www.tiktok.com/embed/v2/${m[1]}`,
        title: "TikTok video",
        portrait: true,
      };
    }
  }

  // Snapchat Spotlight
  // Facebook / Watch — the official plugin resolves any fb video permalink,
  // including fb.watch short links.
  if (
    host === "facebook.com" ||
    host === "m.facebook.com" ||
    host === "mbasic.facebook.com" ||
    host === "web.facebook.com" ||
    host === "fb.watch" ||
    host === "fb.gg" ||
    host === "fb.com"
  ) {
    // Modern share links: /share/v/<id>/ (video) and /share/r/<id>/ (reel)
    const share = url.pathname.match(/^\/share\/([a-z])\//i);
    const isVideo =
      host === "fb.watch" ||
      !!share ||
      /\/(videos|reel|watch|video\.php|story\.php)/i.test(url.pathname) ||
      url.pathname.startsWith("/watch") ||
      url.searchParams.has("v");
    if (isVideo) {
      const portrait = /\/reel/i.test(url.pathname) || share?.[1]?.toLowerCase() === "r";
      const params = new URLSearchParams({
        href: trimmed,
        show_text: "false",
        width: portrait ? "320" : "560",
      });
      return {
        kind: "embed",
        src: `https://www.facebook.com/plugins/video.php?${params.toString()}`,
        title: "Facebook video",
        portrait,
        link: trimmed,
      };
    }
  }

  // Snapchat Spotlight
  if (host === "snapchat.com" || host === "story.snapchat.com") {
    const m =
      url.pathname.match(/^\/spotlight\/([\w-]+)/) ??
      url.pathname.match(/^\/embed\/([\w-]+)/) ??
      url.pathname.match(/^\/p\/[\w-]+\/([\w-]+)/);
    if (m?.[1]) {
      return {
        kind: "embed",
        src: `https://www.snapchat.com/embed/${m[1]}`,
        title: "Snapchat video",
        portrait: true,
      };
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
          className={video.portrait ? "aspect-[9/16] w-full border-0" : "aspect-video w-full border-0"}
        />
      )}
      {video.kind === "embed" && video.link ? (
        <a
          href={video.link}
          target="_blank"
          rel="noreferrer noopener"
          className="block px-3 py-1.5 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Open on Facebook
        </a>
      ) : null}
    </div>
  );
}
