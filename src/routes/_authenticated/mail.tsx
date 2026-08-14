import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Mail } from "lucide-react";
import { useAuth, useMyProfile } from "@/hooks/use-auth";
import { MemberMailbox } from "@/components/messenger/MemberMailbox";
import { ZohoMailbox } from "@/components/messenger/ZohoMailbox";
import { MAIL_DOMAIN } from "@/lib/chat";

export const Route = createFileRoute("/_authenticated/mail")({
  head: () => ({
    meta: [
      { title: "Mailbox — DueChat" },
      {
        name: "description",
        content: `Manage your @${MAIL_DOMAIN} mailbox, forwarding address and webmail sign-in from DueChat.`,
      },
      { property: "og:title", content: "Mailbox — DueChat" },
      {
        property: "og:description",
        content: `Manage your @${MAIL_DOMAIN} mailbox, forwarding address and webmail sign-in from DueChat.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MailPage,
});

function MailPage() {
  const { user } = useAuth();
  const { data: me } = useMyProfile(user?.id);
  const handle = me?.mail_handle ?? me?.username ?? null;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-3">
        <Link
          to="/chat"
          aria-label="Back to messenger"
          className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 truncate text-lg font-semibold">
            <Mail className="size-4 text-primary" /> Mailbox
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            Your @{MAIL_DOMAIN} address, forwarding and webmail in one place.
          </p>
        </div>
      </header>

      <section className="mt-5 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Your address</h2>
        <p className="mt-1 text-sm">
          {handle ? (
            <code className="break-all font-semibold">
              {handle}@{MAIL_DOMAIN}
            </code>
          ) : (
            <span className="text-muted-foreground">
              Pick a handle below to claim your address.
            </span>
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="https://mail.zoho.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Open Zoho webmail <ExternalLink className="size-3" />
          </a>
          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
          >
            Open Google webmail <ExternalLink className="size-3" />
          </a>
          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
          >
            Forwarding settings
          </Link>
        </div>
      </section>

      <div className="mt-5 space-y-5">
        <MemberMailbox defaultHandle={handle} />
        <ZohoMailbox defaultHandle={handle} />
      </div>
    </div>
  );
}
