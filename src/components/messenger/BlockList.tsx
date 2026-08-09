import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserX, X } from "lucide-react";
import { Avatar } from "./Avatar";
import { useBlocks, useProfiles } from "@/hooks/use-chat";
import { blockUser, unblockUser } from "@/lib/blocks";
import { accentFor } from "@/lib/chat";

/** Manage who is blocked: blocked people's messages are hidden from you. */
export function BlockList({ meId }: { meId: string }) {
  const queryClient = useQueryClient();
  const { data: blocks = [] } = useBlocks(meId);
  const { data: profiles = [] } = useProfiles();
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const blockedIds = useMemo(() => new Set(blocks.map((b) => b.blocked_id)), [blocks]);
  const blocked = profiles.filter((p) => blockedIds.has(p.id));

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return profiles
      .filter((p) => p.id !== meId && !blockedIds.has(p.id))
      .filter((p) => (p.display_name + p.username).toLowerCase().includes(term))
      .slice(0, 6);
  }, [profiles, blockedIds, meId, search]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["blocks"] });

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Block list</h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Blocked people can't be seen in your chats — their messages are hidden from you.
      </p>

      <label htmlFor="block-search" className="mt-3 block text-[11px] font-medium text-muted-foreground">
        Block someone
      </label>
      <input
        id="block-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or handle"
        className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
      />
      {candidates.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {candidates.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await blockUser(meId, p.id);
                    await refresh();
                    setSearch("");
                    setMessage(`${p.display_name} is blocked.`);
                  } catch {
                    setMessage("Could not block that person.");
                  }
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-secondary"
              >
                <Avatar name={p.display_name} accent={accentFor(p.id)} avatarPath={p.avatar_url} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{p.display_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">@{p.username}</span>
                </span>
                <UserX className="size-4 shrink-0 text-destructive" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <ul className="mt-3 space-y-1">
        {blocked.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-xl bg-secondary/50 px-2 py-1.5">
            <Avatar name={p.display_name} accent={accentFor(p.id)} avatarPath={p.avatar_url} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{p.display_name}</span>
              <span className="block truncate text-xs text-muted-foreground">@{p.username}</span>
            </span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await unblockUser(meId, p.id);
                  await refresh();
                  setMessage(`${p.display_name} is unblocked.`);
                } catch {
                  setMessage("Could not unblock that person.");
                }
              }}
              aria-label={`Unblock ${p.display_name}`}
              className="shrink-0 rounded-lg bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
        {blocked.length === 0 ? (
          <li className="px-1 py-2 text-xs text-muted-foreground">You haven't blocked anyone.</li>
        ) : null}
      </ul>
      {message ? <p className="mt-2 text-[11px] text-muted-foreground">{message}</p> : null}
    </section>
  );
}
