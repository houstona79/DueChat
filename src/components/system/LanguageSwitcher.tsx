import { Check, Languages } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/lib/i18n";
import { LANGUAGES, findLanguage } from "@/lib/languages";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { language, setLanguage, autoTranslate, setAutoTranslate, t } = useLanguage();
  const active = findLanguage(language);
  const popular = LANGUAGES.filter((l) => l.popular);
  const rest = LANGUAGES.filter((l) => !l.popular);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("Change language")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent",
          className,
        )}
      >
        <Languages className="h-4 w-4" aria-hidden="true" />
        <span className={showLabel ? "" : "sr-only"}>{active?.native ?? "English"}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[70vh] w-60 overflow-y-auto">
        <DropdownMenuLabel>{t("Language")}</DropdownMenuLabel>
        {popular.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={() => setLanguage(lang.code)}
            className="flex items-center justify-between gap-2"
          >
            <span>
              {lang.native}
              <span className="ml-1.5 text-xs text-muted-foreground">{lang.name}</span>
            </span>
            {language === lang.code ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("More languages")}</DropdownMenuLabel>
        {rest.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={() => setLanguage(lang.code)}
            className="flex items-center justify-between gap-2"
          >
            <span>
              {lang.native}
              <span className="ml-1.5 text-xs text-muted-foreground">{lang.name}</span>
            </span>
            {language === lang.code ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={autoTranslate}
          onCheckedChange={(value) => setAutoTranslate(Boolean(value))}
          disabled={language === "en"}
        >
          {t("Auto-translate chat messages")}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}