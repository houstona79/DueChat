import { LogOut, MessageSquare, X } from "lucide-react";
import { Avatar } from "./Avatar";
import { accentFor, isOnline, type Membership, type Profile } from "@/lib/chat";

export function MemberList({
  memberships,
  profiles,
  meId,
  onClose,
  onMessage,
  onLeave,
}: {
  memberships: Membership[];
  profiles: Profile[];
  meId: string;
  onClose: () => void;
  onMessage: (userId: string) => void;
  onLeave?: (() => void) | undefined;
}) {
  const members = memberships
    .map((m) => profiles.find((p) => p.id === m.user_id))
    .filter((p): p is Profile => Boolean(p))
    .sort((a, b) => Number(isOnline(b)) - Number(isOnline(a)));

  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex w-full max-w-[85%] flex-col border-l border-border bg-sidebar pb-[env(safe-area-inset-bottom)] shadow-xl sm:max-w-xs">
      <header className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h3 className="text-sm font-semibold">Members · {members.length}</h3>
        <button
          onClick={onClose}
          aria-label="Close members"
          className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
      </header>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {members.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-2xl px-2 py-2">
            <Avatar
              name={p.display_name}
              accent={accentFor(p.id)}
              avatarPath={p.avatar_url}
              online={isOnline(p)}
              size="sm"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {p.display_name}
                {p.id === meId ? " (you)" : ""}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                <span className={isOnline(p) ? "text-primary" : undefined}>
                  {isOnline(p) ? "Online" : "Offline"}
                </span>
                {" · "}
                {p.status_message || `@${p.username}`}
              </span>
            </span>
            {p.id === meId ? null : (
              <button
                onClick={() => onMessage(p.id)}
                aria-label={`Message ${p.display_name}`}
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary hover:bg-primary/25"
              >
                <MessageSquare className="size-4" />
              </button>
            )}
          </li>
        ))}
        {members.length === 0 ? (
          <li className="px-3 py-6 text-center text-xs text-muted-foreground">
            No members yet.
          </li>
        ) : null}
      </ul>
      {onLeave ? (
        <div className="border-t border-border p-3">
          <button
            onClick={onLeave}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/15 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/25"
          >
            <LogOut className="size-4" />
            Leave room
          </button>
        </div>
      ) : null}
    </aside>
  );
}
