import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Copy, ExternalLink, Mail } from "lucide-react";
import {
  getMyZohoMailbox,
  requestZohoMailbox,
  resetMyZohoPassword,
} from "@/lib/zoho-mail.functions";
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
          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          <span className="sr-only">Copy password</span>
        </button>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Shown once — change it as soon as you sign in.
      </p>
    </div>
  );
}

/**
 * Zoho Mail path for a real mailbox on the DueChat domain. Creates instantly
 * when the API credentials are set, otherwise files a request for staff to
 * create the account manually in Zoho.
 */
export function ZohoMailbox({ defaultHandle }: { defaultHandle?: string | null }) {
  const queryClient = useQueryClient();
  const [handle, setHandle] = useState((defaultHandle ?? "").toLowerCase());
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);

  const status = useQuery({ queryKey: ["my-zoho-mailbox"], queryFn: () => getMyZohoMailbox() });

  const claim = useMutation({
    mutationFn: () =>
      requestZohoMailbox({
        data: {
          handle,
          firstName: firstName || null,
          lastName: lastName || null,
          contactEmail: contact || null,
        },
      }),
    onSuccess: async (res) => {
      setNote(res.message);
      setPassword(res.password ?? null);
      if (res.ok) await queryClient.invalidateQueries({ queryKey: ["my-zoho-mailbox"] });
    },
    onError: () => setNote("Couldn't send that request right now."),
  });

  const reset = useMutation({
    mutationFn: () => resetMyZohoPassword(),
    onSuccess: (res) => {
      setNote(res.message);
      setPassword(res.password ?? null);
    },
    onError: () => setNote("Couldn't reset your password right now."),
  });

  const data = status.data;
  const mailbox = data?.mailbox ?? null;
  const valid = MAILBOX_HANDLE_RE.test(handle);
  const busy = claim.isPending || reset.isPending;

  // Hide the Zoho card when the Google path is the active provider.
  if (data && data.googleConfigured && !data.automatic && !mailbox) return null;
  if (data?.otherProviderMailbox) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
          <Mail className="size-4.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Zoho mailbox on {MAIL_DOMAIN}</h2>
          <p className="text-[11px] text-muted-foreground">
            A real inbox hosted in Zoho Mail — send and receive, not just forwarding.
          </p>
        </div>
      </div>

      {status.isLoading && <p className="mt-3 text-xs text-muted-foreground">Checking…</p>}

      {mailbox && (
        <div className="mt-3 space-y-2">
          <div className="rounded-xl bg-secondary px-3 py-2.5">
            <p className="text-sm font-semibold">{mailbox.address}</p>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {mailbox.status === "pending" ? (
                <>
                  <Clock className="size-3.5" aria-hidden /> Waiting for staff to create it in Zoho
                </>
              ) : mailbox.status === "active" ? (
                "Active"
              ) : (
                "Suspended — contact staff"
              )}
            </p>
          </div>
          {mailbox.status !== "pending" && (
            <div className="flex flex-wrap gap-2">
              <a
                href={data?.webmailUrl ?? "https://mail.zoho.com"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                Open Zoho webmail <ExternalLink className="size-3.5" aria-hidden />
              </a>
              {data?.automatic && (
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
              )}
            </div>
          )}
        </div>
      )}

      {data && !mailbox && (
        <div className="mt-3 space-y-2">
          <label htmlFor="zoho-handle" className="block text-[11px] font-medium text-muted-foreground">
            Choose your address
          </label>
          <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
            <input
              id="zoho-handle"
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
            value={contact}
            placeholder="Where staff can reach you (optional)"
            aria-label="Contact email"
            onChange={(e) => setContact(e.target.value)}
            className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            disabled={busy || !valid}
            onClick={() => {
              setPassword(null);
              setNote(null);
              claim.mutate();
            }}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {claim.isPending
              ? data.automatic
                ? "Creating…"
                : "Sending…"
              : data.automatic
                ? "Create my mailbox"
                : "Request my mailbox"}
          </button>
          <p className="text-[11px] text-muted-foreground">
            {data.automatic
              ? "3–24 letters or numbers. Created instantly at Zoho with a one-time password."
              : "3–24 letters or numbers. Staff create it in Zoho Mail by hand and send you the sign-in details."}
          </p>
        </div>
      )}

      {note ? <p className="mt-2 text-[11px] text-primary">{note}</p> : null}
      {password ? <OneTimePassword value={password} /> : null}
    </section>
  );
}
