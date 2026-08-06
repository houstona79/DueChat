import { useEffect, useState } from "react";
import { ImagePlay, Loader2, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchGifs } from "@/lib/gifs.functions";

export function GifPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const fetchGifs = useServerFn(searchGifs);

  useEffect(() => {
    const id = window.setTimeout(() => setQuery(term.trim()), 350);
    return () => window.clearTimeout(id);
  }, [term]);

  const { data: gifs = [], isFetching, isError } = useQuery({
    queryKey: ["gifs", query],
    queryFn: () => fetchGifs({ data: { query } }),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Insert GIF"
          className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
        >
          <ImagePlay className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        className="w-[min(22rem,calc(100vw-2rem))] p-3"
      >
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-secondary px-2.5 py-1.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search GIFs"
            aria-label="Search GIFs"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {isFetching ? <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" /> : null}
        </div>
        {isError ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            GIFs are unavailable right now.
          </p>
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
                className="h-24 w-full object-cover"
              />
            </button>
          ))}
        </div>
        {!isFetching && !isError && gifs.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No GIFs found.</p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
