import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Newspaper, Send, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "./Avatar";
import { openProfile } from "./ProfileViewer";
import { MessageVideo, videoEmbedOf } from "./MessageVideo";
import { relativeTime } from "@/lib/profile-updates";
import {
  MAX_COMMENT_LENGTH,
  MAX_POST_LENGTH,
  addPostComment,
  createRoomPost,
  deletePostComment,
  deleteRoomPost,
  fetchPostComments,
  fetchPostLikes,
  fetchRoomPosts,
  togglePostLike,
} from "@/lib/room-feed";
import { nameColorStyle, siteRoleOf, siteRoleTextClass, useSiteRoles } from "@/hooks/use-roles";
import { accentFor, isOnline, type Profile } from "@/lib/chat";
import { cn } from "@/lib/utils";

function imageUrlOf(url: string | null) {
  if (!url) return null;
  return /\.(png|jpe?g|gif|webp|avif)$/i.test(new URL(url).pathname) ||
    /klipy\.(com|co)$/i.test(new URL(url).hostname)
    ? url
    : null;
}

export function RoomFeed({
  roomId,
  meId,
  profiles,
  canModerate,
  onClose,
}: {
  roomId: string;
  meId: string;
  profiles: Profile[];
  canModerate: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: siteRoles } = useSiteRoles();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["room-posts", roomId],
    queryFn: () => fetchRoomPosts(roomId),
  });
  const postIds = posts.map((p) => p.id);
  const { data: likes = [] } = useQuery({
    queryKey: ["room-post-likes", roomId, postIds.join(",")],
    queryFn: () => fetchPostLikes(postIds),
    enabled: postIds.length > 0,
  });
  const { data: comments = [] } = useQuery({
    queryKey: ["room-post-comments", roomId, postIds.join(",")],
    queryFn: () => fetchPostComments(postIds),
    enabled: postIds.length > 0,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["room-posts", roomId] });
    await queryClient.invalidateQueries({ queryKey: ["room-post-likes", roomId] });
    await queryClient.invalidateQueries({ queryKey: ["room-post-comments", roomId] });
  };

  useEffect(() => {
    const channel = supabase
      .channel(`room-feed:${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_posts" }, () =>
        void refresh(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "room_post_likes" }, () =>
        void refresh(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "room_post_comments" }, () =>
        void refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const fail = (e: unknown, fallback: string) =>
    setError(e instanceof Error ? e.message : fallback);

  const post = useMutation({
    mutationFn: () => createRoomPost(roomId, meId, draft),
    onSuccess: () => {
      setDraft("");
      setError(null);
      return refresh();
    },
    onError: (e) => fail(e, "Couldn’t share that post."),
  });

  const like = useMutation({
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) => togglePostLike(id, meId, liked),
    onSuccess: () => refresh(),
    onError: (e) => fail(e, "Couldn’t update that like."),
  });

  const removePost = useMutation({
    mutationFn: (id: string) => deleteRoomPost(id),
    onSuccess: () => refresh(),
    onError: (e) => fail(e, "Couldn’t delete that post."),
  });

  const comment = useMutation({
    mutationFn: (postId: string) => addPostComment(postId, meId, commentDraft),
    onSuccess: () => {
      setCommentDraft("");
      return refresh();
    },
    onError: (e) => fail(e, "Couldn’t add that comment."),
  });

  const removeComment = useMutation({
    mutationFn: (id: string) => deletePostComment(id),
    onSuccess: () => refresh(),
    onError: (e) => fail(e, "Couldn’t delete that comment."),
  });

  const profileOf = (id: string) => profiles.find((p) => p.id === id);

  const Author = ({ userId, at }: { userId: string; at: string }) => {
    const author = profileOf(userId);
    const role = siteRoleOf(siteRoles, userId);
    return (
      <button
        type="button"
        onClick={() => openProfile(userId)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left hover:opacity-80"
      >
        <Avatar
          name={author?.display_name ?? "Someone"}
          accent={accentFor(userId)}
          avatarPath={author?.avatar_url ?? null}
          online={author ? isOnline(author) : false}
          size="sm"
        />
        <span className="min-w-0">
          <span
            className={cn("block truncate text-sm font-medium", siteRoleTextClass(role))}
            style={nameColorStyle(role, author?.name_color ?? null)}
          >
            {author?.display_name ?? "Someone"}
          </span>
          <span className="block text-[11px] text-muted-foreground">{relativeTime(at)}</span>
        </span>
      </button>
    );
  };

  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex w-full max-w-[92%] flex-col border-l border-border bg-sidebar pb-[env(safe-area-inset-bottom)] shadow-xl sm:max-w-sm">
      <header className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Newspaper className="size-4" aria-hidden />
          Room feed
        </h3>
        <button
          onClick={onClose}
          aria-label="Close room feed"
          className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim() || post.isPending) return;
          post.mutate();
        }}
        className="space-y-2 border-b border-border px-4 pb-4"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_POST_LENGTH))}
          rows={2}
          placeholder="Post something to the room…"
          aria-label="Write a post for this room"
          className="w-full resize-none rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            {draft.length}/{MAX_POST_LENGTH}
          </span>
          <button
            type="submit"
            disabled={!draft.trim() || post.isPending}
            className="flex min-h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            <Send className="size-4" />
            Share
          </button>
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading feed…</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No posts yet — share the first update with this room.
          </p>
        ) : (
          <ul className="space-y-3">
            {posts.map((p) => {
              const postLikes = likes.filter((l) => l.post_id === p.id);
              const liked = postLikes.some((l) => l.user_id === meId);
              const postComments = comments.filter((c) => c.post_id === p.id);
              const embed = videoEmbedOf(p.body);
              const image = !embed ? imageUrlOf(p.media_url) : null;
              const canDelete = p.user_id === meId || canModerate;
              return (
                <li key={p.id} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-start gap-2">
                    <Author userId={p.user_id} at={p.created_at} />
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => removePost.mutate(p.id)}
                        aria-label="Delete post"
                        className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : null}
                  </div>

                  {embed ? (
                    <div className="mt-2">
                      <MessageVideo video={embed} />
                    </div>
                  ) : image ? (
                    <img
                      src={image}
                      alt="Shared media"
                      loading="lazy"
                      className="mt-2 max-h-64 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <p className="mt-2 whitespace-pre-line break-words text-sm">{p.body}</p>
                  )}

                  <div className="mt-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => like.mutate({ id: p.id, liked })}
                      className={cn(
                        "flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium",
                        liked ? "text-primary" : "text-muted-foreground hover:bg-secondary",
                      )}
                      aria-label={liked ? "Remove like" : "Like post"}
                    >
                      <Heart className={cn("size-4", liked && "fill-current")} />
                      {postLikes.length}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCommentDraft("");
                        setOpenComments((v) => (v === p.id ? null : p.id));
                      }}
                      className="flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-secondary"
                      aria-label="Show comments"
                    >
                      <MessageCircle className="size-4" />
                      {postComments.length}
                    </button>
                  </div>

                  {openComments === p.id ? (
                    <div className="mt-2 space-y-2 border-t border-border pt-2">
                      {postComments.map((c) => {
                        const who = profileOf(c.user_id);
                        return (
                          <div key={c.id} className="flex items-start gap-2">
                            <p className="min-w-0 flex-1 break-words text-xs">
                              <button
                                type="button"
                                onClick={() => openProfile(c.user_id)}
                                className="font-semibold hover:underline"
                              >
                                {who?.display_name ?? "Someone"}
                              </button>{" "}
                              <span className="text-muted-foreground">{c.body}</span>
                            </p>
                            {c.user_id === meId || canModerate ? (
                              <button
                                type="button"
                                onClick={() => removeComment.mutate(c.id)}
                                aria-label="Delete comment"
                                className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!commentDraft.trim() || comment.isPending) return;
                          comment.mutate(p.id);
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          value={commentDraft}
                          onChange={(e) =>
                            setCommentDraft(e.target.value.slice(0, MAX_COMMENT_LENGTH))
                          }
                          placeholder="Write a comment…"
                          aria-label="Write a comment"
                          className="min-h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                        />
                        <button
                          type="submit"
                          disabled={!commentDraft.trim()}
                          className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-60"
                          aria-label="Send comment"
                        >
                          <Send className="size-3.5" />
                        </button>
                      </form>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
