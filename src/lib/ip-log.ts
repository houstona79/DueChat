import { supabase } from "@/integrations/supabase/client";

export type IpRecord = {
  id: string;
  user_id: string;
  ip: string;
  device_id: string | null;
  user_agent: string | null;
  is_vpn: boolean;
  network: string | null;
  created_at: string;
  updated_at: string;
};

/** Admin-only: every recorded IP address, most recently seen first. */
export async function fetchIpLog(): Promise<IpRecord[]> {
  const { data, error } = await supabase
    .from("user_ip_log")
    .select("id, user_id, ip, device_id, user_agent, is_vpn, network, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as IpRecord[];
}

/** Accounts that have been seen sharing an IP address. */
export function sharedIps(records: IpRecord[]) {
  const byIp = new Map<string, Set<string>>();
  for (const r of records) {
    const set = byIp.get(r.ip) ?? new Set<string>();
    set.add(r.user_id);
    byIp.set(r.ip, set);
  }
  return [...byIp.entries()]
    .filter(([, users]) => users.size > 1)
    .map(([ip, users]) => ({ ip, userIds: [...users] }));
}
