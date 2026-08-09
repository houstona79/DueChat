/** Small badges members can pin beside their own name. */
export const DECORATIONS = [
  { value: "diamond", label: "Diamond", glyph: "💎" },
  { value: "star", label: "Star", glyph: "⭐" },
  { value: "crown", label: "Crown", glyph: "👑" },
  { value: "heart", label: "Heart", glyph: "💜" },
  { value: "sparkles", label: "Sparkles", glyph: "✨" },
  { value: "fire", label: "Fire", glyph: "🔥" },
  { value: "rainbow", label: "Rainbow", glyph: "🏳️‍🌈" },
  { value: "rocket", label: "Rocket", glyph: "🚀" },
  { value: "shield", label: "Shield", glyph: "🛡️" },
  { value: "flower", label: "Flower", glyph: "🌸" },
  { value: "music", label: "Music", glyph: "🎵" },
  { value: "clover", label: "Clover", glyph: "🍀" },
] as const;

export type DecorationValue = (typeof DECORATIONS)[number]["value"];

export function decorationGlyph(value: string | null | undefined) {
  return DECORATIONS.find((d) => d.value === value)?.glyph ?? null;
}

export function decorationLabel(value: string | null | undefined) {
  return DECORATIONS.find((d) => d.value === value)?.label ?? null;
}
