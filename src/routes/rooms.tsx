import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Crown, Flame, LogIn, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
  getRoomsDirectory,
  type DirectoryRoom,
  type TrendingRoom,
} from "@/lib/rooms-directory.functions";
import { RatingBadge } from "@/components/messenger/RoomRating";
import { StarRow } from "@/components/rooms/StarRating";
import { RoomCrownBadges } from "@/components/rooms/RoomCrown";
import { crownsById, type RoomCrown } from "@/lib/room-crowns";
import { RoomCover } from "@/components/rooms/RoomCover";

const title = "Browse rooms — DueChat";
const description =
  "Browse every public DueChat chat room with thumbnails, member counts and star ratings — then jump in and join.";

export const Route = createFileRoute("/rooms")({
  loader: () => getRoomsDirectory(),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <p className="text-sm text-muted-foreground">The room list couldn’t load right now.</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <p className="text-sm text-muted-foreground">No rooms found.</p>
    </main>
  ),
  component: RoomsDirectoryPage,
});

function RoomThumb({ name, url }: { name: string; url: string | null }) {
  return <RoomCover name={name} url={url} className="h-28 w-full rounded-t-3xl" />;
}


function RoomCard({
  room,
  rank,
  note,
  crowns = [],
}: {
  room: DirectoryRoom;
  rank?: number;
  note?: string;
  crowns?: RoomCrown[];
}) {
  const avg = room.rating_avg ? Number(room.rating_avg) : 0;
  return (
    <li className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card transition-shadow hover:shadow-md">
      <Link to="/r/$slug" params={{ slug: room.slug }} className="focus-visible:outline-none">
        <RoomThumb name={room.name} url={room.icon_url} />
        <span className="block px-4 pt-3">
          <span className="flex flex-wrap items-center gap-2">
            {rank ? (
              <span className="w-5 shrink-0 text-sm font-bold text-muted-foreground">{rank}</span>
            ) : null}
            <span
              className="truncate font-semibold"
              style={room.name_color ? { color: room.name_color } : undefined}
            >
              {room.name}
            </span>
            <RatingBadge rating={room.rating} />
            <RoomCrownBadges crowns={crowns} />
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{room.category || "General"}</span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden />
              {room.member_count}
            </span>
            <StarRow value={avg} />
            <span>
              {room.rating_count > 0 ? `${avg.toFixed(1)} (${room.rating_count})` : "No ratings"}
            </span>
            {note ? <span className="font-medium text-foreground">{note}</span> : null}
          </span>
          {room.description || room.topic ? (
            <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
              {room.description || room.topic}
            </span>
          ) : null}
        </span>
      </Link>
      <span className="mt-auto block px-4 pb-4 pt-3">
        <Link
          to="/chat/$roomId"
          params={{ roomId: room.id }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none"
        >
          <LogIn className="size-4" aria-hidden />
          Join room
        </Link>
      </span>
    </li>
  );
}

function TrendingSection({
  label,
  rooms,
  crowns,
}: {
  label: string;
  rooms: TrendingRoom[];
  crowns: Map<string, RoomCrown[]>;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
      {rooms.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No room activity yet in this window.</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room, i) => (
            <RoomCard
              key={room.id}
              room={room}
              rank={i + 1}
              crowns={crowns.get(room.id) ?? []}
              note={`${room.join_count} join${room.join_count === 1 ? "" : "s"}`}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function RoomsDirectoryPage() {
  const { top, all, trending, crowns } = Route.useLoaderData() as {
    top: DirectoryRoom[];
    all: DirectoryRoom[];
    trending: { day: TrendingRoom[]; week: TrendingRoom[]; month: TrendingRoom[] };
    crowns: RoomCrown[];
  };
  const crownMap = crownsById(crowns ?? []);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => {
    const set = new Set(all.map((r) => r.category || "General"));
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((r) => {
      if (category !== "All" && (r.category || "General") !== category) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.topic ?? "").toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [all, query, category]);

  const browsing = query.trim() !== "" || category !== "All";

  return (
    <main
      id="main-content"
      className="mx-auto w-full min-w-0 max-w-5xl px-3 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-8"
    >
      <Link
        to="/chat"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to DueChat
      </Link>

      <h1 className="mt-6 text-2xl font-semibold">Browse rooms</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every public DueChat room — pick one and join the conversation. Help lobbies and staff
        rooms aren’t listed.
      </p>

      <div className="mt-5 flex flex-col gap-3">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rooms by name, topic, or category…"
            className="w-full rounded-2xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                category === cat
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {!browsing && (
        <>
          <section className="mt-8">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Flame className="size-4 text-primary" aria-hidden />
              Busiest rooms
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Top 3 rooms by people joining, for today, this week, and this month.
            </p>
            <div className="mt-4 space-y-6">
              <TrendingSection label="Today" rooms={trending.day} crowns={crownMap} />
              <TrendingSection label="This week" rooms={trending.week} crowns={crownMap} />
              <TrendingSection label="This month" rooms={trending.month} crowns={crownMap} />
            </div>
          </section>

          <section className="mt-10">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Crown className="size-4 text-primary" aria-hidden />
              Top rooms
            </h2>
            {top.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No rated rooms yet — rate a room to start the leaderboard.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {top.map((room, i) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    rank={i + 1}
                    crowns={crownMap.get(room.id) ?? []}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-semibold">
          {browsing ? `Matching rooms (${filtered.length})` : `All rooms (${all.length})`}
        </h2>
        {filtered.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {browsing ? "No rooms match your search." : "No public rooms yet."}
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((room) => (
              <RoomCard key={room.id} room={room} crowns={crownMap.get(room.id) ?? []} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
