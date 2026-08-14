import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Inbox, Mail, PenLine, Send, Trash2, X } from "lucide-react";
import { useAuth, useMyProfile } from "@/hooks/use-auth";
import { MAIL_DOMAIN, formatTime } from "@/lib/chat";
import {
  deleteMail,
  fetchInbox,
  fetchMailPeople,
  fetchSent,
  mailAddress,
  markMailRead,
  sendMail,
  type MailMessage,
  type MailPerson,
} from "@/lib/mailbox";

export const Route = createFileRoute("/_authenticated/mail")({
  head: () => ({
    meta: [
      { title: "Mailbox — DueChat" },
      {
        name: "description",
        content: `Read and send DueChat mail to any member at their @${MAIL_DOMAIN} address, right inside the messenger.`,
      },
      { property: "og:title", content: "Mailbox — DueChat" },
      {
        property: "og:description",
        content: `Read and send DueChat mail to any member at their @${MAIL_DOMAIN} address, right inside the messenger.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MailPage,
});

function personLabel(person: MailPerson | undefined, fallback: string) {
  if (!person) return fallback;
  return person.display_name || person.username || fallback;
}

function Compose({
  onClose,
  onSent,
  replyTo,
}: {
  onClose: () => void;
  onSent: () => void;
  replyTo?: { to: string; subject: string } | null;
}) {
  const [to, setTo] = useState(replyTo?.to ?? "");
  const [subject, setSubject] = useState(replyTo?.subject ?? "");
  const [body, setBody] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: () => sendMail({ to, subject, body }),
    onSuccess: (person) => {
      setNote(`Sent to ${personLabel(person, to)}.`);
      setBody("");
      onSent();
      setTimeout(onClose, 700);
    },
    onError: (err: unknown) =>
      setNote(err instanceof Error ? err.message : "Couldn't send that message."),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <PenLine className="size-4 text-primary" aria-hidden /> New message
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close composer"
          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="mt-3 space-y-2">
        <input
          value={to}
          placeholder={`member or member@${MAIL_DOMAIN}`}
          aria-label="Recipient"
          autoComplete="off"
          onChange={(e) => setTo(e.target.value)}
          className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <input
          value={subject}
          placeholder="Subject"
          aria-label="Subject"
          maxLength={140}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <textarea
          value={body}
          placeholder="Write your message…"
          aria-label="Message"
          rows={6}
          onChange={(e) => setBody(e.target.value)}
          className="w-full resize-y rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          disabled={send.isPending || !to.trim() || !body.trim()}
          onClick={() => {
            setNote(null);
            send.mutate();
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Send className="size-3.5" aria-hidden />
          {send.isPending ? "Sending…" : "Send"}
        </button>
        {note ? <p className="text-[11px] text-primary">{note}</p> : null}
      </div>
    </div>
  );
}

function MailPage() {
  const { user } = useAuth();
  const { data: me } = useMyProfile(user?.id);
  const queryClient = useQueryClient();
  const [folder, setFolder] = useState<"inbox" | "sent">("inbox");
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [reply, setReply] = useState<{ to: string; subject: string } | null>(null);

  const inbox = useQuery({
    queryKey: ["mail", "inbox", user?.id],
    queryFn: () => fetchInbox(user!.id),
    enabled: !!user?.id,
  });
  const sent = useQuery({
    queryKey: ["mail", "sent", user?.id],
    queryFn: () => fetchSent(user!.id),
    enabled: !!user?.id,
  });

  const list: MailMessage[] = (folder === "inbox" ? inbox.data : sent.data) ?? [];
  const ids = useMemo(
    () => list.flatMap((m) => [m.sender_id, m.recipient_id]),
    [list],
  );
  const people = useQuery({
    queryKey: ["mail", "people", ids.join(",")],
    queryFn: () => fetchMailPeople(ids),
    enabled: ids.length > 0,
  });

  const unread = (inbox.data ?? []).filter((m) => !m.read_at).length;
  const myAddress = mailAddress(me ?? null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["mail"] });
  };

  const remove = useMutation({
    mutationFn: (id: string) => deleteMail(id, folder),
    onSuccess: () => {
      setOpenId(null);
      refresh();
    },
  });

  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-3">
        <Link
          to="/chat"
          aria-label="Back to messenger"
          className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 truncate text-lg font-semibold">
            <Mail className="size-4 text-primary" aria-hidden /> Mailbox
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {myAddress ? myAddress : `Pick a handle in settings to get your @${MAIL_DOMAIN} address.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setReply(null);
            setComposing(true);
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          <PenLine className="size-3.5" aria-hidden /> Write
        </button>
      </header>

      <div className="mt-4 flex gap-2">
        {(["inbox", "sent"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFolder(f);
              setOpenId(null);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              folder === f
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            {f === "inbox" ? <Inbox className="size-3.5" aria-hidden /> : <Send className="size-3.5" aria-hidden />}
            {f === "inbox" ? "Inbox" : "Sent"}
            {f === "inbox" && unread > 0 ? (
              <span className="rounded-full bg-background/25 px-1.5 text-[10px]">{unread}</span>
            ) : null}
          </button>
        ))}
      </div>

      {composing ? (
        <div className="mt-4">
          <Compose onClose={() => setComposing(false)} onSent={refresh} replyTo={reply} />
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {(inbox.isLoading || sent.isLoading) && (
          <p className="text-xs text-muted-foreground">Loading your mail…</p>
        )}
        {!list.length && !inbox.isLoading && !sent.isLoading ? (
          <p className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
            {folder === "inbox"
              ? "No mail yet. Members can write to you at your address above."
              : "You haven't sent any mail yet."}
          </p>
        ) : null}

        {list.map((m) => {
          const otherId = folder === "inbox" ? m.sender_id : m.recipient_id;
          const person = people.data?.[otherId];
          const label = personLabel(person, "Member");
          const address = mailAddress(person ?? null);
          const open = openId === m.id;
          const unreadRow = folder === "inbox" && !m.read_at;
          return (
            <article
              key={m.id}
              className={`rounded-2xl border bg-card p-3.5 ${
                unreadRow ? "border-primary/50" : "border-border"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setOpenId(open ? null : m.id);
                  if (!open && unreadRow) markMailRead(m.id).then(refresh).catch(() => {});
                }}
                className="flex w-full items-start gap-2 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {unreadRow ? <span className="mr-1.5 text-primary">●</span> : null}
                    {m.subject || "(no subject)"}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {folder === "inbox" ? "From" : "To"} {label}
                    {address ? ` · ${address}` : ""} · {formatTime(m.created_at)}
                  </p>
                </div>
              </button>

              {open ? (
                <div className="mt-2 space-y-2 border-t border-border pt-2">
                  <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                  <div className="flex flex-wrap gap-2">
                    {folder === "inbox" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setReply({
                            to: address ?? person?.username ?? "",
                            subject: m.subject.startsWith("Re:") ? m.subject : `Re: ${m.subject}`,
                          });
                          setComposing(true);
                        }}
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                      >
                        Reply
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(m.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-60"
                    >
                      <Trash2 className="size-3.5" aria-hidden /> Delete
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
