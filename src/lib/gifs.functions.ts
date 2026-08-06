import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/klipy";

export type GifItem = { id: string; title: string; url: string; width?: number; height?: number };

type KlipyFile = Record<string, Record<string, { url?: string; width?: number; height?: number }>>;

function pickUrl(file: KlipyFile | undefined) {
  if (!file) return null;
  const sizes = ["md", "sm", "xs", "hd", "400", "320", "240", ...Object.keys(file)];
  for (const size of sizes) {
    const variants = file[size];
    if (!variants) continue;
    for (const format of ["gif", "webp", "mp4", ...Object.keys(variants)]) {
      const v = variants[format];
      if (v?.url) return v;
    }
  }
  return null;
}

export const searchGifs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ query: z.string().trim().max(80).optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<GifItem[]> => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const klipyKey = process.env["KLIPY_API_KEY"];
    if (!lovableKey || !klipyKey) throw new Error("GIF search is not configured.");

    const query = data.query?.trim();
    const params = new URLSearchParams({
      customer_id: context.userId,
      per_page: "24",
      page: "1",
    });
    if (query) params.set("q", query);

    const res = await fetch(
      `${GATEWAY_URL}/gifs/${query ? "search" : "trending"}?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": klipyKey,
        },
      },
    );
    if (!res.ok) {
      const body = await res.text();
      console.error(`KLIPY request failed [${res.status}]: ${body}`);
      throw new Error(`GIF search failed [${res.status}]: ${body}`);
    }
    const json = (await res.json()) as {
      result?: boolean;
      data?: { data?: { id?: string | number; title?: string; slug?: string; file?: KlipyFile }[] };
    };
    if (!json.result) throw new Error("GIF search failed.");

    return (json.data?.data ?? []).flatMap((item) => {
      const picked = pickUrl(item.file);
      if (!picked?.url) return [];
      return [
        {
          id: String(item.id ?? picked.url),
          title: item.title ?? item.slug ?? "GIF",
          url: picked.url,
          width: picked.width,
          height: picked.height,
        },
      ];
    });
  });
