import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Shuffle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { uploadAvatar } from "@/lib/chat";

// Cartoon avatar parts are fixed art swatches, drawn only into the exported picture.
const SKIN = ["#FFE0C7", "#F5C6A0", "#E0A57A", "#C68656", "#8D5A3B", "#5C3A24"];
const HAIR_COLOR = ["#1F1A17", "#5A3A22", "#A8672F", "#E8C26A", "#D9502B", "#8E9AAF", "#6C4AB6", "#2E86DE"];
const BG = ["#7FB3FF", "#FFB36B", "#8BE3B3", "#F59BCB", "#C9A7FF", "#FFE27A", "#9AA5B1", "#222A3A"];
const SHIRT = ["#2E86DE", "#E74C3C", "#27AE60", "#8E44AD", "#F39C12", "#1F2937", "#FFFFFF"];
const HAIR = ["Short", "Spiky", "Long", "Curly", "Bun", "Bald"] as const;
const EYES = ["Happy", "Round", "Wink", "Sleepy", "Stars"] as const;
const MOUTH = ["Smile", "Grin", "Open", "Smirk", "Tongue"] as const;
const EXTRA = ["None", "Glasses", "Shades", "Cap", "Headphones", "Crown"] as const;

type Look = {
  skin: string; hairColor: string; bg: string; shirt: string;
  hair: (typeof HAIR)[number]; eyes: (typeof EYES)[number];
  mouth: (typeof MOUTH)[number]; extra: (typeof EXTRA)[number];
};

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)]!;
const randomLook = (): Look => ({
  skin: pick(SKIN), hairColor: pick(HAIR_COLOR), bg: pick(BG), shirt: pick(SHIRT),
  hair: pick(HAIR), eyes: pick(EYES), mouth: pick(MOUTH), extra: pick(EXTRA),
});

function hairSvg(l: Look) {
  const c = l.hairColor;
  switch (l.hair) {
    case "Short": return `<path d="M58 92 Q60 44 100 42 Q140 44 142 92 Q130 66 100 64 Q70 66 58 92Z" fill="${c}"/>`;
    case "Spiky": return `<path d="M58 90 L62 52 L76 62 L84 38 L98 56 L110 34 L118 58 L134 44 L136 64 L144 90 Q130 66 100 64 Q70 66 58 90Z" fill="${c}"/>`;
    case "Long": return `<path d="M54 150 Q46 60 100 42 Q154 60 146 150 L132 150 Q138 90 128 74 Q100 64 72 74 Q62 90 68 150Z" fill="${c}"/>`;
    case "Curly": return `<g fill="${c}">${[60,74,88,102,116,130,140].map((x,i)=>`<circle cx="${x}" cy="${i%2?52:60}" r="15"/>`).join("")}<circle cx="58" cy="80" r="11"/><circle cx="142" cy="80" r="11"/></g>`;
    case "Bun": return `<circle cx="100" cy="30" r="17" fill="${c}"/><path d="M58 92 Q60 44 100 42 Q140 44 142 92 Q130 66 100 64 Q70 66 58 92Z" fill="${c}"/>`;
    default: return "";
  }
}
function eyesSvg(l: Look) {
  const d = "#1F2937";
  switch (l.eyes) {
    case "Happy": return `<path d="M76 98 Q84 88 92 98 M108 98 Q116 88 124 98" stroke="${d}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case "Round": return `<circle cx="84" cy="96" r="7" fill="${d}"/><circle cx="116" cy="96" r="7" fill="${d}"/><circle cx="86" cy="94" r="2" fill="#fff"/><circle cx="118" cy="94" r="2" fill="#fff"/>`;
    case "Wink": return `<circle cx="84" cy="96" r="7" fill="${d}"/><path d="M108 97 Q116 91 124 97" stroke="${d}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case "Sleepy": return `<path d="M76 96 Q84 102 92 96 M108 96 Q116 102 124 96" stroke="${d}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    default: return `<path d="M84 86 L87 93 L94 94 L89 99 L90 106 L84 102 L78 106 L79 99 L74 94 L81 93Z M116 86 L119 93 L126 94 L121 99 L122 106 L116 102 L110 106 L111 99 L106 94 L113 93Z" fill="#F5B800"/>`;
  }
}
function mouthSvg(l: Look) {
  const d = "#7A2E2E";
  switch (l.mouth) {
    case "Smile": return `<path d="M86 120 Q100 132 114 120" stroke="${d}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case "Grin": return `<path d="M82 116 Q100 140 118 116Z" fill="${d}"/><path d="M86 118 L114 118 L112 122 L88 122Z" fill="#fff"/>`;
    case "Open": return `<ellipse cx="100" cy="124" rx="9" ry="11" fill="${d}"/>`;
    case "Smirk": return `<path d="M88 124 Q104 128 114 116" stroke="${d}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    default: return `<path d="M84 118 Q100 134 116 118Z" fill="${d}"/><ellipse cx="100" cy="130" rx="7" ry="8" fill="#F27C8A"/>`;
  }
}
function extraSvg(l: Look) {
  switch (l.extra) {
    case "Glasses": return `<g stroke="#1F2937" stroke-width="3" fill="none"><circle cx="84" cy="96" r="13"/><circle cx="116" cy="96" r="13"/><path d="M97 96 H103"/></g>`;
    case "Shades": return `<path d="M68 88 H132 V96 Q130 110 114 108 Q104 106 102 96 H98 Q96 106 86 108 Q70 110 68 96Z" fill="#111"/>`;
    case "Cap": return `<path d="M56 78 Q60 36 100 36 Q140 36 144 78Z" fill="#E74C3C"/><path d="M100 72 H166 Q160 82 140 82 H100Z" fill="#C0392B"/>`;
    case "Headphones": return `<path d="M58 100 Q56 40 100 40 Q144 40 142 100" stroke="#1F2937" stroke-width="7" fill="none"/><rect x="48" y="92" width="16" height="26" rx="7" fill="#E74C3C"/><rect x="136" y="92" width="16" height="26" rx="7" fill="#E74C3C"/>`;
    case "Crown": return `<path d="M70 50 L78 22 L92 40 L100 16 L108 40 L122 22 L130 50Z" fill="#F5B800" stroke="#C99400" stroke-width="2"/>`;
    default: return "";
  }
}

