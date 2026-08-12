import angry from "@/assets/emojis/angry.png.asset.json";
import clap from "@/assets/emojis/clap.png.asset.json";
import cool from "@/assets/emojis/cool.png.asset.json";
import fire from "@/assets/emojis/fire.png.asset.json";
import heart from "@/assets/emojis/heart.png.asset.json";
import kiss from "@/assets/emojis/kiss.png.asset.json";
import lol from "@/assets/emojis/lol.png.asset.json";
import party from "@/assets/emojis/party.png.asset.json";
import sad from "@/assets/emojis/sad.png.asset.json";
import sleepy from "@/assets/emojis/sleepy.png.asset.json";
import thumbsup from "@/assets/emojis/thumbsup.png.asset.json";
import wow from "@/assets/emojis/wow.png.asset.json";

export type ImageEmoji = { name: string; label: string; url: string };

/**
 * Custom picture emojis. They travel inside message text as `:name:` shortcodes
 * so they can be mixed with words and regular unicode emojis.
 */
export const IMAGE_EMOJIS: ImageEmoji[] = [
  { name: "cool", label: "Cool", url: cool.url },
  { name: "lol", label: "Laughing", url: lol.url },
  { name: "kiss", label: "Kiss", url: kiss.url },
  { name: "wow", label: "Wow", url: wow.url },
  { name: "sad", label: "Sad", url: sad.url },
  { name: "angry", label: "Angry", url: angry.url },
  { name: "sleepy", label: "Sleepy", url: sleepy.url },
  { name: "party", label: "Party", url: party.url },
  { name: "heart2", label: "Heart", url: heart.url },
  { name: "fire2", label: "Fire", url: fire.url },
  { name: "thumbsup2", label: "Thumbs up", url: thumbsup.url },
  { name: "clap2", label: "Clap", url: clap.url },
];

const BY_NAME = new Map(IMAGE_EMOJIS.map((e) => [e.name, e]));

/** Shortcode inserted into the composer, e.g. `:cool:`. */
export const shortcodeOf = (emoji: ImageEmoji) => `:${emoji.name}:`;

const TOKEN = /:([a-z0-9_]{2,20}):/gi;

export type EmojiPart = { type: "text"; value: string } | { type: "emoji"; emoji: ImageEmoji };

/** Split message text into plain text runs and known image-emoji tokens. */
export function splitImageEmojis(body: string): EmojiPart[] {
  const parts: EmojiPart[] = [];
  let last = 0;
  for (const match of body.matchAll(TOKEN)) {
    const emoji = BY_NAME.get(match[1].toLowerCase());
    if (!emoji) continue;
    const start = match.index ?? 0;
    if (start > last) parts.push({ type: "text", value: body.slice(last, start) });
    parts.push({ type: "emoji", emoji });
    last = start + match[0].length;
  }
  if (last < body.length) parts.push({ type: "text", value: body.slice(last) });
  return parts;
}

export function hasImageEmoji(body: string) {
  return splitImageEmojis(body).some((p) => p.type === "emoji");
}

/** True when the message is nothing but image emojis (rendered larger). */
export function isImageEmojiOnly(body: string) {
  const parts = splitImageEmojis(body.trim());
  return (
    parts.length > 0 &&
    parts.every((p) => (p.type === "emoji" ? true : p.value.trim() === "")) &&
    parts.some((p) => p.type === "emoji")
  );
}
