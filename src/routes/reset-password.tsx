import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { recoveryCode, recoveryLinkError } from "@/lib/recovery";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — DueChat" },
      { name: "description", content: "Set a new password for your DueChat account." },
      { property: "og:title", content: "Choose a new password — DueChat" },
      { property: "og:description", content: "Set a new password for your DueChat account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [linkOk, setLinkOk] = useState(false);
  const [resendEmail, setResendEmail] = useState("");

  useEffect(() => {
    let cancelled = false;

    const finish = (ok: boolean, note?: string) => {
      if (cancelled) return;
      setLinkOk(ok);
      setReady(true);
      if (note) setMessage(note);
    };

    const check = async () => {
      const linkError = recoveryLinkError();
      if (linkError) return finish(false, linkError);

      const code = recoveryCode();
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) return finish(false, "That reset link is no longer valid.");
        return finish(true);
      }

      // supabase-js parses the token fragment asynchronously on load.
      for (let i = 0; i < 12; i += 1) {
        const { data } = await supabase.auth.getSession();
        if (data.session) return finish(true);
        await new Promise((r) => setTimeout(r, 250));
      }
      finish(
        false,
        "This reset link has expired or was already used — request a new one below.",
      );
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setMessage("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Those passwords don't match.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMessage(
        error.message.includes("session")
          ? "This reset link has expired — request a new one from the sign-in page."
          : error.message,
      );
      return;
    }
    setMessage("Password updated. Taking you to your rooms…");
    setTimeout(() => void navigate({ to: "/chat" }), 900);
  };

  const resend = async () => {
    if (!resendEmail.trim()) {
      setMessage("Enter your email so we can send a new link.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(resendEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setMessage(error ? error.message : "New reset email sent — check your inbox.");
  };

  if (ready && !linkOk) {
    return (
      <main
        id="main-content"
        className="mx-auto grid min-h-dvh max-w-md place-items-center px-4 py-10"
      >
        <div className="w-full rounded-3xl border border-border bg-card p-6">
          <h1 className="text-xl font-semibold">Reset link problem</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            {message ?? "This reset link is no longer valid."}
          </p>
          <label
            htmlFor="resend-email"
            className="mt-5 block text-[11px] font-medium text-muted-foreground"
          >
            Email
          </label>
          <input
            id="resend-email"
            type="email"
            autoComplete="email"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-base outline-none sm:text-sm"
          />
          <button
            type="button"
            onClick={() => void resend()}
            className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Send a new reset link
          </button>
          <button
            type="button"
            onClick={() => void navigate({ to: "/auth" })}
            className="mt-3 w-full text-sm text-muted-foreground underline hover:text-foreground"
          >
            Back to sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="mx-auto grid min-h-dvh max-w-md place-items-center px-4 py-10"
    >
      <form onSubmit={submit} className="w-full rounded-3xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">Choose a new password</h1>
        <p className="mt-1 text-xs text-muted-foreground">Enter a new password for your account.</p>
        <label
          htmlFor="new-password"
          className="mt-5 block text-[11px] font-medium text-muted-foreground"
        >
          New password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none"
        />
        <label
          htmlFor="confirm-password"
          className="mt-3 block text-[11px] font-medium text-muted-foreground"
        >
          Confirm password
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none"
        />
        {message ? <p className="mt-3 text-xs text-muted-foreground">{message}</p> : null}
        <button
          type="submit"
          disabled={busy || !ready}
          className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {!ready ? "Checking your link…" : busy ? "Saving…" : "Save new password"}
        </button>
      </form>
    </main>
  );
}
