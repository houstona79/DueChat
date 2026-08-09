import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  return (
    <main id="main-content" className="mx-auto grid min-h-dvh max-w-md place-items-center px-4 py-10">
      <form onSubmit={submit} className="w-full rounded-3xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">Choose a new password</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter a new password for your account.
        </p>
        <label htmlFor="new-password" className="mt-5 block text-[11px] font-medium text-muted-foreground">
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
        <label htmlFor="confirm-password" className="mt-3 block text-[11px] font-medium text-muted-foreground">
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
          disabled={busy}
          className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save new password"}
        </button>
      </form>
    </main>
  );
}
