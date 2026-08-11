import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TranslateInput = z.object({
  texts: z.array(z.string().min(1).max(4000)).min(1).max(60),
  target: z.string().min(2).max(10),
});

export const translateBatch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TranslateInput.parse(input))
  .handler(async ({ data }) => {
    const { hashText, translateWithAi, isSupportedLanguage } = await import("./translate.server");
    const { DEFAULT_LANGUAGE } = await import("./languages");

    const target = data.target;
    if (!isSupportedLanguage(target) || target === DEFAULT_LANGUAGE) {
      return { translations: {} as Record<string, string> };
    }

    const unique = [...new Set(data.texts.map((t) => t.trim()).filter(Boolean))];
    const hashes = await Promise.all(unique.map((t) => hashText(t)));
    const byHash = new Map(hashes.map((h, i) => [h, unique[i]!]));

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const translations: Record<string, string> = {};

    const { data: cached } = await supabaseAdmin
      .from("translation_cache")
      .select("source_hash, translated_text")
      .eq("target_lang", target)
      .in("source_hash", hashes);

    for (const row of cached ?? []) {
      const source = byHash.get(row.source_hash);
      if (source) translations[source] = row.translated_text;
    }

    const missing = unique.filter((t) => !(t in translations));
    if (missing.length === 0) return { translations };

    const fresh = await translateWithAi(missing, target);
    const rows: {
      source_hash: string;
      target_lang: string;
      source_text: string;
      translated_text: string;
    }[] = [];

    for (const [source, translated] of Object.entries(fresh)) {
      translations[source] = translated;
      const index = unique.indexOf(source);
      const hash = index >= 0 ? hashes[index] : await hashText(source);
      if (!hash) continue;
      rows.push({
        source_hash: hash,
        target_lang: target,
        source_text: source,
        translated_text: translated,
      });
    }

    if (rows.length > 0) {
      await supabaseAdmin
        .from("translation_cache")
        .upsert(rows, { onConflict: "source_hash,target_lang" });
    }

    return { translations };
  });