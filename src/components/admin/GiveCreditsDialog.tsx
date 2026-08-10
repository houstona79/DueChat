import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { grantCredits } from "@/lib/credits";

const PRESETS = [25, 50, 100, 250];

/** Admin-only dialog for topping up a member's gift credits. */
export function GiveCreditsDialog({
  member,
  onClose,
}: {
  member: { id: string; name: string; username: string } | null;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("50");
  const [note, setNote] = useState("");

  const give = useMutation({
    mutationFn: () => grantCredits(member!.id, Number(amount), note),
    onSuccess: (balance) => {
      toast.success(`${member?.name} now has ${balance} credits.`);
      setNote("");
      onClose();
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Could not give those credits."),
  });

  const value = Number(amount);
  const valid = Number.isInteger(value) && value >= 1 && value <= 100000;

  return (
    <Dialog open={!!member} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Give credits</DialogTitle>
          <DialogDescription>
            Add gift credits to {member?.name} (@{member?.username}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(String(p))}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                  Number(amount) === p
                    ? "bg-primary/15 text-primary"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                +{p}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="credit-amount" className="mb-1 block text-xs text-muted-foreground">
              Amount
            </label>
            <input
              id="credit-amount"
              type="number"
              min={1}
              max={100000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-base outline-none focus:border-primary sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="credit-note" className="mb-1 block text-xs text-muted-foreground">
              Note (optional)
            </label>
            <input
              id="credit-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why are you adding these credits?"
              className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-base outline-none focus:border-primary sm:text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-muted-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid || give.isPending}
            onClick={() => give.mutate()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {give.isPending ? "Adding…" : `Give ${valid ? value : 0} credits`}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}