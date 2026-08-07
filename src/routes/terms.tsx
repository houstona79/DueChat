import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { acceptEula } from "@/lib/chat";
import duechatLogo from "@/assets/duechat-logo.png.asset.json";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "End User Agreement — DueChat" },
      {
        name: "description",
        content: "DueChat End User Agreement and terms of service.",
      },
      { property: "og:title", content: "End User Agreement — DueChat" },
      {
        property: "og:description",
        content: "DueChat End User Agreement and terms of service.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user.id);
    });
  }, []);

  const onAccept = async () => {
    if (!user) return;
    setBusy(true);
    setNotice(null);
    try {
      await acceptEula(user);
      void navigate({ to: "/chat", replace: true });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not accept agreement.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Link to="/auth">
          <img
            src={duechatLogo.url}
            alt="DueChat"
            className="mx-auto mb-8 h-14 w-auto object-contain"
          />
        </Link>
        <h1 className="font-display text-2xl font-semibold">End User Agreement</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Welcome to DueChat. This End User Agreement (“Agreement”) governs your access to and use
            of the DueChat platform, including chat rooms, direct messaging, voice and video calls, and
            any other features we make available.
          </p>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">1. Eligibility</h2>
          <p>
            You must be at least 16 years old to create an account. Some rooms and content are marked
            as adults-only (18+) and are restricted to users who meet that age requirement. You are
            responsible for providing accurate information about your age, country, and identity.
          </p>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">2. Acceptable Use</h2>
          <p>
            You agree to use DueChat lawfully and respectfully. You may not use the platform to harass,
            abuse, threaten, spam, or impersonate others; share illegal, hateful, or sexually explicit
            content involving minors; distribute malware; scrape data; or attempt to bypass security
            controls. Room owners and moderators may remove users who violate these rules.
          </p>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">
            3. Content and Conduct
          </h2>
          <p>
            You are solely responsible for the content you share in rooms, direct messages, and your
            public profile. DueChat does not claim ownership of your content, but you grant us the
            limited rights necessary to host, display, and transmit it to other users. We may remove
            content or suspend accounts that violate this Agreement or applicable law.
          </p>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">
            4. Voice, Video, and Calls
          </h2>
          <p>
            Voice and video calls are peer-to-peer or relayed by standard WebRTC infrastructure. You
            must not record or broadcast other users without their consent. Camera and microphone access
            is optional and can be revoked through your browser or device settings.
          </p>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">
            5. Age-Restricted Rooms
          </h2>
          <p>
            Rooms marked “R” (Adults only) are intended for users 18 and older. You may not enter or
            participate in these rooms unless you are an adult. Misrepresenting your age to access
            age-restricted content is a violation of this Agreement.
          </p>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">
            6. Termination and Moderation
          </h2>
          <p>
            DueChat administrators and moderators may kick, ban, or remove users from rooms or the
            platform for violations of this Agreement. We may also terminate or suspend accounts at our
            discretion.
          </p>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">
            7. Privacy and Data
          </h2>
          <p>
            Your use of DueChat is also governed by our Privacy Policy. We collect and process data as
            described there, including account information, messages, profile data, and usage logs.
          </p>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">8. Changes</h2>
          <p>
            We may update this Agreement from time to time. Continued use of DueChat after changes
            means you accept the updated terms. Material changes will be communicated through the
            platform or by email when possible.
          </p>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">9. Contact</h2>
          <p>
            If you have questions about this Agreement, contact the DueChat team through the platform or
            at the support channel listed on your account settings.
          </p>
        </section>

        <div className="mt-8 flex flex-col gap-3">
          {notice ? <p className="text-xs text-muted-foreground">{notice}</p> : null}
          {user ? (
            <button
              onClick={() => void onAccept()}
              disabled={busy}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Please wait…" : "I agree to the End User Agreement"}
            </button>
          ) : null}
          <Link
            to="/auth"
            className="inline-flex w-full items-center justify-center rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium"
          >
            {user ? "Back to DueChat" : "Back to sign in"}
          </Link>
          {!user ? (
            <p className="text-center text-xs text-muted-foreground">
              You accept this agreement with the checkbox on the sign-up form, or by signing in and
              agreeing here.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
