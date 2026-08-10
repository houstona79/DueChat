import { useState } from "react";
import { Gift as GiftIcon, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCredits, useGiftItems } from "@/hooks/use-chat";
import { sendGift } from "@/lib/credits";
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
          <p className="mt-4 rounded-xl bg-primary/10 px-3 py-3 text-sm text-primary">
            {chosen?.emoji} Sent to {recipientName}!
          </p>
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
                    title={`${item.label} · ${item.cost} credits`}
                  >
                    <span className="text-2xl leading-none" aria-hidden>
                      {item.emoji}
                    </span>
                    <span className="truncate">{item.label}</span>
                    <span className="text-muted-foreground">{item.cost}</span>
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