import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { DEFAULT_LANGUAGE, detectBrowserLanguage, findLanguage, isRtl } from "./languages";
import { translateBatch } from "./translate.functions";

const LANG_KEY = "duechat.lang";
const AUTO_KEY = "duechat.autotranslate";
const CACHE_PREFIX = "duechat.i18n.";

type Dict = Record<string, string>;

function readStore(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked — translations simply re-fetch */
  }
}

function readCache(lang: string): Dict {
  const raw = readStore(CACHE_PREFIX + lang);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Dict) : {};
  } catch {
    return {};
  }
}

type LanguageContextValue = {
  /** Active language code. */
  language: string;
  setLanguage: (code: string) => void;
  /** Auto-translate incoming chat messages. */
  autoTranslate: boolean;
  setAutoTranslate: (on: boolean) => void;
  rtl: boolean;
  /** Translate an English UI string; returns the source until the translation lands. */
  t: (text: string) => string;
  /** Translate arbitrary user content (messages, bios, posts). */
  translate: (text: string) => string;
  /** True while any batch is in flight. */
  translating: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const [autoTranslate, setAutoTranslateState] = useState(false);
  const [dict, setDict] = useState<Dict>({});
  const [translating, setTranslating] = useState(false);

  const pending = useRef<Set<string>>(new Set());
  const requested = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const langRef = useRef(language);
  langRef.current = language;

  // Hydrate from this device's preferences.
  useEffect(() => {
    const stored = readStore(LANG_KEY);
    const next = findLanguage(stored)?.code ?? detectBrowserLanguage();
    setLanguageState(next);
    setDict(next === DEFAULT_LANGUAGE ? {} : readCache(next));
    setAutoTranslateState(readStore(AUTO_KEY) === "true");
  }, []);

  // Reflect language + direction on <html> for screen readers and RTL layout.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = isRtl(language) ? "rtl" : "ltr";
  }, [language]);

  const flush = useCallback(() => {
    const lang = langRef.current;
    const texts = [...pending.current];
    pending.current.clear();
    if (lang === DEFAULT_LANGUAGE || texts.length === 0) return;

    setTranslating(true);
    void (async () => {
      try {
        for (let i = 0; i < texts.length; i += 50) {
          const slice = texts.slice(i, i + 50);
          const res = await translateBatch({ data: { texts: slice, target: lang } });
          const incoming = res.translations ?? {};
          if (langRef.current !== lang) return;
          if (Object.keys(incoming).length === 0) continue;
          setDict((prev) => {
            const merged = { ...prev, ...incoming };
            writeStore(CACHE_PREFIX + lang, JSON.stringify(merged));
            return merged;
          });
        }
      } catch {
        // Leave the source text visible; allow a later retry.
        for (const text of texts) requested.current.delete(text);
      } finally {
        setTranslating(false);
      }
    })();
  }, []);

  const enqueue = useCallback(
    (text: string) => {
      if (langRef.current === DEFAULT_LANGUAGE) return;
      if (requested.current.has(text)) return;
      requested.current.add(text);
      pending.current.add(text);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 200);
    },
    [flush],
  );

  const lookup = useCallback(
    (text: string) => {
      const source = text?.trim();
      if (!source || language === DEFAULT_LANGUAGE) return text;
      const hit = dict[source];
      if (hit) return text.replace(source, hit);
      enqueue(source);
      return text;
    },
    [dict, enqueue, language],
  );

  const setLanguage = useCallback((code: string) => {
    const next = findLanguage(code)?.code ?? DEFAULT_LANGUAGE;
    writeStore(LANG_KEY, next);
    requested.current = new Set();
    pending.current = new Set();
    setDict(next === DEFAULT_LANGUAGE ? {} : readCache(next));
    setLanguageState(next);
  }, []);

  const setAutoTranslate = useCallback((on: boolean) => {
    writeStore(AUTO_KEY, String(on));
    setAutoTranslateState(on);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      autoTranslate,
      setAutoTranslate,
      rtl: isRtl(language),
      t: lookup,
      translate: lookup,
      translating,
    }),
    [language, setLanguage, autoTranslate, setAutoTranslate, lookup, translating],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Safe fallback so components render outside the provider (e.g. tests).
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      autoTranslate: false,
      setAutoTranslate: () => {},
      rtl: false,
      t: (text: string) => text,
      translate: (text: string) => text,
      translating: false,
    } satisfies LanguageContextValue;
  }
  return ctx;
}

/** Shorthand for UI strings: const t = useT(); t("Send") */
export function useT() {
  return useLanguage().t;
}