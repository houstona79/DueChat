import { supabase } from "@/integrations/supabase/client";
import {
  MAX_BLOG_BODY,
  MAX_BLOG_COMMENT,
  MAX_BLOG_EXCERPT,
  MAX_BLOG_TITLE,
  type BlogComment,
  type BlogPost,
  type PublishedBlog,
  type PublishedBlogSummary,
} from "@/lib/blog-types";

const COLS = "id,user_id,title,slug,body,excerpt,cover_url,published_at,created_at,updated_at";
const MAX_COVER_BYTES = 8 * 1024 * 1024;

export function slugify(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || `post-${Date.now().toString(36)}`;
}

/** The author's own posts, drafts included. */
export async function fetchMyBlogPosts(userId: string) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(COLS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as BlogPost[];
}

export async function createBlogPost(input: {
  userId: string;
  title: string;
  body: string;
  excerpt?: string | null;
  coverPath?: string | null;
  publish: boolean;
}) {
  const title = input.title.trim().slice(0, MAX_BLOG_TITLE);
  const body = input.body.trim().slice(0, MAX_BLOG_BODY);
  if (!title) throw new Error("Give your blog a title.");
  if (!body) throw new Error("Write something first.");
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      user_id: input.userId,
      title,
      body,
      slug: await uniqueSlug(input.userId, slugify(title)),
      excerpt: input.excerpt?.trim().slice(0, MAX_BLOG_EXCERPT) || null,
      cover_url: input.coverPath ?? null,
      published_at: input.publish ? new Date().toISOString() : null,
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return data as BlogPost;
}

async function uniqueSlug(userId: string, base: string) {
  const { data } = await supabase.from("blog_posts").select("slug").eq("user_id", userId);
  const taken = new Set((data ?? []).map((r) => r.slug));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

export async function updateBlogPost(
  id: string,
  patch: { title?: string; body?: string; excerpt?: string | null; coverPath?: string | null },
) {
  const next: Record<string, string | null> = {};
  if (patch.title !== undefined) {
    const title = patch.title.trim().slice(0, MAX_BLOG_TITLE);
    if (!title) throw new Error("Give your blog a title.");
    next["title"] = title;
  }
  if (patch.body !== undefined) {
    const body = patch.body.trim().slice(0, MAX_BLOG_BODY);
    if (!body) throw new Error("Write something first.");
    next["body"] = body;
  }
  if (patch.excerpt !== undefined)
    next["excerpt"] = patch.excerpt?.trim().slice(0, MAX_BLOG_EXCERPT) || null;
  if (patch.coverPath !== undefined) next["cover_url"] = patch.coverPath;
  const { error } = await supabase.from("blog_posts").update(next).eq("id", id);
  if (error) throw error;
}

export async function setBlogPublished(id: string, published: boolean) {
  const { error } = await supabase
    .from("blog_posts")
    .update({ published_at: published ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteBlogPost(post: Pick<BlogPost, "id" | "cover_url">) {
  const { error } = await supabase.from("blog_posts").delete().eq("id", post.id);
  if (error) throw error;
  if (post.cover_url && !/^https?:\/\//i.test(post.cover_url))
    await supabase.storage.from("blog-covers").remove([post.cover_url]);
}

export async function uploadBlogCover(userId: string, file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Please pick an image file.");
  if (file.size > MAX_COVER_BYTES) throw new Error("That image is larger than 8 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("blog-covers").upload(path, file);
  if (error) throw error;
  return path;
}

export async function signedCoverUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const { data, error } = await supabase.storage
    .from("blog-covers")
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Public reads (work signed in or not). */
export async function fetchPublishedBlogs(username?: string, limit = 30) {
  const { data, error } = await supabase.rpc("list_published_blogs", {
    ...(username ? { _username: username } : {}),
    _limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as PublishedBlogSummary[];
}

export async function fetchPublishedBlog(username: string, slug: string) {
  const { data, error } = await supabase.rpc("get_published_blog", {
    _username: username,
    _slug: slug,
  });
  if (error) throw error;
  return ((data ?? [])[0] ?? null) as PublishedBlog | null;
}

export async function fetchBlogComments(postId: string) {
  const { data, error } = await supabase.rpc("blog_comment_feed", { _post_id: postId });
  if (error) throw error;
  return (data ?? []) as BlogComment[];
}

export async function addBlogComment(postId: string, userId: string, body: string) {
  const text = body.trim().slice(0, MAX_BLOG_COMMENT);
  if (!text) throw new Error("Write a comment first.");
  const { error } = await supabase
    .from("blog_comments")
    .insert({ post_id: postId, user_id: userId, body: text });
  if (error) throw error;
}

export async function deleteBlogComment(id: string) {
  const { error } = await supabase.from("blog_comments").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchBlogLikes(postId: string) {
  const { data, error } = await supabase.from("blog_likes").select("user_id").eq("post_id", postId);
  if (error) throw error;
  return (data ?? []).map((r) => r.user_id);
}

export async function toggleBlogLike(postId: string, userId: string, liked: boolean) {
  if (liked) {
    const { error } = await supabase
      .from("blog_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("blog_likes").insert({ post_id: postId, user_id: userId });
  if (error) throw error;
}