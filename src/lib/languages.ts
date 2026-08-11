export type LanguageDef = {
  /** BCP-47 primary code. */
  code: string;
  /** English name. */
  name: string;
  /** Endonym shown in the picker. */
  native: string;
  /** Right-to-left script. */
  rtl?: boolean;
  /** Part of the "popular" shortlist at the top of the picker. */
  popular?: boolean;
};

export const LANGUAGES: LanguageDef[] = [
  { code: "en", name: "English", native: "English", popular: true },
  { code: "es", name: "Spanish", native: "Español", popular: true },
  { code: "fr", name: "French", native: "Français", popular: true },
  { code: "de", name: "German", native: "Deutsch", popular: true },
  { code: "pt", name: "Portuguese", native: "Português", popular: true },
  { code: "ar", name: "Arabic", native: "العربية", rtl: true, popular: true },
  { code: "hi", name: "Hindi", native: "हिन्दी", popular: true },
  { code: "zh", name: "Chinese (Simplified)", native: "简体中文", popular: true },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "da", name: "Danish", native: "Dansk" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "fa", name: "Persian", native: "فارسی", rtl: true },
  { code: "fil", name: "Filipino", native: "Filipino" },
  { code: "he", name: "Hebrew", native: "עברית", rtl: true },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "ur", name: "Urdu", native: "اردو", rtl: true },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "zh-TW", name: "Chinese (Traditional)", native: "繁體中文" },
];

export const DEFAULT_LANGUAGE = "en";

export function findLanguage(code: string | null | undefined) {
  if (!code) return null;
  return LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase()) ?? null;
}

export function isRtl(code: string | null | undefined) {
  return Boolean(findLanguage(code)?.rtl);
}

export function languageLabel(code: string | null | undefined) {
  const lang = findLanguage(code);
  return lang ? `${lang.native} (${lang.name})` : (code ?? DEFAULT_LANGUAGE);
}

/** Best guess for a first-time visitor, from the browser's languages. */
export function detectBrowserLanguage(): string {
  if (typeof navigator === "undefined") return DEFAULT_LANGUAGE;
  const candidates = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
  for (const raw of candidates as string[]) {
    const exact = findLanguage(raw);
    if (exact) return exact.code;
    const base = findLanguage(raw.split("-")[0]!);
    if (base) return base.code;
  }
  return DEFAULT_LANGUAGE;
}