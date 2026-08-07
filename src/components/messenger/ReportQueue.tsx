import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, EyeOff, Flag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { siteRoleOf, useSiteRoles } from "@/hooks/use-roles";
import { relativeTime } from "@/lib/profile-updates";
import {
  type ReportStatus,
  deleteReportedUpdate,
  fetchAutoHideThreshold,
  fetchUpdateReports,
  resolveUpdateReport,
  setAutoHideThreshold,
} from "@/lib/update-reports";

const FILTERS: Array<ReportStatus | "all"> = ["pending", "reviewed", "dismissed", "all"];

export function ReportQueue() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ReportStatus | "all">("pending");
  const { data: roles } = useSiteRoles();
  const isAdmin = user ? siteRoleOf(roles, user.id) === "admin" : false;
  const [thresholdDraft, setThresholdDraft] = useState<string>("");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["update-reports"],
    queryFn: fetchUpdateReports,
    enabled: !!user,
  });

  const { data: threshold = 3 } = useQuery({
    queryKey: ["auto-hide-threshold"],
    queryFn: fetchAutoHideThreshold,
    enabled: !!user,
  });

  useEffect(() => {
    setThresholdDraft(String(threshold));
  }, [threshold]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["update-reports"] });

  useEffect(() => {
    const channel = supabase
      .channel("update-reports-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "update_reports" }, () =>
        void invalidate(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fail = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : "That moderation action failed.");

  const resolve = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Exclude<ReportStatus, "pending"> }) =>
      resolveUpdateReport(id, status, user!.id),
    onSuccess: () => {
      toast.success("Report updated.");
      return invalidate();
    },
    onError: fail,
  });

  const removeUpdate = useMutation({
    mutationFn: ({ id, updateId }: { id: string; updateId: string }) =>
      deleteReportedUpdate(updateId).then(() => resolveUpdateReport(id, "reviewed", user!.id)),
    onSuccess: () => {
      toast.success("Update removed.");
      return invalidate();
    },
    onError: fail,
  });

  const visible = reports.filter((r) => (filter === "all" ? true : r.status === filter));
  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const pendingByUpdate = new Map<string, number>();
  for (const r of reports) {
    if (r.status === "pending")
      pendingByUpdate.set(r.update_id, (pendingByUpdate.get(r.update_id) ?? 0) + 1);
  }

  const saveThreshold = useMutation({
    mutationFn: () => setAutoHideThreshold(Number(thresholdDraft)),
    onSuccess: (value) => {
      toast.success(`Updates now auto-hide at ${value} pending reports.`);
      return queryClient.invalidateQueries({ queryKey: ["auto-hide-threshold"] });
    },
    onError: fail,
  });

  return (
    <div className="mt-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Flag className="size-4 text-destructive" aria-hidden />
          Reported updates
          {pendingCount > 0 ? (
            <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground">
              {pendingCount} pending
            </span>
          ) : null}
        </p>
        <div className="ml-auto flex gap-1 rounded-xl bg-secondary p-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-2 py-1 text-xs font-medium capitalize ${
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 text-sm">
        <EyeOff className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-muted-foreground">
          Auto-hide updates once they reach
        </span>
        {isAdmin ? (
          <>
            <input
              type="number"
              min={1}
              max={100}
              value={thresholdDraft}
              onChange={(e) => setThresholdDraft(e.target.value)}
              aria-label="Pending reports needed to auto-hide an update"
              className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
            />
            <span className="text-muted-foreground">pending reports</span>
            <button
              type="button"
              disabled={
                saveThreshold.isPending ||
                !thresholdDraft ||
                Number(thresholdDraft) === threshold ||
                Number(thresholdDraft) < 1
              }
              onClick={() => saveThreshold.mutate()}
              className="ml-auto flex min-h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Check className="size-3.5" />
              Save
            </button>
          </>
        ) : (
          <span className="font-semibold">{threshold} pending reports</span>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading reports…</p>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Nothing in the queue.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold text-foreground">
                  {r.reason}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold capitalize ${
                    r.status === "pending"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {r.status}
                </span>
                <span>{relativeTime(r.created_at)}</span>
                {(pendingByUpdate.get(r.update_id) ?? 0) >= threshold ? (
                  <span className="flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 font-semibold text-destructive">
                    <EyeOff className="size-3" aria-hidden />
                    Auto-hidden
                  </span>
                ) : r.status === "pending" ? (
                  <span className="text-muted-foreground">
                    {pendingByUpdate.get(r.update_id) ?? 0}/{threshold} to auto-hide
                  </span>
                ) : null}
              </div>

              <p className="mt-2 whitespace-pre-line break-words rounded-xl bg-secondary px-3 py-2 text-sm">
                {r.update_body ?? "This update was already deleted."}
              </p>

              <p className="mt-2 text-xs text-muted-foreground">
                By <span className="font-medium text-foreground">{r.author_name ?? "unknown"}</span> ·
                reported by{" "}
                <span className="font-medium text-foreground">{r.reporter_name ?? "unknown"}</span>
              </p>
              {r.details ? (
                <p className="mt-1 break-words text-xs italic text-muted-foreground">“{r.details}”</p>
              ) : null}

              {r.status === "pending" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!r.update_body || removeUpdate.isPending}
                    onClick={() => removeUpdate.mutate({ id: r.id, updateId: r.update_id })}
                    className="flex min-h-9 items-center gap-1.5 rounded-xl bg-destructive px-3 text-xs font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                    Remove update
                  </button>
                  <button
                    type="button"
                    disabled={resolve.isPending}
                    onClick={() => resolve.mutate({ id: r.id, status: "reviewed" })}
                    className="flex min-h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                  >
                    <Check className="size-3.5" />
                    Mark reviewed
                  </button>
                  <button
                    type="button"
                    disabled={resolve.isPending}
                    onClick={() => resolve.mutate({ id: r.id, status: "dismissed" })}
                    className="flex min-h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground hover:bg-secondary disabled:opacity-50"
                  >
                    <X className="size-3.5" />
                    Dismiss
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
