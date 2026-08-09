import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Headset, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  guestTicketThread,
  sendGuestMessage,
  startGuestTicket,
} from "@/lib/support.functions";
import { fetchMyTicket, sendMyMessage, startMyTicket } from "@/lib/support";
import {
  readGuestHandle,
  writeGuestHandle,
  type GuestHandle,
  type SupportThread,
} from "@/lib/support-types";

/**
 * Live support chat for the home page: anyone can reach an admin, signed in or
 * not. Guests are identified by a private token kept in their own browser.
 */
export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg"
      >
        {open ? <X className="size-4" aria-hidden /> : <Headset className="size-4" aria-hidden />}
        {open ? "Close support" : "Live support"}
      </button>

      {open && (
        <section
          aria-label="Live support chat"
          className="fixed bottom-[max(5rem,calc(env(safe-area-inset-bottom)+5rem))] right-4 z-40 flex max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border bg-card text-left shadow-2xl"
        >
          <header className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Live support</h2>
            <p className="text-xs text-muted-foreground">
              Message a DueChat admin about any issue — replies appear right here.
            </p>
          </header>
          {signedIn ? <MemberChat /> : <GuestChat />}
        </section>
      )}
    </>
  );
}

function MemberChat() {
  const queryClient = useQueryClient();
  const thread = useQuery({
    queryKey: ["support", "mine"],
    queryFn: fetchMyTicket,
    refetchInterval: 5000,
  });

  const start = useMutation({
    mutationFn: (vars: { subject: string; body: string }) => startMyTicket(vars.subject, vars.body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["support", "mine"] }),
  });
  const reply = useMutation({
    mutationFn: (vars: { id: string; body: string }) => sendMyMessage(vars.id, vars.body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["support", "mine"] }),
  });

  if (thread.isLoading) return <Loading />;

  if (!thread.data) {
    return (
      <NewTicketForm
        busy={start.isPending}
        error={start.error instanceof Error ? start.error.message : null}
        onSubmit={(v) => start.mutate({ subject: v.subject, body: v.body })}
      />
    );
  }

  return (
    <Conversation
      thread={thread.data}
      busy={reply.isPending}
      error={reply.error instanceof Error ? reply.error.message : null}
      onSend={(body) => reply.mutate({ id: thread.data!.id, body })}
    />
  );
}

function GuestChat() {
  const queryClient = useQueryClient();
  const [handle, setHandle] = useState<GuestHandle | null>(null);
  const loadThread = useServerFn(guestTicketThread);
  const startFn = useServerFn(startGuestTicket);
  const sendFn = useServerFn(sendGuestMessage);

  useEffect(() => setHandle(readGuestHandle()), []);

  const thread = useQuery({
    queryKey: ["support", "guest", handle?.id],
    queryFn: () => loadThread({ data: handle! }),
    enabled: Boolean(handle),
    refetchInterval: 5000,
  });

  useEffect(() => {
    // The chat was deleted or the token no longer matches — start over.
    if (handle && thread.isFetched && thread.data === null) {
      writeGuestHandle(null);
      setHandle(null);
    }
  }, [handle, thread.isFetched, thread.data]);

  const start = useMutation({
    mutationFn: (vars: { name: string; email: string; subject: string; body: string }) =>
      startFn({ data: vars }),
    onSuccess: (created) => {
      writeGuestHandle(created);
      setHandle(created);
    },
  });

  const reply = useMutation({
    mutationFn: (body: string) => sendFn({ data: { ...handle!, body } }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["support", "guest", handle?.id] }),
  });

  if (!handle) {
    return (
      <NewTicketForm
        askIdentity
        busy={start.isPending}
        error={start.error instanceof Error ? start.error.message : null}
        onSubmit={(v) =>
          start.mutate({ name: v.name, email: v.email, subject: v.subject, body: v.body })
        }
      />
    );
  }

  if (!thread.data) return <Loading />;

  return (
    <Conversation
      thread={thread.data}
      busy={reply.isPending}
      error={reply.error instanceof Error ? reply.error.message : null}
      onSend={(body) => reply.mutate(body)}
    />
  );
}

function Loading() {
  return <p className="px-4 py-6 text-sm text-muted-foreground">Loading your support chat…</p>;
}

function NewTicketForm({
  askIdentity = false,
  busy,
  error,
  onSubmit,
}: {
  askIdentity?: boolean;
  busy: boolean;
  error: string | null;
  onSubmit: (v: { name: string; email: string; subject: string; body: string }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const ready =
    subject.trim().length >= 3 &&
    body.trim().length > 0 &&
    (!askIdentity || (name.trim().length > 0 && /.+@.+\..+/.test(email.trim())));

  return (
    <form
      className="space-y-3 overflow-y-auto px-4 py-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready && !busy) onSubmit({ name, email, subject, body });
      }}
    >
      {askIdentity && (
        <>
          <Field id="support-name" label="Your name" value={name} onChange={setName} />
          <Field
            id="support-email"
            label="Email for replies"
            type="email"
            value={email}
            onChange={setEmail}
          />
        </>
      )}
      <Field
        id="support-subject"
        label="What's the issue?"
        value={subject}
        onChange={setSubject}
        placeholder="Can't join a room"
      />
      <div>
        <label
          htmlFor="support-body"
          className="block text-[11px] font-medium text-muted-foreground"
        >
          Details
        </label>
        <textarea
          id="support-body"
          rows={3}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-1 w-full resize-none rounded-xl bg-secondary px-3 py-2.5 text-base outline-none sm:text-sm"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={!ready || busy}
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Starting…" : "Start support chat"}
      </button>
    </form>
  );
}

function Conversation({
  thread,
  busy,
  error,
  onSend,
}: {
  thread: SupportThread;
  busy: boolean;
  error: string | null;
  onSend: (body: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.messages.length]);

  return (
    <>
      <div className="border-b border-border px-4 py-2">
        <p className="truncate text-xs font-semibold">{thread.subject}</p>
        <p className="text-[11px] text-muted-foreground">
          {thread.status === "open" ? "An admin will reply here." : "Closed by support."}
        </p>
      </div>
      <div
        role="log"
        aria-live="polite"
        className="flex-1 space-y-2 overflow-y-auto px-4 py-3"
      >
        {thread.messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              m.from_staff
                ? "bg-secondary"
                : "ml-auto bg-primary text-primary-foreground"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{m.body}</p>
            <p
              className={`mt-1 text-[10px] ${
                m.from_staff ? "text-muted-foreground" : "text-primary-foreground/70"
              }`}
            >
              {m.from_staff ? "DueChat support" : "You"} ·{" "}
              {new Date(m.created_at).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const body = draft.trim();
          if (!body || busy) return;
          onSend(body);
          setDraft("");
        }}
      >
        {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
        <div className="flex items-end gap-2">
          <label htmlFor="support-draft" className="sr-only">
            Message support
          </label>
          <textarea
            id="support-draft"
            rows={1}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your message"
            className="max-h-24 flex-1 resize-none rounded-xl bg-secondary px-3 py-2.5 text-base outline-none placeholder:text-muted-foreground sm:text-sm"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label="Send message"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="size-4" aria-hidden />
          </button>
        </div>
      </form>
    </>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-base outline-none placeholder:text-muted-foreground sm:text-sm"
      />
    </div>
  );
}