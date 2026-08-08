import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { fetchMyInviteCode, fetchMyInvitedCount, inviteUrl } from "@/lib/invites";

/** Shows the member's permanent invite link with copy/share actions. */
export function InviteCard({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);
  const { data: code } = useQuery({
    queryKey: ["invite-code", userId],
    queryFn: fetchMyInviteCode,
  });
  const { data: joined = 0 } = useQuery({
    queryKey: ["invite-count", userId],
    queryFn: () => fetchMyInvitedCount(userId),
  });

  const url = code ? inviteUrl(code) : "";

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard blocked */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    if (!url) return;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "Join me on DueChat", url });
        return;
      } catch {
        /* dismissed */
      }
    }
    void copy();
  };

  return (
    <section aria-labelledby="invite-heading" className="rounded-2xl border border-border p-4">
      <h2 id="invite-heading" className="font-display text-sm font-semibold">
        Invite friends
      </h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Share your personal link. Anyone who joins with it becomes your buddy automatically.
      </p>
      <label htmlFor="invite-link" className="sr-only">
        Your invite link
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          id="invite-link"
          readOnly
          value={url}
          placeholder="Creating your link…"
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none"
        />
        <button
          type="button"
          onClick={() => void copy()}
          disabled={!url}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={() => void share()}
          disabled={!url}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Share2 className="size-4" aria-hidden />
          Share
        </button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground" aria-live="polite">
        {joined === 1 ? "1 person has joined from your link." : `${joined} people have joined from your link.`}
      </p>
    </section>
  );
}