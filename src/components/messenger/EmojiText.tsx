import { splitImageEmojis } from "@/lib/image-emojis";
import { cn } from "@/lib/utils";

/**
 * Renders message text with custom image emojis swapped in for their
 * `:shortcode:` tokens. Falls back to plain text when there are none.
 */
export function EmojiText({ body, large = false }: { body: string; large?: boolean }) {
  const parts = splitImageEmojis(body);

  return (
    <>
      {parts.map((part, i) =>
        part.type === "text" ? (
          <span key={i}>{part.value}</span>
        ) : (
          <img
            key={i}
            src={part.emoji.url}
            alt={part.emoji.label}
            title={`:${part.emoji.name}:`}
            loading="lazy"
            width={512}
            height={512}
            className={cn(
              "inline-block align-text-bottom object-contain",
              large ? "size-12" : "size-6",
            )}
          />
        ),
      )}
    </>
  );
}
