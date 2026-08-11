import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CrownPeriod = "day" | "week" | "month";

export type RoomCrown = {
  room_id: string;
  slug: string;
  period: CrownPeriod;
  join_count: number;
};

export const CROWN_LABEL: Record<CrownPeriod, string> = {
  day: "Room of the day",
  week: "Room of the week",
  month: "Room of the month",
};

export const CROWN_SHORT: Record<CrownPeriod, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
};

const ORDER: CrownPeriod[] = ["month", "week", "day"];

/** Highest-value crown first (month > week > day). */
export function sortCrowns(crowns: RoomCrown[]) {
  return [...crowns].sort((a, b) => ORDER.indexOf(a.period) - ORDER.indexOf(b.period));
}

export function crownsById(crowns: RoomCrown[]) {
  const map = new Map<string, RoomCrown[]>();
  for (const crown of sortCrowns(crowns)) {
    const list = map.get(crown.room_id) ?? [];
    list.push(crown);
    map.set(crown.room_id, list);
  }
  return map;
}

export async function fetchRoomCrowns(): Promise<RoomCrown[]> {
  const { data, error } = await supabase.rpc("room_crowns");
  if (error) throw error;
  return (data ?? []) as RoomCrown[];
}

export function useRoomCrowns() {
  const { data } = useQuery({
    queryKey: ["room-crowns"],
    queryFn: fetchRoomCrowns,
    staleTime: 5 * 60 * 1000,
  });
  return crownsById(data ?? []);
}
