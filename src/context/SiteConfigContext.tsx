// src/context/SiteConfigContext.tsx
'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import type { SiteConfigMap } from '@/lib/types';

// ─────────────────────────────────────────────
// Context shapes
// ─────────────────────────────────────────────

const SiteConfigContext = createContext<SiteConfigMap | null>(null);

interface DarkModeContextValue {
  isDark: boolean;
  toggleDark: () => void;
  /**
   * false until the first client useEffect has run and localStorage has been
   * read. Components that render different icons based on isDark MUST check
   * hasMounted first and show a neutral placeholder until it is true — this
   * prevents the React hydration mismatch "Expected <circle> in <svg>".
   */
  hasMounted: boolean;
}

const DarkModeContext = createContext<DarkModeContextValue | null>(null);

// ─────────────────────────────────────────────
// CSS variable injection helpers
// ─────────────────────────────────────────────

/**
 * Maps SiteConfig theme keys to their corresponding CSS custom property names.
 */
const THEME_CSS_VAR_MAP: Record<string, string> = {
  'theme.primaryColor':   '--color-primary',
  'theme.secondaryColor': '--color-secondary',
  'theme.accentColor':    '--color-accent',
  'theme.bgColor':        '--color-bg',
  'theme.surfaceColor':   '--color-surface',
  'theme.textColor':      '--color-text',
};

/**
 * Injects all theme-related CSS custom properties onto document.documentElement.
 * @param config - The flat SiteConfigMap sourced from the database.
 */
function injectThemeCssVars(config: SiteConfigMap): void {
  const root = document.documentElement;

  for (const [configKey, cssVar] of Object.entries(THEME_CSS_VAR_MAP)) {
    const value = config[configKey];
    if (value) {
      root.style.setProperty(cssVar, value);
    }
  }

  root.style.setProperty(
    '--font-family',
    config['theme.fontFamily'] || 'Hind Siliguri',
  );
}

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

interface SiteConfigProviderProps {
  children: ReactNode;
  /** Serialised SiteConfigMap fetched server-side in the root layout. */
  initialConfig: SiteConfigMap;
}

/**
 * Provides the SiteConfigMap to all descendant client components and handles
 * CSS custom property injection for dynamic theming and dark mode management.
 *
 * WHY isDark starts as false (not read from localStorage in useState):
 * ─────────────────────────────────────────────────────────────────────
 * Next.js renders the page on the server where localStorage does not exist,
 * so the server always produces isDark=false → Moon icon SVG.
 *
 * If we read localStorage inside the useState initializer, the client's very
 * first render may produce isDark=true → Sun icon SVG — a different element
 * structure from the server HTML. React detects the mismatch during hydration
 * and throws: "Hydration failed… Expected <circle> in <svg>".
 *
 * Fix:
 *   1. Always start with isDark=false (matches server output exactly).
 *   2. A useEffect (client-only, runs after hydration) reads localStorage and
 *      calls setIsDark with the real persisted value.
 *   3. hasMounted flips to true in that same effect, signalling to consumers
 *      (e.g. Navbar) that it is safe to render the corrected icon.
 */
