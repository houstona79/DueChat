import { useState } from "react";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IMAGE_EMOJIS, shortcodeOf } from "@/lib/image-emojis";

const GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "🤣",
      "😂",
      "🙂",
      "🙃",
      "😉",
      "😊",
      "😇",
      "🥰",
      "😍",
      "😘",
      "😗",
      "😚",
      "😙",
      "🥲",
      "😋",
      "😛",
      "😜",
      "🤪",
      "😝",
      "🤗",
      "🤭",
      "🤫",
      "🤔",
      "🤐",
      "😐",
      "😑",
      "😶",
      "😏",
      "😒",
      "🙄",
      "😬",
      "😮‍💨",
      "🤥",
      "😴",
      "🤤",
      "😪",
      "😵",
      "🤠",
      "🥳",
      "😎",
      "🤓",
      "🧐",
    ],
  },
  {
    label: "Feelings",
    emojis: [
      "😕",
      "😟",
      "🙁",
      "☹️",
      "😮",
      "😯",
      "😲",
      "😳",
      "🥺",
      "😢",
      "😭",
      "😤",
      "😠",
      "😡",
      "🤬",
      "🤯",
      "😱",
      "😨",
      "😰",
      "😥",
      "🤗",
      "🤫",
      "😷",
      "🤒",
      "🤕",
      "🤢",
      "🤮",
      "🥵",
      "🥶",
      "😇",
      "🤡",
      "👻",
      "💀",
      "☠️",
      "👽",
      "🤖",
      "🎃",
    ],
  },
  {
    label: "Gestures",
    emojis: [
      "👍",
      "👎",
      "👌",
      "🤌",
      "✌️",
      "🤞",
      "🤟",
      "🤘",
      "🤙",
      "👈",
      "👉",
      "👆",
      "👇",
      "☝️",
      "👋",
      "🤚",
      "🖐️",
      "✋",
      "🖖",
      "🙏",
      "🤝",
      "💪",
      "🫶",
      "👏",
      "🙌",
      "🫡",
      "🤲",
      "✍️",
      "💅",
    ],
  },
  {
    label: "Hearts",
    emojis: [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "🤎",
      "💔",
      "❣️",
      "💕",
      "💞",
      "💓",
      "💗",
      "💖",
      "💘",
      "💝",
      "✨",
      "⭐",
      "🌟",
      "💫",
      "🔥",
      "💥",
      "💯",
      "🎉",
      "🎊",
      "🎈",
      "🎁",
    ],
  },
  {
    label: "Things",
    emojis: [
      "☕",
      "🍕",
      "🍔",
      "🍟",
      "🌮",
      "🍣",
      "🍩",
      "🍪",
      "🎂",
      "🍰",
      "🍺",
      "🍻",
      "🥂",
      "🍷",
      "🍎",
      "🍌",
      "🍉",
      "🍇",
      "🥑",
      "🌈",
      "☀️",
      "🌙",
      "⚡",
      "❄️",
      "🌊",
      "⚽",
      "🏀",
      "🎮",
      "🎧",
      "🎵",
      "📷",
      "💻",
      "📱",
      "🚀",
      "✈️",
      "🚗",
      "🏠",
      "💡",
      "📌",
      "✅",
      "❌",
      "❓",
      "❗",
    ],
  },
];

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Insert emoji"
          className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
        >
          <Smile className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        className="max-h-72 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto p-3"
      >
        <div className="mb-3">
          <p className="mb-1 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Picture emojis
          </p>
          <div className="grid grid-cols-6 gap-1">
            {IMAGE_EMOJIS.map((emoji) => (
              <button
                key={emoji.name}
                type="button"
                onClick={() => onSelect(shortcodeOf(emoji))}
                aria-label={emoji.label}
                title={emoji.label}
                className="grid size-10 place-items-center rounded-lg transition-colors hover:bg-secondary"
              >
                <img
                  src={emoji.url}
                  alt={emoji.label}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="size-8 object-contain"
                />
              </button>
            ))}
          </div>
        </div>
        {GROUPS.map((group) => (
          <div key={group.label} className="mb-3 last:mb-0">
            <p className="mb-1 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            <div className="grid grid-cols-8 gap-1">
              {group.emojis.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  aria-label={emoji}
                  className="grid size-8 place-items-center rounded-lg text-lg leading-none transition-colors hover:bg-secondary"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
