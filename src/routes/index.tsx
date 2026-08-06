import { createFileRoute, Link } from "@tanstack/react-router";
import { MessagesSquare, Radio, Video } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Halo Messenger — Rooms, presence and calls" },
      {
        name: "description",
        content:
          "Create an account, join chat rooms, see who's online in real time and jump into voice or video calls.",
      },
      { property: "og:title", content: "Halo Messenger — Rooms, presence and calls" },
      {
        property: "og:description",
        content:
          "Create an account, join chat rooms, see who's online in real time and jump into voice or video calls.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="mx-auto grid min-h-screen max-w-3xl place-items-center px-6 py-16 text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
          <MessagesSquare className="size-7" />
        </span>
        <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Halo Messenger
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
          Chat rooms with real accounts, live online status and one-tap voice or video calls — synced
          across every device you sign in on.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/auth"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Create your account
          </Link>
          <Link
            to="/chat"
            className="rounded-xl border border-border bg-secondary px-5 py-2.5 text-sm font-medium"
          >
            Open messenger
          </Link>
        </div>
        <ul className="mt-12 grid gap-4 text-left sm:grid-cols-3">
          <Feature icon={<MessagesSquare className="size-4" />} title="Shared rooms">
            Create a room, invite the team, and everyone sees new messages instantly.
          </Feature>
          <Feature icon={<Radio className="size-4" />} title="Live presence">
            Green dots show who's online right now across rooms.
          </Feature>
          <Feature icon={<Video className="size-4" />} title="Voice &amp; video">
            Start a call from any room, on desktop or your phone's browser.
          </Feature>
        </ul>
      </div>
    </main>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="rounded-2xl bg-secondary p-4">
      <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary">
        {icon}
      </span>
      <h2 className="mt-3 text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{children}</p>
    </li>
  );
}