export const SiteConfigProvider: React.FC<SiteConfigProviderProps> = ({
  children,
  initialConfig,
}) => {
  const [config, setConfig] = useState<SiteConfigMap>(initialConfig);

  // Re-fetch the latest config from the server on client mount so any admin
  // changes saved after the last server render are immediately reflected.
  useEffect(() => {
    fetch('/api/site-config')
      .then((res) => res.json())
      .then(({ data }: { data: unknown }) => {
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          setConfig(data as SiteConfigMap);
        }
      })
      .catch(() => {
        // Fail silently — initialConfig remains the fallback.
      });
  }, []);

  // Always false on first render — matches server output exactly.
  // The useEffect below corrects this after hydration completes.
  const [isDark,     setIsDark]     = useState<boolean>(false);
  const [hasMounted, setHasMounted] = useState<boolean>(false);

  // ── Inject theme CSS vars on mount ─────────────────────────────────────
  useEffect(() => {
    injectThemeCssVars(config);
  }, [config]);

  // ── Resolve dark mode from localStorage after hydration ─────────────────
  // Runs once, client-side only. Reading localStorage here (not in useState)
  // guarantees server HTML and initial client HTML are identical.
  useEffect(() => {
    let resolved = false;
    try {
      const stored = localStorage.getItem('eid-dark-mode');
      if (stored !== null) {
        resolved = stored === 'true';          // explicit user choice wins
      } else {
        resolved = initialConfig['settings.darkModeDefault'] === 'true'; // admin default
      }
    } catch {
      resolved = initialConfig['settings.darkModeDefault'] === 'true';
    }

    setIsDark(resolved);
    setHasMounted(true);                       // safe to render correct icon now
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — run once after hydration only

  // ── Keep DOM class AND inline CSS vars in sync with isDark ───────────────
  // This is the ONLY place that touches the 'dark' class on <html>.
  //
  // WHY we set inline style vars here instead of relying on html.dark in CSS:
  // injectThemeCssVars() writes light-theme values as inline styles on <html>.
  // Inline styles always beat any stylesheet rule — so html.dark { } in
  // globals.css is permanently overridden and the dark colors never appear.
  // Fix: write dark values as inline styles too, and restore light values
  // from config when switching back.
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.setProperty('--color-bg',        '#121212');
      document.documentElement.style.setProperty('--color-surface',   '#1E1E1E');
      document.documentElement.style.setProperty('--color-text',      '#F5F5F5');
      document.documentElement.style.setProperty('--color-primary',   '#4CAF50');
      document.documentElement.style.setProperty('--color-secondary', '#FFB300');
      document.documentElement.style.setProperty('--color-accent',    '#FFD54F');
    } else {
      document.documentElement.classList.remove('dark');
      // Restore light theme from DB-sourced config
      injectThemeCssVars(config);
    }
    if (hasMounted) {
      try {
        localStorage.setItem('eid-dark-mode', String(isDark));
      } catch { /* ignore */ }
    }
  }, [isDark, hasMounted, config]);

  /**
   * Toggles dark mode. Always works — call from Navbar or any component.
   * State lives here so it is never out of sync across the app.
   */
  const toggleDark = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  return (
    <SiteConfigContext.Provider value={config}>
      <DarkModeContext.Provider value={{ isDark, toggleDark, hasMounted }}>
        {children}
      </DarkModeContext.Provider>
    </SiteConfigContext.Provider>
  );
};

// ─────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────

/**
 * Returns the current SiteConfigMap from context.
 * Must be called within a SiteConfigProvider subtree.
 */
export function useSiteConfig(): SiteConfigMap {
  const ctx = useContext(SiteConfigContext);
  if (ctx === null) {
    throw new Error('useSiteConfig must be used within SiteConfigProvider');
  }
  return ctx;
}

/**
 * Returns isDark state, a toggleDark function, and hasMounted.
 * Must be called within a SiteConfigProvider subtree.
 *
 * hasMounted usage in components:
 * @example
 * const { isDark, toggleDark, hasMounted } = useDarkMode();
 *
 * // onClick always works — never gate the click on hasMounted
 * <button onClick={toggleDark}>
 *   // Only gate the ICON on hasMounted to avoid hydration mismatch
 *   {!hasMounted
 *     ? <Moon className="opacity-0" />   // invisible SSR placeholder
 *     : isDark ? <Sun /> : <Moon />
 *   }
 * </button>
 */
export function useDarkMode(): DarkModeContextValue {
  const ctx = useContext(DarkModeContext);
  if (ctx === null) {
    throw new Error('useDarkMode must be used within SiteConfigProvider');
  }
  return ctx;
}