/** Shared blog shapes used by both browser code and public server functions. */

export type BlogPost = {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string | null;
  cover_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublishedBlogSummary = {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_url: string | null;
  published_at: string;
  author_username: string;
  author_display_name: string;
  author_avatar_url: string | null;
  like_count: number;
  comment_count: number;
};

export type PublishedBlog = PublishedBlogSummary & { body: string };

export type BlogComment = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_username: string;
  author_display_name: string;
  author_avatar_url: string | null;
};

export const MAX_BLOG_TITLE = 120;
export const MAX_BLOG_BODY = 20000;
export const MAX_BLOG_EXCERPT = 240;
export const MAX_BLOG_COMMENT = 800;