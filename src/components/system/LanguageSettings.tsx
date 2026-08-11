import { Languages } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/languages";

/** Per-device language and auto-translate preferences. */
export function LanguageSettings() {
  const { language, setLanguage, autoTranslate, setAutoTranslate, t } = useLanguage();

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Languages className="size-4" aria-hidden="true" />
        {t("Language & translation")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("Applies to this device. Translations are machine generated.")}
      </p>

      <div className="mt-4 grid gap-2">
        <Label htmlFor="app-language">{t("Display language")}</Label>
        <select
          id="app-language"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.native} — {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="auto-translate">{t("Auto-translate chat messages")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("Incoming room and direct messages are translated as they arrive.")}
          </p>
        </div>
        <Switch
          id="auto-translate"
          checked={autoTranslate}
          disabled={language === "en"}
          onCheckedChange={setAutoTranslate}
        />
      </div>
    </section>
  );
}