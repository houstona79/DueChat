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
    <main id="main-content" className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <a href="https://www.duechat.com" aria-label="Go to DueChat" className="inline-block">
          <img
            src={duechatLogo.url}
            alt="DueChat"
            className="mx-auto mb-8 h-14 w-auto object-contain"
          />
        </a>
        <h1 className="font-display text-2xl font-semibold">End User Agreement</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Welcome to DueChat. This End User Agreement (“Agreement”) governs your access to and use
            of the DueChat platform, including chat rooms, direct messaging, voice and video calls,
            and any other features we make available.
          </p>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">
            1. Eligibility
          </h2>
          <p>
            You must be at least 16 years old to create an account. Some rooms and content are
            marked as adults-only (18+) and are restricted to users who meet that age requirement.
            You are responsible for providing accurate information about your age, country, and
            identity.
          </p>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">
            2. Acceptable Use
          </h2>
          <p>
            You agree to use DueChat lawfully and respectfully. You may not use the platform to
            harass, abuse, threaten, spam, or impersonate others; share illegal, hateful, or
            sexually explicit content involving minors; distribute malware; scrape data; or attempt
            to bypass security controls. Room owners and moderators may remove users who violate
            these rules.
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
            must not record or broadcast other users without their consent. Camera and microphone
            access is optional and can be revoked through your browser or device settings.
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
            6. VPN, Proxy, and Anonymizing Networks
          </h2>
          <p>
            Access to DueChat through VPNs, proxies, Tor, relays, or hosting/datacenter networks is
            not permitted. To keep the community safe and enforce bans and age restrictions, we
            check the network address used at sign-in and may block or sign out connections that
            appear to come from an anonymizing or commercial hosting network. Attempting to evade a
            ban, device lock, or age gate by masking your network address is a violation of this
            Agreement and may result in permanent removal. Approved staff accounts may be exempt for
            administrative purposes. If you believe your connection was blocked in error, contact us
            using the details in section 11.
          </p>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">
            7. Single Browser Policy
          </h2>
          <p>
            To reduce abuse, ban evasion, and account sharing, DueChat may bind a single account to
            a browser or device identifier. Once a browser is linked to an account, you may not use
            it to sign in to a different account unless you are an approved administrator or
            moderator. If you attempt to sign in with a different account on a linked browser, you
            may be signed out and redirected to the original account. You may contact support if you
            believe your browser was linked in error. Approved staff accounts may be exempt for
            administrative purposes.
          </p>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">
            8. Termination and Moderation
          </h2>
          <p>
            DueChat administrators and moderators may kick, ban, or remove users from rooms or the
            platform for violations of this Agreement. We may also terminate or suspend accounts at
            our discretion.
          </p>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">
            8a. Radio Stations and Music Licensing
          </h2>
          <p>
            Room owners and room admins may add an internet radio stream to a room. Any station you
            add must be properly licensed for public broadcast in its territory (for example
            SoundExchange, ASCAP, BMI, SESAC, PRS, or an equivalent performing-rights and streaming
            license). You may only add streams you own or that you are permitted to rebroadcast —
            pirated, ripped, or unlicensed feeds are prohibited. Explicit or adults-only stations
            may not be used in G-rated rooms. You confirm licensing when you save a station, and you
            are responsible for that confirmation. DueChat does not license the music played through
            third-party streams and may remove any station, revoke radio privileges, or suspend
            accounts that violate this section or that are the subject of a rights-holder complaint.
          </p>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">
            9. Privacy and Data
          </h2>
          <p>
            Your use of DueChat is also governed by our Privacy Policy. We collect and process data
            as described there, including account information, messages, profile data, usage logs,
            and connection details such as your network address, browser identifier, and whether the
            connection was detected as a VPN or proxy. This information is visible only to
            administrators and is used for safety, ban enforcement, and abuse prevention.
          </p>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">10. Changes</h2>
          <p>
            We may update this Agreement from time to time. Continued use of DueChat after changes
            means you accept the updated terms. Material changes will be communicated through the
            platform or by email when possible.
          </p>

          <h2 className="mt-6 font-display text-lg font-semibold text-foreground">11. Contact</h2>
          <p>
            If you have questions about this Agreement, contact the DueChat team through the
            platform or at the support channel listed on your account settings.
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
