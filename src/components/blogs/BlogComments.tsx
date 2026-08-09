import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Send, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Avatar } from "@/components/messenger/Avatar";
import { accentFor } from "@/lib/chat";
import { MAX_BLOG_COMMENT } from "@/lib/blog-types";
import {
  addBlogComment,
  deleteBlogComment,
  fetchBlogComments,
  fetchBlogLikes,
  toggleBlogLike,
} from "@/lib/blogs";
import { relativeTime } from "@/lib/profile-updates";
import { cn } from "@/lib/utils";

export function BlogComments({ postId }: { postId: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [draft, setDraft] = useState("");

  const { data: comments = [] } = useQuery({
    queryKey: ["blog-comments", postId],
    queryFn: () => fetchBlogComments(postId),
  });
  const { data: likes = [] } = useQuery({
    queryKey: ["blog-likes", postId],
    queryFn: () => fetchBlogLikes(postId),
  });

  const liked = user ? likes.includes(user.id) : false;

  const like = useMutation({
    mutationFn: () => toggleBlogLike(postId, user!.id, liked),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blog-likes", postId] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn’t save that."),
  });

  const comment = useMutation({
    mutationFn: () => addBlogComment(postId, user!.id, draft),
    onSuccess: () => {
      setDraft("");
      return queryClient.invalidateQueries({ queryKey: ["blog-comments", postId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn’t comment."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBlogComment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blog-comments", postId] }),
  });

  return (
    <section aria-label="Reactions and comments" className="mt-10 border-t border-border pt-6">
      <div className="flex items-center gap-3">
        {user ? (
          <button
            onClick={() => like.mutate()}
            disabled={like.isPending}
            aria-pressed={liked}
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-sm font-medium",
              liked
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-secondary",
            )}
          >
            <Heart className={cn("size-4", liked && "fill-current")} />
            {likes.length} {likes.length === 1 ? "like" : "likes"}
          </button>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Heart className="size-4" /> {likes.length} {likes.length === 1 ? "like" : "likes"}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </p>
      </div>

      {user ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            comment.mutate();
          }}
          className="mt-4 flex items-end gap-2"
        >
          <label className="sr-only" htmlFor="blog-comment">
            Write a comment
          </label>
          <textarea
            id="blog-comment"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_BLOG_COMMENT))}
            rows={2}
            placeholder="Say something…"
            className="min-h-11 flex-1 resize-y rounded-2xl border border-border bg-card px-3 py-2 text-base outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={comment.isPending || !draft.trim()}
            className="flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Send className="size-4" /> Post
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary hover:underline">
            Sign in
          </Link>{" "}
          to like or comment.
        </p>
      )}

      <ul className="mt-5 space-y-4">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar
              name={c.author_display_name}
              accent={accentFor(c.user_id)}
              avatarPath={c.author_avatar_url}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {c.author_display_name}{" "}
                <span className="font-normal text-muted-foreground">
                  @{c.author_username} · {relativeTime(c.created_at)}
                </span>
              </p>
              <p className="whitespace-pre-line break-words text-sm text-muted-foreground">
                {c.body}
              </p>
            </div>
            {user?.id === c.user_id ? (
              <button
                onClick={() => remove.mutate(c.id)}
                aria-label="Delete comment"
                className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </li>
        ))}
        {comments.length === 0 ? (
          <li className="text-sm text-muted-foreground">No comments yet.</li>
        ) : null}
      </ul>
    </section>
  );
}