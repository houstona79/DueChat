import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

function ageFrom(value: string): number | null {
  if (!value) return null;
  const dob = new Date(value + "T00:00:00");
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — DueChat" },
      { name: "description", content: "Create your DueChat account or sign in to your rooms." },
      { property: "og:title", content: "Sign in — DueChat" },
      {
        property: "og:description",
        content: "Create your DueChat account or sign in to your rooms.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) void navigate({ to: "/chat", replace: true });
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/chat", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup") {
      const age = ageFrom(birthDate);
      if (age === null) {
        setNotice("Please enter your date of birth.");
        return;
      }
      if (age < 16) {
        setNotice("You must be 16 or older to create a DueChat account.");
        return;
      }
    }
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: displayName.trim(),
              username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""),
              status_message: status.trim(),
              birth_date: birthDate,
            },
          },
        });
        if (error) throw error;
        if (!data.session) setNotice("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setNotice(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setNotice("Google sign-in failed. Please try again.");
      return;
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to your rooms and see who's online."
            : "Pick a handle and start chatting in seconds."}
        </p>

        <button
          onClick={() => void google()}
          className="mt-6 w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-medium"
        >
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" ? (
            <>
              <Input id="display-name" label="Display name" value={displayName} onChange={setDisplayName} />
              <Input id="username" label="Username" value={username} onChange={setUsername} placeholder="mira" />
              <Input id="status" label="Status (optional)" value={status} onChange={setStatus} placeholder="Building things" />
              <Input id="birth-date" label="Date of birth" type="date" value={birthDate} onChange={setBirthDate} />
              <p className="text-xs text-muted-foreground">You must be 16 or older to join DueChat.</p>
            </>
          ) : null}
          <Input id="email" label="Email" type="email" value={email} onChange={setEmail} />
          <Input id="password" label="Password" type="password" value={password} onChange={setPassword} />
          {notice ? <p className="text-xs text-muted-foreground">{notice}</p> : null}
          <button
            type="submit"
            disabled={busy || !email || password.length < 6 || (mode === "signup" && !birthDate)}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 w-full text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}

function Input({
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
        className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
