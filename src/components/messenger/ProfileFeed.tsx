import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { siteRoleOf, useSiteRoles } from "@/hooks/use-roles";
import {
  MAX_UPDATE_LENGTH,
  deleteProfileUpdate,
  fetchProfileUpdates,
  postProfileUpdate,
  relativeTime,
} from "@/lib/profile-updates";

export function ProfileFeed({ userId, title = "Updates" }: { userId: string; title?: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: roles } = useSiteRoles();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const myRole = user ? siteRoleOf(roles, user.id) : null;
  const isStaff = myRole === "admin" || myRole === "moderator";
  const isMe = user?.id === userId;

  const { data: updates = [] } = useQuery({
    queryKey: ["profile-updates", userId],
    queryFn: () => fetchProfileUpdates(userId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["profile-updates", userId] });

  useEffect(() => {
    const channel = supabase
      .channel(`profile-updates:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profile_updates", filter: `user_id=eq.${userId}` },
        () => void invalidate(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const post = useMutation({
    mutationFn: () => postProfileUpdate(userId, draft),
    onSuccess: () => {
      setDraft("");
      setError(null);
      return invalidate();
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Couldn’t post that update."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProfileUpdate(id),
    onSuccess: () => invalidate(),
  });

  return (
    <section className="mt-4 space-y-3">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Megaphone className="size-3.5" aria-hidden />
        {title}
      </h3>

      {isMe ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim() || post.isPending) return;
            post.mutate();
          }}
          className="space-y-2"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_UPDATE_LENGTH))}
            rows={2}
            placeholder="Share an update…"
            className="w-full resize-none rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              {draft.length}/{MAX_UPDATE_LENGTH}
            </span>
            <button
              type="submit"
              disabled={!draft.trim() || post.isPending}
              className="flex min-h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              <Send className="size-4" />
              Post
            </button>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </form>
      ) : null}

      {updates.length === 0 ? (
        <p className="text-xs text-muted-foreground">No updates yet.</p>
      ) : (
        <ul className="space-y-2">
          {updates.map((u) => (
            <li key={u.id} className="group rounded-2xl bg-secondary px-3 py-2">
              <p className="whitespace-pre-line break-words text-sm">{u.body}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">{relativeTime(u.created_at)}</span>
                {isMe || isStaff ? (
                  <button
                    type="button"
                    onClick={() => remove.mutate(u.id)}
                    aria-label="Delete update"
                    className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-background hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
