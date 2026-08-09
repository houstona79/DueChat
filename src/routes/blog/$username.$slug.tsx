import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { getPublicBlog } from "@/lib/blogs.functions";
import { BlogCover } from "@/components/blogs/BlogCover";
import { BlogComments } from "@/components/blogs/BlogComments";
import { relativeTime } from "@/lib/profile-updates";

export const Route = createFileRoute("/blog/$username/$slug")({
  loader: async ({ params }) => {
    const post = await getPublicBlog({
      data: { username: params.username, slug: params.slug },
    });
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.title} — DueChat Blog` : "DueChat Blog";
    const description =
      loaderData?.excerpt ??
      loaderData?.body.slice(0, 150) ??
      "A blog post written by a DueChat member.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  errorComponent: () => (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <p className="text-sm text-muted-foreground">This blog post couldn’t load.</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">Post not found</h1>
        <Link to="/blog" className="mt-3 inline-block text-sm text-primary hover:underline">
          Browse all blogs
        </Link>
      </div>
    </main>
  ),
  component: BlogPostPage,
});

function BlogPostPage() {
  const post = Route.useLoaderData();

  return (
    <main id="main-content" className="mx-auto max-w-2xl px-5 py-12">
      <Link
        to="/blog"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> All blogs
      </Link>
      <article className="mt-6">
        <BlogCover path={post.cover_url} title={post.title} className="mb-6 h-56 sm:h-72" />
        <h1 className="text-3xl font-semibold leading-tight">{post.title}</h1>
        <p className="mt-3 text-xs text-muted-foreground">
          {post.author_display_name} @{post.author_username} · {relativeTime(post.published_at)}
        </p>
        <div className="mt-6 whitespace-pre-line break-words text-base leading-relaxed text-muted-foreground">
          {post.body}
        </div>
      </article>
      <BlogComments postId={post.id} />
    </main>
  );
}