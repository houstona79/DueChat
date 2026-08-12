import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { Avatar } from "@/components/messenger/Avatar";
import { supabase } from "@/integrations/supabase/client";
import { MAIL_DOMAIN } from "@/lib/chat";

type Row = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  mail_handle: string;
};

async function fetchMailHandles(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, mail_handle")
    .not("mail_handle", "is", null)
    .order("mail_handle", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Row[];
}

/** Staff view of every claimed @{MAIL_DOMAIN} mail handle. */
export function MailHandles() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-mail-handles"],
    queryFn: fetchMailHandles,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter(
      (r) =>
        r.mail_handle.toLowerCase().includes(q) ||
        r.username.toLowerCase().includes(q) ||
        r.display_name.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="mt-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Claimed {MAIL_DOMAIN} handles</p>
        <span className="text-[11px] text-muted-foreground">{rows.length} claimed</span>
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search handle or member"
        className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
      />

      {isLoading && <p className="text-sm text-muted-foreground">Loading handles…</p>}
      {error && (
        <p className="text-sm text-destructive">Could not load claimed handles right now.</p>
      )}
      {!isLoading && !error && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No members have claimed a handle yet.</p>
      )}

      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 ring-1 ring-border"
          >
            <Avatar name={r.display_name} url={r.avatar_url} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.display_name}</p>
              <p className="truncate text-[11px] text-muted-foreground">@{r.username}</p>
            </div>
            <a
              href={`mailto:${r.mail_handle}@${MAIL_DOMAIN}`}
              className="flex shrink-0 items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Mail className="size-3.5" />
              {r.mail_handle}@{MAIL_DOMAIN}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
