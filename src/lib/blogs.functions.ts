import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PublishedBlog, PublishedBlogSummary } from "@/lib/blog-types";

export const listPublicBlogs = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z
      .object({
        username: z.string().trim().max(40).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const { publicBlogClient } = await import("@/lib/blogs.server");
    const { data: rows, error } = await publicBlogClient().rpc("list_published_blogs", {
      _username: data.username ?? undefined,
      _limit: data.limit ?? 30,
    });
    if (error) throw error;
    return (rows ?? []) as PublishedBlogSummary[];
  });

export const getPublicBlog = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ username: z.string().trim().max(40), slug: z.string().trim().max(160) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { publicBlogClient } = await import("@/lib/blogs.server");
    const { data: rows, error } = await publicBlogClient().rpc("get_published_blog", {
      _username: data.username,
      _slug: data.slug,
    });
    if (error) throw error;
    return ((rows ?? [])[0] ?? null) as PublishedBlog | null;
  });