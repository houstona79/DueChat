import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Droplets, LocateFixed, MapPin, Search, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  fetchWaterUpdate,
  loadWaterPlace,
  mmToIn,
  riverStatus,
  saveWaterPlace,
  searchPlaces,
  type WaterPlace,
} from "@/lib/water";
import { cn } from "@/lib/utils";

const DEFAULT_PLACE: WaterPlace = {
  name: "Charlotte, NC, US",
  latitude: 35.2271,
  longitude: -80.8431,
};

function dayLabel(date: string) {
  const d = new Date(`${date}T12:00:00`);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export function WaterUpdates() {
  const [place, setPlace] = useState<WaterPlace>(DEFAULT_PLACE);
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WaterPlace[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const saved = loadWaterPlace();
    if (saved) setPlace(saved);
  }, []);

  const choose = (next: WaterPlace) => {
    setPlace(next);
    saveWaterPlace(next);
    setPicking(false);
    setQuery("");
    setResults([]);
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["water", place.latitude, place.longitude],
    queryFn: () => fetchWaterUpdate(place),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const found = await searchPlaces(query.trim());
      setResults(found);
      if (found.length === 0) toast.error("No place found by that name.");
    } catch {
      toast.error("Place lookup failed.");
    } finally {
      setSearching(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location isn't available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { reverseGeocode } = await import("@/lib/water");
        choose(await reverseGeocode(pos.coords.latitude, pos.coords.longitude));
      },
      () => toast.error("Location permission was blocked."),
      { timeout: 10_000 },
    );
  };

  const river = riverStatus(data?.dischargeNow ?? null, data?.dischargeMean ?? null);
  const todayRain = data?.days[0]?.precipitation ?? 0;

  return (
    <section className="mx-1 mb-2 mt-1 rounded-2xl bg-secondary/60 px-3 py-2.5">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Droplets className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Local water
          </span>
          <span className="block truncate text-sm">
            {isLoading
              ? "Checking conditions…"
              : isError
                ? "Data unavailable"
                : `${todayRain > 0 ? `${mmToIn(todayRain).toFixed(2)}" rain today` : "No rain today"}${
                    river ? ` · ${river.label}` : ""
                  }`}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{data?.place.name ?? place.name}</span>
            </span>
            <button
              onClick={() => setPicking((v) => !v)}
              className="shrink-0 rounded-lg px-2 py-1 font-medium text-primary hover:bg-secondary"
            >
              Change
            </button>
          </div>

          {picking ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-xl bg-background px-2.5 py-2">
                <Search className="size-4 text-muted-foreground" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void runSearch();
                  }}
                  placeholder="City or town"
                  aria-label="Search for a location"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  onClick={() => void runSearch()}
                  disabled={searching}
                  className="shrink-0 text-xs font-medium text-primary disabled:opacity-60"
                >
                  {searching ? "…" : "Go"}
                </button>
              </div>
              <button
                onClick={useMyLocation}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-xs text-muted-foreground hover:bg-secondary"
              >
                <LocateFixed className="size-3.5" aria-hidden /> Use my location
              </button>
              {results.map((r) => (
                <button
                  key={`${r.latitude},${r.longitude}`}
                  onClick={() => choose(r)}
                  className="block w-full truncate rounded-xl px-2 py-2 text-left text-sm hover:bg-secondary"
                >
                  {r.name}
                </button>
              ))}
            </div>
          ) : null}

          {data ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-background px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">Rain right now</p>
                  <p className="text-sm font-semibold">
                    {data.rainNow > 0 ? `${mmToIn(data.rainNow).toFixed(2)}"/hr` : "Dry"}
                  </p>
                </div>
                <div className="rounded-xl bg-background px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">River flow</p>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      river?.tone === "high" && "text-primary",
                      river?.tone === "low" && "text-muted-foreground",
                    )}
                  >
                    {data.dischargeNow != null ? `${data.dischargeNow.toFixed(1)} m³/s` : "—"}
                  </p>
                </div>
              </div>

              {river ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Waves className="size-3.5 shrink-0" aria-hidden />
                  {river.label} for nearby waterways
                  {data.dischargeMean != null
                    ? ` (normal ≈ ${data.dischargeMean.toFixed(1)} m³/s)`
                    : ""}
                </p>
              ) : null}

              <ul className="space-y-1">
                {data.days.map((d) => (
                  <li key={d.date} className="flex items-center gap-2 text-xs">
                    <span className="w-12 shrink-0 text-muted-foreground">{dayLabel(d.date)}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, (d.precipitation / 25) * 100)}%` }}
                      />
                    </span>
                    <span className="w-14 shrink-0 text-right tabular-nums">
                      {mmToIn(d.precipitation).toFixed(2)}"
                    </span>
                    <span className="w-9 shrink-0 text-right text-muted-foreground tabular-nums">
                      {d.chance != null ? `${d.chance}%` : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : isError ? (
            <p className="text-xs text-muted-foreground">
              Couldn't reach the water service. It'll retry shortly.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
