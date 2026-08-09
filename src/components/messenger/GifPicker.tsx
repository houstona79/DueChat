import { useEffect, useState } from "react";
import { ImagePlay, Loader2, Search, Sticker } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchGifs } from "@/lib/gifs.functions";

type Media = "gifs" | "stickers";

const COPY: Record<
  Media,
  { label: string; placeholder: string; empty: string; unavailable: string }
> = {
  gifs: {
    label: "Insert GIF",
    placeholder: "Search GIFs",
    empty: "No GIFs found.",
    unavailable: "GIFs are unavailable right now.",
  },
  stickers: {
    label: "Insert sticker",
    placeholder: "Search stickers",
    empty: "No stickers found.",
    unavailable: "Stickers are unavailable right now.",
  },
};

export function GifPicker({
  onSelect,
  media = "gifs",
}: {
  onSelect: (url: string) => void;
  media?: Media;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const fetchGifs = useServerFn(searchGifs);
  const copy = COPY[media];

  useEffect(() => {
    const id = window.setTimeout(() => setQuery(term.trim()), 350);
    return () => window.clearTimeout(id);
  }, [term]);

  const {
    data: gifs = [],
    isFetching,
    isError,
  } = useQuery({
    queryKey: [media, query],
    queryFn: () => fetchGifs({ data: { query, media } }),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={copy.label}
          className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
        >
          {media === "stickers" ? <Sticker className="size-5" /> : <ImagePlay className="size-5" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-[min(22rem,calc(100vw-2rem))] p-3">
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-secondary px-2.5 py-1.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={copy.placeholder}
            aria-label={copy.placeholder}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {isFetching ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : null}
        </div>
        {isError ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{copy.unavailable}</p>
        ) : null}
        <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">
          {gifs.map((gif) => (
            <button
              key={gif.id}
              type="button"
              onClick={() => {
                onSelect(gif.url);
                setOpen(false);
              }}
              className="overflow-hidden rounded-lg bg-secondary transition-opacity hover:opacity-80"
            >
              <img
                src={gif.url}
                alt={gif.title}
                loading="lazy"
                className={
                  media === "stickers"
                    ? "h-24 w-full object-contain p-1"
                    : "h-24 w-full object-cover"
                }
              />
            </button>
          ))}
        </div>
        {!isFetching && !isError && gifs.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{copy.empty}</p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
