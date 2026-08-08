import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Avatar } from "@/components/messenger/Avatar";
import { fetchInviteOwner, rememberInvite } from "@/lib/invites";
import duechatLogo from "@/assets/duechat-logo.png.asset.json";
import { ThemeToggle } from "@/components/system/ThemeToggle";

export const Route = createFileRoute("/i/$code")({
  head: () => ({
    meta: [
      { title: "You're invited to DueChat" },
      {
        name: "description",
        content:
          "Accept your DueChat invite to join chat rooms, buddy lists and voice or video calls.",
      },
      { property: "og:title", content: "You're invited to DueChat" },
      {
        property: "og:description",
        content:
          "Accept your DueChat invite to join chat rooms, buddy lists and voice or video calls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { data: owner, isLoading } = useQuery({
    queryKey: ["invite-owner", code],
    queryFn: () => fetchInviteOwner(code),
  });

  useEffect(() => {
    if (owner) rememberInvite(code);
  }, [owner, code]);

  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="mb-2 flex justify-end">
          <ThemeToggle />
        </div>
        <img
          src={duechatLogo.url}
          alt="DueChat"
          className="mx-auto mb-6 h-16 w-auto object-contain"
        />
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Checking your invite…</p>
        ) : owner ? (
          <>
            <div className="flex flex-col items-center gap-3">
              <Avatar
                url={owner.avatar_url}
                name={owner.display_name}
                size={64}
              />
              <h1 className="font-display text-2xl font-semibold">
                {owner.display_name} invited you to DueChat
              </h1>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your account and you'll both be added to each other's buddy list right away.
            </p>
            <button
              onClick={() => {
                rememberInvite(code);
                void navigate({ to: "/auth" });
              }}
              className="mt-6 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Accept invite
            </button>
            <p className="mt-3 text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link to="/auth" className="text-primary underline hover:text-foreground">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-semibold">This invite link isn't valid</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask your friend to send you a fresh link, or join DueChat on your own.
            </p>
            <Link
              to="/auth"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Create an account
            </Link>
          </>
        )}
      </div>
    </main>
  );
}