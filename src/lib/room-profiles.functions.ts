import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PublicRoomProfile, PublicRoomReview, PublicRoomStaff } from "@/lib/room-profiles";

export const getPublicRoomProfile = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ slug: z.string().trim().max(120) }).parse(data))
  .handler(async ({ data }) => {
    const { publicBlogClient } = await import("@/lib/blogs.server");
    const client = publicBlogClient();
    const [profile, staff, reviews] = await Promise.all([
      client.rpc("public_room_profile", { _slug: data.slug }),
      client.rpc("public_room_staff", { _slug: data.slug }),
      client.rpc("public_room_reviews", { _slug: data.slug, _limit: 20 }),
    ]);
    if (profile.error) throw profile.error;
    if (staff.error) throw staff.error;
    if (reviews.error) throw reviews.error;
    const room = ((profile.data ?? []) as PublicRoomProfile[])[0] ?? null;
    if (!room) return null;
    return {
      room,
      staff: (staff.data ?? []) as PublicRoomStaff[],
      reviews: (reviews.data ?? []) as PublicRoomReview[],
    };
  });
