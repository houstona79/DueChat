import { createFileRoute, Link } from "@tanstack/react-router";
import { Headset, MessagesSquare, Radio, Video } from "lucide-react";
import duechatLogo from "@/assets/duechat-logo.png.asset.json";
import peopleBg from "@/assets/landing-people-devices.jpg.asset.json";
import { SupportWidget } from "@/components/support/SupportWidget";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DueChat — Rooms, presence and calls" },
      {
        name: "description",
        content:
          "Create an account, join chat rooms, see who's online in real time and jump into voice or video calls.",
      },
      { property: "og:title", content: "DueChat — Rooms, presence and calls" },
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
    <main
      id="main-content"
      className="relative grid min-h-screen place-items-center px-6 py-16 text-center"
    >
      <img
        src={peopleBg.url}
        alt="People chatting on laptops, tablets and phones"
        width={1920}
        height={1280}
        className="pointer-events-none absolute inset-0 -z-20 size-full object-cover opacity-35"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background/85 via-background/75 to-background"
      />
      <div className="mx-auto max-w-3xl">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
          <MessagesSquare className="size-7" />
        </span>
        <a href="https://www.duechat.com" aria-label="Go to DueChat" className="inline-block">
          <img
            src={duechatLogo.url}
            alt="DueChat"
            className="mx-auto mt-6 h-14 w-auto object-contain sm:h-16"
          />
        </a>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
          Chat rooms with real accounts, live online status and one-tap voice or video calls —
          synced across every device you sign in on.
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
          <Link
            to="/rooms"
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium"
          >
            Browse rooms
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
        <p className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Headset className="size-4" aria-hidden />
          Need help? Tap <span className="font-semibold text-foreground">Live support</span> to
          message an admin.
        </p>
      </div>
      <SupportWidget />
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
