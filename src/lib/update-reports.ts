import { supabase } from "@/integrations/supabase/client";

export const REPORT_REASONS = [
  "Harassment or bullying",
  "Hate speech",
  "Sexual content",
  "Violence or threats",
  "Spam or scam",
  "Self-harm",
  "Other",
] as const;

export const MAX_REPORT_DETAILS = 500;

export type ReportStatus = "pending" | "reviewed" | "dismissed";

export type UpdateReport = {
  id: string;
  update_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  update_body: string | null;
  update_author_id: string | null;
  reporter_name: string | null;
  author_name: string | null;
};

export async function reportProfileUpdate(input: {
  updateId: string;
  reporterId: string;
  reason: string;
  details?: string;
}) {
  const { error } = await supabase.from("update_reports").insert({
    update_id: input.updateId,
    reporter_id: input.reporterId,
    reason: input.reason,
    details: input.details?.trim().slice(0, MAX_REPORT_DETAILS) || null,
  });
  if (error) {
    if (error.code === "23505" || error.message.includes("duplicate")) {
      throw new Error("You already reported this update.");
    }
    throw error;
  }
}

export async function fetchMyReportedUpdateIds(reporterId: string) {
  const { data, error } = await supabase
    .from("update_reports")
    .select("update_id")
    .eq("reporter_id", reporterId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.update_id));
}

export async function fetchUpdateReports(): Promise<UpdateReport[]> {
  const { data, error } = await supabase
    .from("update_reports")
    .select(
      "id,update_id,reporter_id,reason,details,status,reviewed_by,reviewed_at,created_at,profile_updates(body,user_id)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []) as Array<
    Omit<UpdateReport, "update_body" | "update_author_id" | "reporter_name" | "author_name"> & {
      profile_updates: { body: string; user_id: string } | null;
    }
  >;

  const ids = new Set<string>();
  for (const r of rows) {
    ids.add(r.reporter_id);
    if (r.profile_updates?.user_id) ids.add(r.profile_updates.user_id);
  }
  const names = new Map<string, string>();
  if (ids.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,display_name,username")
      .in("id", [...ids]);
    for (const p of profiles ?? []) names.set(p.id, p.display_name || p.username);
  }

  return rows.map((r) => ({
    id: r.id,
    update_id: r.update_id,
    reporter_id: r.reporter_id,
    reason: r.reason,
    details: r.details,
    status: r.status,
    reviewed_by: r.reviewed_by,
    reviewed_at: r.reviewed_at,
    created_at: r.created_at,
    update_body: r.profile_updates?.body ?? null,
    update_author_id: r.profile_updates?.user_id ?? null,
    reporter_name: names.get(r.reporter_id) ?? null,
    author_name: r.profile_updates?.user_id ? (names.get(r.profile_updates.user_id) ?? null) : null,
  }));
}

export async function resolveUpdateReport(
  id: string,
  status: Exclude<ReportStatus, "pending">,
  reviewerId: string,
) {
  const { error } = await supabase
    .from("update_reports")
    .update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteReportedUpdate(updateId: string) {
  const { error } = await supabase.from("profile_updates").delete().eq("id", updateId);
  if (error) throw error;
}

export async function fetchAutoHideThreshold() {
  const { data, error } = await supabase
    .from("moderation_settings")
    .select("auto_hide_threshold")
    .maybeSingle();
  if (error) throw error;
  return data?.auto_hide_threshold ?? 3;
}

export async function setAutoHideThreshold(value: number) {
  const threshold = Math.min(100, Math.max(1, Math.round(value)));
  const { error } = await supabase
    .from("moderation_settings")
    .update({ auto_hide_threshold: threshold })
    .eq("id", true);
  if (error) throw error;
  return threshold;
}
