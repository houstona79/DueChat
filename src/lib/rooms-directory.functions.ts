import { createServerFn } from "@tanstack/react-start";

export type DirectoryRoom = {
  id: string;
  name: string;
  slug: string;
  topic: string | null;
  category: string;
  rating: "G" | "R";
  name_color: string | null;
  icon_url: string | null;
  member_count: number;
  rating_avg: number | null;
  rating_count: number;
};

export const getRoomsDirectory = createServerFn({ method: "GET" }).handler(async () => {
  const { publicBlogClient } = await import("@/lib/blogs.server");
  const { data, error } = await publicBlogClient().rpc("list_public_rooms", { _limit: 200 });
  if (error) throw error;
  const rooms = ((data ?? []) as DirectoryRoom[]).filter(
    (r) => (r.category ?? "").toLowerCase() !== "help" && !/^staff room$/i.test(r.name),
  );
  const top = [...rooms]
    .filter((r) => (r.rating_count ?? 0) > 0)
    .sort(
      (a, b) =>
        Number(b.rating_avg ?? 0) - Number(a.rating_avg ?? 0) ||
        (b.rating_count ?? 0) - (a.rating_count ?? 0) ||
        (b.member_count ?? 0) - (a.member_count ?? 0),
    )
    .slice(0, 10);
  const all = [...rooms].sort((a, b) => a.name.localeCompare(b.name));
  return { top, all };
});