export function avatarSvg(l: Look) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="400" height="400">
<rect width="200" height="200" fill="${l.bg}"/>
<path d="M36 200 Q40 150 100 150 Q160 150 164 200Z" fill="${l.shirt}"/>
<rect x="88" y="130" width="24" height="24" fill="${l.skin}"/>
${l.hair === "Long" ? hairSvg(l) : ""}
<ellipse cx="58" cy="100" rx="8" ry="12" fill="${l.skin}"/><ellipse cx="142" cy="100" rx="8" ry="12" fill="${l.skin}"/>
<ellipse cx="100" cy="96" rx="42" ry="48" fill="${l.skin}"/>
<circle cx="74" cy="114" r="7" fill="#F28B8B" opacity="0.45"/><circle cx="126" cy="114" r="7" fill="#F28B8B" opacity="0.45"/>
${l.hair !== "Long" ? hairSvg(l) : `<path d="M60 88 Q64 48 100 46 Q136 48 140 88 Q124 66 100 64 Q76 66 60 88Z" fill="${l.hairColor}"/>`}
${eyesSvg(l)}${mouthSvg(l)}${extraSvg(l)}
</svg>`;
}

async function svgToPng(svg: string): Promise<Blob> {
  // Data URLs render reliably on iPhone/Safari where blob SVGs can fail.
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  try {
    const img = new Image();
    img.width = img.height = 400;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 400;
    canvas.getContext("2d")!.drawImage(img, 0, 0, 400, 400);
    return await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Export failed"))), "image/png"));
  } catch {
    // Fall back to saving the drawing itself.
    return new Blob([svg], { type: "image/svg+xml" });
  }
}

function Swatches({ label, colors, value, onChange }: { label: string; colors: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((c) => (
          <button key={c} type="button" aria-label={`${label} ${c}`} onClick={() => onChange(c)}
            className={`size-6 rounded-full border-2 ${value === c ? "border-primary" : "border-border"}`}
            style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}
function Choices<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button key={o} type="button" onClick={() => onChange(o)}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${value === o ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AvatarBuilder({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [look, setLook] = useState<Look>(randomLook);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const set = <K extends keyof Look>(k: K) => (v: Look[K]) => setLook((l) => ({ ...l, [k]: v }));
  const svg = avatarSvg(look);

  async function wear() {
    setSaving(true);
    try {
      const blob = await svgToPng(svg);
      await uploadAvatar(userId, new File([blob], "cartoon.png", { type: "image/png" }));
      await qc.invalidateQueries();
      toast.success("You're now wearing your cartoon avatar!");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save your avatar.");
    } finally {
      setSaving(false);
    }
  }

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-secondary">
        <Sparkles className="size-4 text-primary" /> Build my cartoon avatar
      </button>
    );

  return (
    <section className="mb-4 rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">Avatar builder</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:underline">Close</button>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-col items-center gap-2">
          <div className="size-40 overflow-hidden rounded-full border-4 border-border" dangerouslySetInnerHTML={{ __html: svg.replace('width="400" height="400"', 'width="100%" height="100%"') }} />
          <button type="button" onClick={() => setLook(randomLook())} className="flex items-center gap-1 text-xs hover:underline">
            <Shuffle className="size-3" /> Surprise me
          </button>
        </div>
        <div className="grid flex-1 gap-3">
          <Choices label="Hair" options={HAIR} value={look.hair} onChange={set("hair")} />
          <Swatches label="Hair color" colors={HAIR_COLOR} value={look.hairColor} onChange={set("hairColor")} />
          <Swatches label="Skin" colors={SKIN} value={look.skin} onChange={set("skin")} />
          <Choices label="Eyes" options={EYES} value={look.eyes} onChange={set("eyes")} />
          <Choices label="Mouth" options={MOUTH} value={look.mouth} onChange={set("mouth")} />
          <Choices label="Extras" options={EXTRA} value={look.extra} onChange={set("extra")} />
          <Swatches label="Shirt" colors={SHIRT} value={look.shirt} onChange={set("shirt")} />
          <Swatches label="Background" colors={BG} value={look.bg} onChange={set("bg")} />
        </div>
      </div>
      <button type="button" disabled={saving} onClick={() => void wear()}
        className="mt-4 w-full rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">
        {saving ? "Saving…" : "Wear this avatar"}
      </button>
    </section>
  );
}
