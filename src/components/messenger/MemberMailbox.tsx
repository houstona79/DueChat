import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Mail, ShieldAlert } from "lucide-react";
import {
  createMyMailbox,
  getMyMailbox,
  resetMyMailboxPassword,
} from "@/lib/workspace-mail.functions";
import { MAILBOX_HANDLE_RE } from "@/lib/workspace-mail-rules";
import { MAIL_DOMAIN } from "@/lib/chat";

function OneTimePassword({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 rounded-xl bg-secondary p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        One-time password
      </p>
      <div className="mt-1 flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all text-sm font-semibold">{value}</code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              setCopied(false);
            }
          }}
          className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold"
        >
          {copied ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          <span className="sr-only">Copy password</span>
        </button>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Shown once. You'll be asked to choose your own password when you sign in.
      </p>
    </div>
  );
}

/**
 * Self-serve real mailbox on the DueChat domain, hosted in Google Workspace.
 * Members claim an address instantly and can reset their own password.
 */
export function MemberMailbox({ defaultHandle }: { defaultHandle?: string | null }) {
  const queryClient = useQueryClient();
  const [handle, setHandle] = useState((defaultHandle ?? "").toLowerCase());
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [recovery, setRecovery] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);

  const status = useQuery({ queryKey: ["my-mailbox"], queryFn: () => getMyMailbox() });

  const create = useMutation({
    mutationFn: () =>
      createMyMailbox({
        data: {
          handle,
          firstName: firstName || null,
          lastName: lastName || null,
          recoveryEmail: recovery || null,
        },
      }),
    onSuccess: async (res) => {
      setNote(res.message);
      setPassword(res.password ?? null);
      if (res.created) await queryClient.invalidateQueries({ queryKey: ["my-mailbox"] });
    },
    onError: () => setNote("Couldn't create that mailbox right now."),
  });

  const reset = useMutation({
    mutationFn: () => resetMyMailboxPassword(),
    onSuccess: (res) => {
      setNote(res.message);
      setPassword(res.password ?? null);
    },
    onError: () => setNote("Couldn't reset your password right now."),
  });

  const data = status.data;
  const mailbox = data?.mailbox ?? null;
  const valid = MAILBOX_HANDLE_RE.test(handle);
  const busy = create.isPending || reset.isPending;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
          <Mail className="size-4.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Your {MAIL_DOMAIN} mailbox</h2>
          <p className="text-[11px] text-muted-foreground">
            A real inbox you can send and receive from — not just forwarding.
          </p>
        </div>
      </div>

      {status.isLoading && (
        <p className="mt-3 text-xs text-muted-foreground">Checking your mailbox…</p>
      )}

      {data && !data.configured && !mailbox && (
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Mailboxes aren't switched on yet — the site owner still has to connect the mail provider.
        </p>
      )}

      {mailbox && (
        <div className="mt-3 space-y-2">
          <div className="rounded-xl bg-secondary px-3 py-2.5">
            <p className="text-sm font-semibold">{mailbox.address}</p>
            <p className="text-[11px] text-muted-foreground">
              {mailbox.status === "active" && !data?.live?.suspended
                ? "Active"
                : "Suspended — contact staff"}
              {data?.live?.lastLoginTime && data.live.lastLoginTime !== "1970-01-01T00:00:00.000Z"
                ? ` · last sign-in ${new Date(data.live.lastLoginTime).toLocaleDateString()}`
                : " · never signed in"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={data?.webmailUrl ?? "https://mail.google.com"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Open webmail <ExternalLink className="size-3.5" aria-hidden />
            </a>
            <button
              type="button"
              disabled={busy || mailbox.status !== "active"}
              onClick={() => {
                setPassword(null);
                reset.mutate();
              }}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            >
              {reset.isPending ? "Resetting…" : "Reset my password"}
            </button>
          </div>
        </div>
      )}

      {data?.configured && !mailbox && (
        <div className="mt-3 space-y-2">
          <label
            htmlFor="mailbox-handle"
            className="block text-[11px] font-medium text-muted-foreground"
          >
            Choose your address
          </label>
          <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
            <input
              id="mailbox-handle"
              value={handle}
              maxLength={24}
              placeholder="yourname"
              autoComplete="off"
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <span className="shrink-0 text-sm text-muted-foreground">@{MAIL_DOMAIN}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={firstName}
              placeholder="First name"
              aria-label="First name"
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
            />
            <input
              value={lastName}
              placeholder="Last name"
              aria-label="Last name"
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <input
            type="email"
            value={recovery}
            placeholder="Recovery email (optional)"
            aria-label="Recovery email"
            onChange={(e) => setRecovery(e.target.value)}
            className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            disabled={busy || !valid}
            onClick={() => {
              setPassword(null);
              setNote(null);
              create.mutate();
            }}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {create.isPending ? "Creating…" : "Create my mailbox"}
          </button>
          <p className="text-[11px] text-muted-foreground">
            3–24 letters or numbers. Created instantly — you'll get a one-time password to sign in
            with.
          </p>
        </div>
      )}

      {note ? <p className="mt-2 text-[11px] text-primary">{note}</p> : null}
      {password ? <OneTimePassword value={password} /> : null}
    </section>
  );
}
