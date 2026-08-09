import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { NotebookPen } from "lucide-react";
import { fetchPublishedBlogs } from "@/lib/blogs";
import { relativeTime } from "@/lib/profile-updates";
import { BlogCover } from "@/components/blogs/BlogCover";

/** Published blogs for one member, shown on their profile. */
export function ProfileBlogs({ username }: { username: string }) {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["published-blogs", username],
    queryFn: () => fetchPublishedBlogs(username, 10),
  });

  if (isLoading || posts.length === 0) return null;

  return (
    <section aria-label="Blog posts" className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <NotebookPen className="size-4 text-primary" aria-hidden />
        Blog
      </h3>
      <ul className="space-y-2">
        {posts.map((post) => (
          <li key={post.id}>
            <Link
              to="/blog/$username/$slug"
              params={{ username, slug: post.slug }}
              className="block rounded-2xl border border-border bg-card p-3 hover:border-primary"
            >
              <BlogCover path={post.cover_url} title={post.title} className="mb-2 h-28" />
              <p className="truncate text-sm font-semibold">{post.title}</p>
              {post.excerpt ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">{post.excerpt}</p>
              ) : null}
              <p className="mt-1 text-[11px] text-muted-foreground">
                {relativeTime(post.published_at)} · {post.like_count} likes ·{" "}
                {post.comment_count} comments
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}