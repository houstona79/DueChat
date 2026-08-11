import { useState } from "react";
import { Gift as GiftIcon, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCredits, useGiftItems } from "@/hooks/use-chat";
import { giftNoticeBody, sendGift } from "@/lib/credits";
import { sendMessage } from "@/lib/chat";
import { cn } from "@/lib/utils";

/** Pick a gift and spend credits on it. */
export function GiftDialog({
  meId,
  recipientId,
  recipientName,
  roomId,
  onClose,
}: {
  meId: string;
  recipientId: string;
  recipientName: string;
  roomId?: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: items = [] } = useGiftItems();
  const { data: balance = 0 } = useCredits(meId);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const chosen = items.find((i) => i.key === selected) ?? null;

  const send = async () => {
    if (!chosen || busy) return;
    setBusy(true);
    setError(null);
    try {
      const remaining = await sendGift(recipientId, chosen.key, roomId ?? null, note);
      queryClient.setQueryData(["credits", meId], remaining);
      if (roomId) {
        try {
          await sendMessage(
            roomId,
            meId,
            giftNoticeBody(chosen.emoji, chosen.label, recipientName),
          );
        } catch {
          /* the gift still landed even if the room notice failed */
        }
      }
      void queryClient.invalidateQueries({ queryKey: ["gift-shelf", recipientId] });
      setSent(true);
      window.setTimeout(onClose, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that gift.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Send a gift to ${recipientName}`}
    >
      <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-sidebar p-4 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <GiftIcon className="size-4 text-primary" aria-hidden />
              Send a gift
            </h3>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              To {recipientName} · {balance} credits left
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close gift picker"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
          >
            <X className="size-4" />
          </button>
        </div>

        {sent ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-3 text-sm text-primary">
            {chosen?.image_url ? (
              <img
                src={chosen.image_url}
                alt={chosen.label}
                loading="lazy"
                width={512}
                height={512}
                className="size-10 object-contain"
              />
            ) : (
              <span aria-hidden>{chosen?.emoji}</span>
            )}
            <span>Sent to {recipientName}!</span>
          </div>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {items.map((item) => {
                const affordable = item.cost <= balance;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelected(item.key)}
                    aria-pressed={selected === item.key}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[11px]",
                      selected === item.key ? "bg-primary/15 text-primary" : "bg-secondary",
                      !affordable && "opacity-40",
                    )}
                    title={
                      `${item.label} · ${item.cost} credits` +
                      (item.credit_payout ? ` · gives ${item.credit_payout} points` : "") +
                      (item.color_hex ? " · name color for 30 days" : "")
                    }
                  >
                    {item.color_hex ? (
                      <span
                        aria-hidden
                        style={{ backgroundColor: item.color_hex }}
                        className="size-9 rounded-full border border-border"
                      />
                    ) : item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.label}
                        loading="lazy"
                        width={512}
                        height={512}
                        className="size-9 object-contain"
                      />
                    ) : (
                      <span className="text-2xl leading-none" aria-hidden>
                        {item.emoji}
                      </span>
                    )}
                    <span className="truncate">{item.label}</span>
                    <span className="text-muted-foreground">{item.cost}</span>
                    {item.credit_payout ? (
                      <span className="text-[10px] font-medium text-primary">
                        +{item.credit_payout} pts
                      </span>
                    ) : null}
                    {item.color_hex ? (
                      <span className="text-[10px] font-medium text-primary">30 days</span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <label className="mt-3 block text-[11px] font-medium text-muted-foreground" htmlFor="gift-note">
              Note (optional)
            </label>
            <input
              id="gift-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={120}
              placeholder="Thanks for the help!"
              className="mt-1 w-full rounded-xl bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />

            {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

            <button
              type="button"
              onClick={() => void send()}
              disabled={!chosen || busy || (chosen ? chosen.cost > balance : true)}
              className="mt-3 w-full rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {busy
                ? "Sending…"
                : chosen
                  ? `Send ${chosen.label} · ${chosen.cost} credits`
                  : "Pick a gift"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}