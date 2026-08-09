export type WaterPlace = { name: string; latitude: number; longitude: number };

export type WaterUpdate = {
  place: WaterPlace;
  rainNow: number;
  temperature: number | null;
  days: { date: string; precipitation: number; chance: number | null; discharge: number | null }[];
  dischargeNow: number | null;
  dischargeMean: number | null;
};

const STORAGE_KEY = "duechat:water-place";

export function loadWaterPlace(): WaterPlace | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WaterPlace) : null;
  } catch {
    return null;
  }
}

export function saveWaterPlace(place: WaterPlace) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(place));
  } catch {
    /* storage unavailable */
  }
}

export async function searchPlaces(query: string): Promise<WaterPlace[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not look up that place.");
  const json = (await res.json()) as {
    results?: {
      name: string;
      admin1?: string;
      country_code?: string;
      latitude: number;
      longitude: number;
    }[];
  };
  return (json.results ?? []).map((r) => ({
    name: [r.name, r.admin1, r.country_code].filter(Boolean).join(", "),
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<WaterPlace> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
    );
    if (res.ok) {
      const json = (await res.json()) as {
        city?: string;
        locality?: string;
        principalSubdivision?: string;
      };
      const label = [json.city || json.locality, json.principalSubdivision]
        .filter(Boolean)
        .join(", ");
      if (label) return { name: label, latitude, longitude };
    }
  } catch {
    /* fall through to coordinates */
  }
  return { name: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`, latitude, longitude };
}

/** Rainfall + river level outlook for a place, from the free Open-Meteo feeds. */
export async function fetchWaterUpdate(place: WaterPlace): Promise<WaterUpdate> {
  const { latitude, longitude } = place;
  const [forecastRes, floodRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=precipitation,rain,temperature_2m&daily=precipitation_sum,precipitation_probability_max&timezone=auto&forecast_days=4`,
    ),
    fetch(
      `https://flood-api.open-meteo.com/v1/flood?latitude=${latitude}&longitude=${longitude}&daily=river_discharge,river_discharge_mean&forecast_days=4`,
    ),
  ]);
  if (!forecastRes.ok) throw new Error("Water data is unavailable right now.");
  const forecast = (await forecastRes.json()) as {
    current?: { precipitation?: number; rain?: number; temperature_2m?: number };
    daily?: {
      time: string[];
      precipitation_sum: (number | null)[];
      precipitation_probability_max: (number | null)[];
    };
  };
  const flood = floodRes.ok
    ? ((await floodRes.json()) as {
        daily?: {
          time: string[];
          river_discharge: (number | null)[];
          river_discharge_mean: (number | null)[];
        };
      })
    : {};

  const times = forecast.daily?.time ?? [];
  const days = times.map((date, i) => {
    const fi = flood.daily?.time?.indexOf(date) ?? -1;
    return {
      date,
      precipitation: forecast.daily?.precipitation_sum?.[i] ?? 0,
      chance: forecast.daily?.precipitation_probability_max?.[i] ?? null,
      discharge: fi >= 0 ? (flood.daily?.river_discharge?.[fi] ?? null) : null,
    };
  });

  return {
    place,
    rainNow: forecast.current?.rain ?? forecast.current?.precipitation ?? 0,
    temperature: forecast.current?.temperature_2m ?? null,
    days,
    dischargeNow: flood.daily?.river_discharge?.[0] ?? null,
    dischargeMean: flood.daily?.river_discharge_mean?.[0] ?? null,
  };
}

export function mmToIn(mm: number) {
  return mm / 25.4;
}

/** Plain-language read on the river level compared with its seasonal normal. */
export function riverStatus(now: number | null, mean: number | null) {
  if (now == null || mean == null || mean === 0) return null;
  const ratio = now / mean;
  if (ratio >= 2) return { label: "Well above normal", tone: "high" as const };
  if (ratio >= 1.25) return { label: "Above normal", tone: "high" as const };
  if (ratio <= 0.6) return { label: "Below normal", tone: "low" as const };
  return { label: "Near normal", tone: "normal" as const };
}
