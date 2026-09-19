'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  dictionaries,
  HTML_LANG,
  interpolate,
  isLanguagePreference,
  LANGUAGE_CHANGE_EVENT,
  LANGUAGE_STORAGE_KEY,
  type LanguagePreference,
  type MessageKey,
} from './translations';

function readStoredLanguage(): LanguagePreference {
  if (typeof window === 'undefined') return 'English';
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (!raw) return 'English';
    const parsed = JSON.parse(raw) as { preferences?: { language?: string } };
    const language = parsed.preferences?.language;
    return language && isLanguagePreference(language) ? language : 'English';
  } catch {
    return 'English';
  }
}

function applyHtmlLang(language: LanguagePreference) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = HTML_LANG[language];
}

export function notifyLanguageChange(language: string) {
  if (!isLanguagePreference(language)) return;
  applyHtmlLang(language);
  window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: language }));
}

export function persistAndNotifyLanguage(language: string) {
  if (!isLanguagePreference(language)) return;
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as { preferences?: Record<string, unknown> }) : {};
    parsed.preferences = { ...(parsed.preferences ?? {}), language };
    localStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Keep UI update even if storage fails.
  }
  notifyLanguageChange(language);
}

type TranslateFn = (key: MessageKey, vars?: Record<string, string | number>) => string;

const I18nContext = createContext<{
  language: LanguagePreference;
  t: TranslateFn;
} | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguagePreference>('English');

  useEffect(() => {
    const initial = readStoredLanguage();
    setLanguage(initial);
    applyHtmlLang(initial);

    const onChange = (event: Event) => {
      const next = (event as CustomEvent<string>).detail;
      if (isLanguagePreference(next)) {
        setLanguage(next);
        applyHtmlLang(next);
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY || event.key === null) {
        const stored = readStoredLanguage();
        setLanguage(stored);
        applyHtmlLang(stored);
      }
    };

    window.addEventListener(LANGUAGE_CHANGE_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const t = useCallback<TranslateFn>(
    (key, vars) => {
      const dict = dictionaries[language] ?? dictionaries.English;
      return interpolate(dict[key] ?? dictionaries.English[key] ?? key, vars);
    },
    [language]
  );

  const value = useMemo(() => ({ language, t }), [language, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
