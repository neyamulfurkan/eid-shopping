// src/context/LanguageContext.tsx
'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Language, SiteConfigMap, TranslationMap } from '@/lib/types';
import { buildTranslationMap, t as tUtil } from '@/lib/i18n';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const STORAGE_KEY = 'eid-lang';
const DEFAULT_LANG: Language = 'bn';

// ─────────────────────────────────────────────
// Context Shape
// ─────────────────────────────────────────────

interface LanguageContextValue {
  /** Currently active UI language. */
  lang: Language;
  /** Persist a new language preference to state and localStorage. */
  setLang: (l: Language) => void;
  /** Translate a dot-namespaced key using the active language. */
  t: (key: string) => string;
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const LanguageContext = createContext<LanguageContextValue | null>(null);

// ─────────────────────────────────────────────
// Provider Props
// ─────────────────────────────────────────────

interface LanguageProviderProps {
  children: ReactNode;
  /** Serialised SiteConfigMap passed from the root layout server component. */
  initialConfig: SiteConfigMap;
}

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

/**
 * Provides bilingual (Bengali / English) translation to the entire component tree.
 * Language preference is persisted in localStorage under 'eid-lang', defaulting
 * to Bengali ('bn') to match the Bangladeshi target market.
 * The translation map is built once from initialConfig and memoised.
 */
export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
  initialConfig,
}) => {
  // Initialise with the default language; localStorage hydration happens in useEffect
  // to avoid SSR/client mismatch.
  const [lang, setLangState] = useState<Language>(DEFAULT_LANG);

    // Re-built whenever initialConfig changes (driven by router.refresh() in admin forms,
  // which causes the server layout to re-fetch SiteConfig and pass a fresh initialConfig).
  const translationMap: TranslationMap = useMemo(
    () => buildTranslationMap(initialConfig),
    [initialConfig],
  );

  // Hydrate language preference from localStorage after mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'bn') {
        setLangState(stored);
      }
    } catch {
      // localStorage may be unavailable (private browsing, SSR guard). Fail silently.
    }
  }, []);

  /**
   * Updates the active language in state and persists the choice to localStorage.
   *
   * @param l - The new language to activate ('en' | 'bn').
   */
  const setLang = useCallback((l: Language) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // Fail silently if localStorage is unavailable.
    }
  }, []);

  /**
   * Translates a dot-namespaced key using the current language and translation map.
   * Never returns undefined — falls back to English, then to the raw key string.
   *
   * @param key - Translation key, e.g. 'btn.addToCart'.
   * @returns Resolved translation string.
   */
  const t = useCallback(
    (key: string): string => tUtil(translationMap, key, lang),
    [translationMap, lang],
  );

  const value: LanguageContextValue = useMemo(
    () => ({ lang, setLang, t }),
    [lang, setLang, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

/**
 * Returns the current language context value.
 * Must be used inside a LanguageProvider — throws a descriptive error otherwise.
 *
 * @returns { lang, setLang, t }
 */
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (ctx === null) {
    throw new Error('useLanguage must be used within a <LanguageProvider>.');
  }
  return ctx;
}