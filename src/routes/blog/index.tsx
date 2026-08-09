import { createFileRoute, Link } from "@tanstack/react-router";
import { NotebookPen } from "lucide-react";
import { listPublicBlogs } from "@/lib/blogs.functions";
import { BlogCover } from "@/components/blogs/BlogCover";
import { relativeTime } from "@/lib/profile-updates";
import type { PublishedBlogSummary } from "@/lib/blog-types";

export const Route = createFileRoute("/blog/")({
  loader: () => listPublicBlogs({ data: { limit: 30 } }),
  head: () => ({
    meta: [
      { title: "DueChat Blogs — stories from the community" },
      {
        name: "description",
        content:
          "Read the newest blog posts written by DueChat members: room stories, guides, updates and more.",
      },
      { property: "og:title", content: "DueChat Blogs — stories from the community" },
      {
        property: "og:description",
        content: "Read the newest blog posts written by DueChat members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <p className="text-sm text-muted-foreground">Blogs couldn’t load right now.</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <p className="text-sm text-muted-foreground">Nothing here.</p>
    </main>
  ),
  component: BlogFeed,
});

function BlogFeed() {
  const posts = Route.useLoaderData();

  return (
    <main id="main-content" className="mx-auto max-w-3xl px-5 py-12">
      <header className="mb-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
          <NotebookPen className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-3xl font-semibold">DueChat Blogs</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Stories, guides and updates written by DueChat members.
        </p>
        <div className="mt-4 flex gap-3 text-sm">
          <Link to="/blogs" className="text-primary hover:underline">
            Write a blog
          </Link>
          <Link to="/chat" className="text-muted-foreground hover:underline">
            Open messenger
          </Link>
        </div>
      </header>

      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No blogs published yet.</p>
      ) : (
        <ul className="space-y-5">
          {posts.map((post: PublishedBlogSummary) => (
            <li key={post.id}>
              <Link
                to="/blog/$username/$slug"
                params={{ username: post.author_username, slug: post.slug }}
                className="block rounded-3xl border border-border bg-card p-5 hover:border-primary"
              >
                <BlogCover path={post.cover_url} title={post.title} className="mb-4 h-48" />
                <h2 className="text-xl font-semibold">{post.title}</h2>
                {post.excerpt ? (
                  <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
                ) : null}
                <p className="mt-3 text-xs text-muted-foreground">
                  {post.author_display_name} @{post.author_username} ·{" "}
                  {relativeTime(post.published_at)} · {post.like_count} likes ·{" "}
                  {post.comment_count} comments
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}