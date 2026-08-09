import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, NotebookPen, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth, useMyProfile } from "@/hooks/use-auth";
import { BlogCover } from "@/components/blogs/BlogCover";
import { MAX_BLOG_BODY, MAX_BLOG_EXCERPT, MAX_BLOG_TITLE } from "@/lib/blog-types";
import type { BlogPost } from "@/lib/blog-types";
import {
  createBlogPost,
  deleteBlogPost,
  fetchMyBlogPosts,
  setBlogPublished,
  updateBlogPost,
  uploadBlogCover,
} from "@/lib/blogs";
import { relativeTime } from "@/lib/profile-updates";

export const Route = createFileRoute("/_authenticated/blogs")({
  head: () => ({
    meta: [
      { title: "Write a blog — DueChat" },
      {
        name: "description",
        content: "Draft, publish and manage your DueChat blog posts with cover images.",
      },
      { property: "og:title", content: "Write a blog — DueChat" },
      {
        property: "og:description",
        content: "Draft, publish and manage your DueChat blog posts with cover images.",
      },
    ],
  }),
  component: BlogWriterPage,
});

function BlogWriterPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: me } = useMyProfile(user?.id);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: posts = [] } = useQuery({
    queryKey: ["my-blog-posts", user?.id],
    queryFn: () => fetchMyBlogPosts(user!.id),
    enabled: Boolean(user?.id),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["published-blogs"] });
    return queryClient.invalidateQueries({ queryKey: ["my-blog-posts", user?.id] });
  };

  const reset = () => {
    setEditing(null);
    setTitle("");
    setExcerpt("");
    setBody("");
    setCoverPath(null);
  };

  const startEdit = (post: BlogPost) => {
    setEditing(post);
    setTitle(post.title);
    setExcerpt(post.excerpt ?? "");
    setBody(post.body);
    setCoverPath(post.cover_url);
  };

  const save = useMutation({
    mutationFn: async (publish: boolean) => {
      if (!user) return;
      if (editing) {
        await updateBlogPost(editing.id, { title, body, excerpt, coverPath });
        if (publish && !editing.published_at) await setBlogPublished(editing.id, true);
        return;
      }
      await createBlogPost({ userId: user.id, title, body, excerpt, coverPath, publish });
    },
    onSuccess: async (_d, publish) => {
      toast.success(publish ? "Blog published." : "Draft saved.");
      reset();
      await invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn’t save."),
  });

  const togglePublish = useMutation({
    mutationFn: (post: BlogPost) => setBlogPublished(post.id, !post.published_at),
    onSuccess: invalidate,
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn’t update."),
  });

  const remove = useMutation({
    mutationFn: (post: BlogPost) => deleteBlogPost(post),
    onSuccess: async () => {
      reset();
      await invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn’t delete."),
  });

  const pickCover = async (file: File | undefined) => {
    if (!file || !user) return;
    setUploading(true);
    try {
      setCoverPath(await uploadBlogCover(user.id, file));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main id="main-content" className="mx-auto max-w-3xl px-5 py-8 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/chat"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back to rooms
        </Link>
        <Link to="/blog" className="text-sm text-primary hover:underline">
          Browse all blogs
        </Link>
      </div>

      <h1 className="mt-5 flex items-center gap-2 text-2xl font-semibold">
        <NotebookPen className="size-6 text-primary" aria-hidden />
        {editing ? "Edit blog" : "Write a blog"}
      </h1>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="mt-5 space-y-3 rounded-3xl border border-border bg-card p-5"
      >
        <div>
          <label htmlFor="blog-title" className="text-sm font-medium">
            Title
          </label>
          <input
            id="blog-title"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, MAX_BLOG_TITLE))}
            className="mt-1 h-11 w-full rounded-2xl border border-border bg-background px-3 text-base outline-none focus:border-primary"
            placeholder="What's it about?"
          />
        </div>
        <div>
          <label htmlFor="blog-excerpt" className="text-sm font-medium">
            Summary <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            id="blog-excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value.slice(0, MAX_BLOG_EXCERPT))}
            className="mt-1 h-11 w-full rounded-2xl border border-border bg-background px-3 text-base outline-none focus:border-primary"
            placeholder="One line shown in the blog feed"
          />
        </div>
        <div>
          <label htmlFor="blog-body" className="text-sm font-medium">
            Post
          </label>
          <textarea
            id="blog-body"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_BLOG_BODY))}
            rows={12}
            className="mt-1 w-full resize-y rounded-2xl border border-border bg-background px-3 py-2 text-base outline-none focus:border-primary"
            placeholder="Write your post…"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {body.length}/{MAX_BLOG_BODY} characters
          </p>
        </div>

        <div className="space-y-2">
          <BlogCover path={coverPath} title={title || "cover"} className="h-40" />
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl border border-border px-4 text-sm font-medium hover:bg-secondary">
              <ImagePlus className="size-4" aria-hidden />
              {uploading ? "Uploading…" : coverPath ? "Change cover" : "Add cover image"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => void pickCover(e.target.files?.[0])}
              />
            </label>
            {coverPath ? (
              <button
                type="button"
                onClick={() => setCoverPath(null)}
                className="h-11 rounded-2xl px-3 text-sm text-muted-foreground hover:bg-secondary"
              >
                Remove cover
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => save.mutate(true)}
            disabled={save.isPending}
            className="flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Save className="size-4" aria-hidden />
            {editing?.published_at ? "Save changes" : "Publish"}
          </button>
          <button
            type="button"
            onClick={() => save.mutate(false)}
            disabled={save.isPending}
            className="h-11 rounded-2xl border border-border px-5 text-sm font-medium hover:bg-secondary disabled:opacity-60"
          >
            Save draft
          </button>
          {editing ? (
            <button
              type="button"
              onClick={reset}
              className="h-11 rounded-2xl px-4 text-sm text-muted-foreground hover:bg-secondary"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <h2 className="mt-8 text-lg font-semibold">Your posts</h2>
      <ul className="mt-3 space-y-2">
        {posts.map((post) => (
          <li
            key={post.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{post.title}</p>
              <p className="text-xs text-muted-foreground">
                {post.published_at
                  ? `Published ${relativeTime(post.published_at)}`
                  : `Draft · saved ${relativeTime(post.updated_at)}`}
              </p>
            </div>
            {post.published_at && me ? (
              <Link
                to="/blog/$username/$slug"
                params={{ username: me.username, slug: post.slug }}
                className="text-sm text-primary hover:underline"
              >
                View
              </Link>
            ) : null}
            <button
              onClick={() => startEdit(post)}
              className="rounded-xl border border-border px-3 py-1.5 text-sm hover:bg-secondary"
            >
              Edit
            </button>
            <button
              onClick={() => togglePublish.mutate(post)}
              className="rounded-xl border border-border px-3 py-1.5 text-sm hover:bg-secondary"
            >
              {post.published_at ? "Unpublish" : "Publish"}
            </button>
            <button
              onClick={() => remove.mutate(post)}
              aria-label={`Delete ${post.title}`}
              className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
        {posts.length === 0 ? (
          <li className="text-sm text-muted-foreground">You haven’t written any blogs yet.</li>
        ) : null}
      </ul>
    </main>
  );
}