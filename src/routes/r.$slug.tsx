import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Globe, MessageSquare, Users } from "lucide-react";
import { getPublicRoomProfile } from "@/lib/room-profiles.functions";
import { ROOM_STAFF_LABEL } from "@/lib/room-profiles";
import type {
  PublicRoomProfile,
  PublicRoomReview,
  PublicRoomStaff,
} from "@/lib/room-profiles";
import { RatingBadge } from "@/components/messenger/RoomRating";
import { RoomCrownBadges } from "@/components/rooms/RoomCrown";
import { CROWN_LABEL, sortCrowns, type RoomCrown } from "@/lib/room-crowns";
import { RadioPlayer } from "@/components/messenger/RadioPlayer";
import { StarRow } from "@/components/rooms/StarRating";
import { RoomRatingForm } from "@/components/rooms/RoomRatingForm";
import { countryFlag } from "@/lib/country-flags";
import { initials } from "@/lib/chat";
import { relativeTime } from "@/lib/profile-updates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/r/$slug")({
  loader: async ({ params }) => {
    const data = await getPublicRoomProfile({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const room = loaderData?.room;
    const title = room ? `${room.name} — DueChat room` : "DueChat room profile";
    const description = room
      ? `${room.name} is a ${room.rating === "R" ? "18+" : "all ages"} ${room.category || "General"} room on DueChat with ${room.member_count} member${room.member_count === 1 ? "" : "s"}.${room.topic ? ` ${room.topic}` : ""}`.slice(
          0,
          158,
        )
      : "Browse a DueChat room, its leadership team and member ratings.";
    const meta: { title?: string; name?: string; property?: string; content?: string }[] = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    const image = room?.banner_url ?? room?.icon_url;
    if (image?.startsWith("https://")) {
      meta.push({ property: "og:image", content: image });
      meta.push({ name: "twitter:image", content: image });
    }
    return { meta };
  },
  errorComponent: () => (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <p className="text-sm text-muted-foreground">This room profile couldn’t load.</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">Room not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been removed, or it’s a private or hidden room.
        </p>
        <Link to="/chat" className="mt-3 inline-block text-sm text-primary hover:underline">
          Go to DueChat
        </Link>
      </div>
    </main>
  ),
  component: RoomProfilePage,
});

function StaffAvatar({ name, url }: { name: string; url: string | null }) {
  return url?.startsWith("https://") ? (
    <img
      src={url}
      alt=""
      className="size-10 shrink-0 rounded-full object-cover"
      loading="lazy"
    />
  ) : (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
      {initials(name)}
    </span>
  );
}

function RoomProfilePage() {
  const data = Route.useLoaderData() as {
    room: PublicRoomProfile;
    staff: PublicRoomStaff[];
    reviews: PublicRoomReview[];
    crowns: RoomCrown[];
  };
  const { room, staff, reviews } = data;
  const crowns = data.crowns ?? [];
  const avg = room.rating_avg ? Number(room.rating_avg) : 0;

  return (
    <main
      id="main-content"
      className="mx-auto min-w-0 w-full max-w-3xl px-3 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-8"
    >
      <Link
        to="/chat"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to DueChat
      </Link>

      <article className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
        {room.banner_url ? (
          <img
            src={room.banner_url}
            alt={`${room.name} banner`}
            className="h-36 w-full object-cover sm:h-48"
          />
        ) : null}

        <div className="p-6">
          <div className="flex items-start gap-4">
            {room.icon_url ? (
              <img
                src={room.icon_url}
                alt={`${room.name} icon`}
                className="size-16 shrink-0 rounded-2xl border border-border object-cover"
              />
            ) : (
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-secondary text-lg font-bold">
                {initials(room.name)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className="truncate text-xl font-semibold"
                  style={room.name_color ? { color: room.name_color } : undefined}
                >
                  {room.name}
                </h1>
                <RatingBadge rating={room.rating} />
                <RoomCrownBadges crowns={crowns} />
              </div>
              {crowns.length > 0 ? (
                <p className="mt-1 text-xs font-medium text-primary">
                  {sortCrowns(crowns)
                    .map((c) => CROWN_LABEL[c.period])
                    .join(" · ")}
                </p>
              ) : null}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {room.category || "General"} · {room.member_count}{" "}
                {room.member_count === 1 ? "member" : "members"} · created{" "}
                {relativeTime(room.created_at)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <StarRow value={avg} />
                <span>
                  {room.rating_count > 0
                    ? `${avg.toFixed(1)} from ${room.rating_count} rating${room.rating_count === 1 ? "" : "s"}`
                    : "No ratings yet"}
                </span>
              </div>
            </div>
          </div>

          {room.status_message ? (
            <p className="mt-4 rounded-2xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
              {room.status_message}
            </p>
          ) : null}
          {room.topic ? (
            <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">
              {room.topic}
            </p>
          ) : null}
          {room.website_url ? (
            <a
              href={room.website_url}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              className="mt-3 inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Globe className="size-4 shrink-0" aria-hidden />
              <span className="truncate">
                {room.website_label || room.website_url.replace(/^https?:\/\//, "")}
              </span>
              <ExternalLink className="size-3.5 shrink-0" aria-hidden />
            </a>
          ) : null}

          <Link
            to="/chat/$roomId"
            params={{ roomId: room.id }}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <MessageSquare className="size-4" aria-hidden />
            Open this room
          </Link>
        </div>
      </article>

      {room.radio_url ? (
        <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
          <h2 className="px-6 pt-6 text-sm font-semibold">Room radio</h2>
          <div className="mt-3">
            <RadioPlayer
              url={room.radio_url}
              name={room.radio_name}
              canEdit={false}
              onSave={async () => {}}
            />
          </div>
        </section>
      ) : null}

      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Users className="size-4 text-muted-foreground" aria-hidden />
          Room team
        </h2>
        <ul className="mt-4 space-y-3">
          {staff.map((member) => (
            <li key={`${member.tier}-${member.user_id}`} className="flex items-center gap-3">
              <StaffAvatar name={member.display_name} url={member.avatar_url} />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium"
                  style={member.name_color ? { color: member.name_color } : undefined}
                >
                  {member.display_name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  @{member.username}
                  {member.country ? ` · ${countryFlag(member.country) ?? member.country}` : ""}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                  member.tier === "owner"
                    ? "bg-primary/15 text-primary"
                    : member.tier === "super"
                      ? "bg-secondary text-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {ROOM_STAFF_LABEL[member.tier]}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Member ratings</h2>
        <div className="mt-4">
          <RoomRatingForm roomId={room.id} />
        </div>
        <ul className="mt-6 space-y-4">
          {reviews.length === 0 ? (
            <li className="text-sm text-muted-foreground">Be the first to rate this room.</li>
          ) : (
            reviews.map((review) => (
              <li key={review.id} className="border-t border-border pt-4 first:border-0 first:pt-0">
                <div className="flex items-center gap-3">
                  <StaffAvatar name={review.display_name} url={review.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{review.display_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{review.username} · {relativeTime(review.created_at)}
                    </p>
                  </div>
                  <StarRow value={review.stars} />
                </div>
                {review.comment ? (
                  <p className="mt-2 whitespace-pre-line break-words text-sm text-muted-foreground">
                    {review.comment}
                  </p>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}
