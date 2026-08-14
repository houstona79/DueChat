import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function HomeLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [zohoId, setZohoId] = useState("");

  const openZoho = (e: React.FormEvent) => {
    e.preventDefault();
    const id = zohoId.trim();
    const url = id
      ? `https://accounts.zoho.com/signin?servicename=ZohoMail&LOGIN_ID=${encodeURIComponent(id)}`
      : "https://mail.zoho.com/";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) {
      setNotice(error.message);
      return;
    }
    void navigate({ to: "/chat", replace: true });
  };

  return (
    <section
      aria-labelledby="home-login-heading"
      className="mx-auto mt-10 w-full max-w-sm rounded-2xl border border-border bg-secondary/70 p-5 text-left backdrop-blur"
    >
      <h2 id="home-login-heading" className="text-sm font-semibold">
        Sign in with email
      </h2>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <div>
          <label
            htmlFor="home-email"
            className="block text-[11px] font-medium text-muted-foreground"
          >
            Email
          </label>
          <input
            id="home-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="home-password"
            className="block text-[11px] font-medium text-muted-foreground"
          >
            Password
          </label>
          <input
            id="home-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none"
          />
        </div>
        {notice ? <p className="text-xs text-muted-foreground">{notice}</p> : null}
        <button
          type="submit"
          disabled={busy || !email || password.length < 6}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <Link to="/auth" className="underline hover:text-foreground">
          Create your account
        </Link>
        <Link to="/auth" className="underline hover:text-foreground">
          Forgot your password?
        </Link>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Zoho Mail sign in</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Already have a comtv.us mailbox? Open your inbox in Zoho webmail.
        </p>
        <form onSubmit={openZoho} className="mt-3 space-y-3">
          <div>
            <label
              htmlFor="zoho-login-id"
              className="block text-[11px] font-medium text-muted-foreground"
            >
              Mailbox address
            </label>
            <input
              id="zoho-login-id"
              type="email"
              inputMode="email"
              placeholder="you@comtv.us"
              autoComplete="username"
              value={zohoId}
              onChange={(e) => setZohoId(e.target.value)}
              className="mt-1 w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-secondary"
          >
            Open Zoho Mail
          </button>
        </form>
      </div>
    </section>
  );
}