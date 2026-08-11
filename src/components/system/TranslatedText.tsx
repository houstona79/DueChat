import { Languages, Loader2 } from "lucide-react";
import { useState } from "react";

import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Renders user-written content in the reader's language.
 * `auto` follows the reader's auto-translate setting; otherwise a
 * "Translate" / "Show original" toggle is offered.
 */
export function TranslatedText({
  text,
  auto = false,
  className,
  showToggle = true,
}: {
  text: string;
  auto?: boolean;
  className?: string;
  showToggle?: boolean;
}) {
  const { language, autoTranslate, translate, translating, t } = useLanguage();
  const [manual, setManual] = useState(false);

  const off = language === "en" || !text.trim();
  const wants = !off && (manual || (auto && autoTranslate));
  const output = wants ? translate(text) : text;
  const changed = output !== text;

  return (
    <span className={className}>
      <span className="whitespace-pre-wrap">{output}</span>
      {off || !showToggle ? null : (
        <button
          type="button"
          onClick={() => setManual((v) => !v)}
          className={cn(
            "mt-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground underline-offset-2 hover:underline",
          )}
        >
          {wants && translating && !changed ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          ) : (
            <Languages className="h-3 w-3" aria-hidden="true" />
          )}
          {manual ? t("Show original") : t("Translate")}
        </button>
      )}
      {wants && changed ? <span className="sr-only">{t("Machine translated")}</span> : null}
    </span>
  );
}