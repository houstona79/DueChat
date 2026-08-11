import { useQuery } from "@tanstack/react-query";
import { Gift as GiftIcon } from "lucide-react";
import { fetchGiftShelf } from "@/lib/credits";

/** Gifts a member has been given, shown as an emoji shelf on their profile. */
export function GiftShelf({ userId }: { userId: string }) {
  const { data: gifts = [] } = useQuery({
    queryKey: ["gift-shelf", userId],
    queryFn: () => fetchGiftShelf(userId),
    enabled: !!userId,
  });

  if (gifts.length === 0) return null;
  const total = gifts.reduce((sum, g) => sum + g.total, 0);

  return (
    <section aria-label="Gifts received" className="rounded-2xl border border-border bg-secondary/40 p-3">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <GiftIcon className="size-3.5 text-primary" aria-hidden />
        Gifts received · {total}
      </h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {gifts.map((gift) => (
          <li
            key={gift.gift_key}
            title={`${gift.label} × ${gift.total}`}
            className="flex items-center gap-1 rounded-xl bg-background px-2 py-1 text-xs"
          >
            {gift.color_hex ? (
              <span
                title={gift.label}
                style={{ backgroundColor: gift.color_hex }}
                className="size-6 rounded-full border border-border"
                role="img"
                aria-label={gift.label}
              />
            ) : gift.image_url ? (
              <img
                src={gift.image_url}
                alt={gift.label}
                loading="lazy"
                width={512}
                height={512}
                className="size-7 object-contain"
              />
            ) : (
              <span className="text-lg leading-none" role="img" aria-label={gift.label}>
                {gift.emoji}
              </span>
            )}
            <span className="font-medium">×{gift.total}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
