// src/components/admin/ThemeEditor.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Palette, Type, Eye, Save } from 'lucide-react';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { THEME_PRESETS } from '@/lib/types';
import type { SiteConfigMap, ThemePreset } from '@/lib/types';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: 'Hind Siliguri', label: 'Hind Siliguri (Bengali + Latin)' },
  { value: 'Noto Sans Bengali', label: 'Noto Sans Bengali' },
  { value: 'Baloo Da 2', label: 'Baloo Da 2' },
  { value: 'Kalpurush', label: 'Kalpurush' },
  { value: 'Inter', label: 'Inter (Latin only)' },
  { value: 'Poppins', label: 'Poppins (Latin only)' },
];

const COLOR_FIELDS: {
  key: keyof ThemeState;
  configKey: string;
  label: string;
}[] = [
  { key: 'primaryColor',   configKey: 'theme.primaryColor',   label: 'Primary' },
  { key: 'secondaryColor', configKey: 'theme.secondaryColor', label: 'Secondary' },
  { key: 'accentColor',    configKey: 'theme.accentColor',    label: 'Accent' },
  { key: 'bgColor',        configKey: 'theme.bgColor',        label: 'Background' },
  { key: 'surfaceColor',   configKey: 'theme.surfaceColor',   label: 'Surface' },
  { key: 'textColor',      configKey: 'theme.textColor',      label: 'Text' },
];

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ThemeState {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  surfaceColor: string;
  textColor: string;
  fontFamily: string;
}

interface ThemeEditorProps {
  initialConfig: SiteConfigMap;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Extracts theme values from a SiteConfigMap, falling back to the Green-Gold preset.
 * @param config - Flat SiteConfigMap from the database.
 * @returns A fully-populated ThemeState object.
 */
function themeStateFromConfig(config: SiteConfigMap): ThemeState {
  const fallback = THEME_PRESETS[0];
  return {
    primaryColor:   config['theme.primaryColor']   || fallback.primaryColor,
    secondaryColor: config['theme.secondaryColor'] || fallback.secondaryColor,
    accentColor:    config['theme.accentColor']    || fallback.accentColor,
    bgColor:        config['theme.bgColor']        || fallback.bgColor,
    surfaceColor:   config['theme.surfaceColor']   || fallback.surfaceColor,
    textColor:      config['theme.textColor']      || fallback.textColor,
    fontFamily:     config['theme.fontFamily']     || 'Hind Siliguri',
  };
}

// ─────────────────────────────────────────────
// Live Preview Sub-component
// ─────────────────────────────────────────────

interface LivePreviewProps {
  theme: ThemeState;
}

/**
 * LivePreview — miniature storefront mock styled with current theme state.
 * Uses inline CSS custom properties so it is completely isolated from the real theme.
 */
const LivePreview: React.FC<LivePreviewProps> = ({ theme }) => (
  <div
    className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm select-none"
    style={{
      '--preview-primary':   theme.primaryColor,
      '--preview-secondary': theme.secondaryColor,
      '--preview-accent':    theme.accentColor,
      '--preview-bg':        theme.bgColor,
      '--preview-surface':   theme.surfaceColor,
      '--preview-text':      theme.textColor,
      fontFamily:            theme.fontFamily,
    } as React.CSSProperties}
  >
    {/* Mock navbar */}
    <div
      className="flex items-center justify-between px-3 py-2"
      style={{ backgroundColor: 'var(--preview-primary)' }}
    >
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-white/30" />
        <span className="text-white text-xs font-semibold">Store</span>
      </div>
      <div className="flex gap-2">
        {['Products', 'Blog'].map((label) => (
          <span key={label} className="text-white/70 text-xs">{label}</span>
        ))}
      </div>
    </div>

    {/* Mock page body */}
    <div
      className="p-3 space-y-3"
      style={{ backgroundColor: 'var(--preview-bg)', color: 'var(--preview-text)' }}
    >
      {/* Section heading */}
      <div className="flex items-center gap-1.5">
        <div
          className="w-1 h-4 rounded"
          style={{ backgroundColor: 'var(--preview-accent)' }}
        />
        <span className="text-xs font-semibold" style={{ color: 'var(--preview-text)' }}>
          Featured Products
        </span>
      </div>

      {/* Mock product cards */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: 'var(--preview-surface)' }}
          >
            <div
              className="h-10"
              style={{
                background: `linear-gradient(135deg, var(--preview-secondary), var(--preview-accent))`,
                opacity: 0.7 + i * 0.1,
              }}
            />
            <div className="p-1.5 space-y-1">
              <div
                className="h-1.5 rounded w-4/5"
                style={{ backgroundColor: 'var(--preview-text)', opacity: 0.5 }}
              />
              <div
                className="h-1 rounded w-3/5"
                style={{ backgroundColor: 'var(--preview-primary)', opacity: 0.7 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Mock CTA button */}
      <div
        className="rounded-lg px-3 py-1.5 text-center text-xs font-semibold text-white w-fit mx-auto"
        style={{ backgroundColor: 'var(--preview-primary)' }}
      >
        Shop Now
      </div>

      {/* Accent strip */}
      <div
        className="h-1 rounded-full w-full"
        style={{
          background: `linear-gradient(to right, var(--preview-primary), var(--preview-accent))`,
        }}
      />
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

/**
 * ThemeEditor — admin panel component for editing the storefront's visual theme.
 *
 * Provides:
 * - Individual ColorPicker controls for all six theme colour tokens.
 * - One-click preset application (Green-Gold, Luxury Pink, Minimalist White).
 * - A font family selector for the six supported Google Fonts.
 * - A live preview panel reflecting changes before saving.
 * - A save button that PATCHes /api/site-config and reloads to apply new CSS variables.
 *
 * @param initialConfig - The current SiteConfigMap fetched server-side.
 */
export const ThemeEditor: React.FC<ThemeEditorProps> = ({ initialConfig }) => {
  const { showToast } = useToast();
  const router = useRouter();

  const [theme, setTheme] = useState<ThemeState>(() =>
    themeStateFromConfig(initialConfig),
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // ── Handlers ─────────────────────────────────────────────────────────────

  /**
   * Updates a single colour field in the theme state.
   * @param key - The ThemeState key to update.
   * @param value - The new hex colour string.
   */
  const handleColorChange = useCallback(
    (key: keyof ThemeState, value: string): void => {
      setTheme((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  /**
   * Applies a built-in preset, replacing all colour fields at once.
   * @param preset - The ThemePreset to apply.
   */
  const handleApplyPreset = useCallback((preset: ThemePreset): void => {
    setTheme((prev) => ({
      ...prev,
      primaryColor:   preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      accentColor:    preset.accentColor,
      bgColor:        preset.bgColor,
      surfaceColor:   preset.surfaceColor,
      textColor:      preset.textColor,
    }));
  }, []);

  /**
   * Handles font family selection from the <select> element.
   * @param e - The native change event.
   */
  const handleFontChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>): void => {
      setTheme((prev) => ({ ...prev, fontFamily: e.target.value }));
    },
    [],
  );

  /**
   * PATCHes all theme.* keys to /api/site-config and triggers a page reload
   * after 1 second to apply the new CSS custom properties.
   */
  const handleSave = useCallback(async (): Promise<void> => {
    setIsSaving(true);

    const payload: Record<string, string> = {
      'theme.primaryColor':   theme.primaryColor,
      'theme.secondaryColor': theme.secondaryColor,
      'theme.accentColor':    theme.accentColor,
      'theme.bgColor':        theme.bgColor,
      'theme.surfaceColor':   theme.surfaceColor,
      'theme.textColor':      theme.textColor,
      'theme.fontFamily':     theme.fontFamily,
    };

    try {
      const res = await fetch('/api/site-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || 'Save failed');
      }

      showToast('Theme saved! Applying…', 'success');

      // Apply CSS vars directly to DOM immediately for instant visual feedback.
      // Dark mode class is untouched — it lives in SiteConfigContext.isDark state
      // which router.refresh() never resets because client useState is preserved.
      const root = document.documentElement;
      root.style.setProperty('--color-primary',   theme.primaryColor);
      root.style.setProperty('--color-secondary', theme.secondaryColor);
      root.style.setProperty('--color-accent',    theme.accentColor);
      root.style.setProperty('--color-bg',        theme.bgColor);
      root.style.setProperty('--color-surface',   theme.surfaceColor);
      root.style.setProperty('--color-text',      theme.textColor);
      root.style.setProperty('--font-family',     theme.fontFamily);

      // Soft refresh re-renders server components with new config.
      // SiteConfigContext.isDark state is preserved by React (router.refresh
      // never unmounts client components), so dark mode is guaranteed to survive.
      router.refresh();    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Failed to save theme: ${message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [theme, showToast]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* ── Preset Buttons ─────────────────────────────────────────────── */}
      <section aria-labelledby="presets-heading">
        <h3
          id="presets-heading"
          className="flex items-center gap-2 text-sm font-semibold text-brand-text mb-3"
        >
          <Palette className="w-4 h-4 text-brand-primary" aria-hidden="true" />
          Colour Presets
        </h3>

        <div className="flex flex-wrap gap-3">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="group flex items-center gap-2.5 rounded-xl px-4 py-2.5 border-2 border-gray-200
                         dark:border-gray-700 hover:border-brand-primary transition-colors duration-150
                         bg-brand-surface focus:outline-none focus-visible:ring-2
                         focus-visible:ring-brand-primary focus-visible:ring-offset-2"
              title={`Apply ${preset.name}`}
            >
              {/* Mini colour swatch strip */}
              <div className="flex gap-0.5 rounded overflow-hidden shrink-0">
                {[preset.primaryColor, preset.secondaryColor, preset.accentColor].map(
                  (color) => (
                    <span
                      key={color}
                      className="w-3 h-5 block"
                      style={{ backgroundColor: color }}
                    />
                  ),
                )}
              </div>
              <span className="text-xs font-medium text-brand-text group-hover:text-brand-primary transition-colors">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Colour Controls + Live Preview ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left: colour pickers */}
        <section aria-labelledby="colours-heading">
          <h3
            id="colours-heading"
            className="flex items-center gap-2 text-sm font-semibold text-brand-text mb-4"
          >
            <Palette className="w-4 h-4 text-brand-primary" aria-hidden="true" />
            Colour Tokens
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
            {COLOR_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1">
                <ColorPicker
                  label={label}
                  value={theme[key] as string}
                  onChange={(hex) => handleColorChange(key, hex)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Right: live preview */}
        <section aria-labelledby="preview-heading">
          <h3
            id="preview-heading"
            className="flex items-center gap-2 text-sm font-semibold text-brand-text mb-4"
          >
            <Eye className="w-4 h-4 text-brand-primary" aria-hidden="true" />
            Live Preview
          </h3>

          <LivePreview theme={theme} />
        </section>
      </div>

      {/* ── Font Selector ──────────────────────────────────────────────── */}
      <section aria-labelledby="font-heading">
        <h3
          id="font-heading"
          className="flex items-center gap-2 text-sm font-semibold text-brand-text mb-3"
        >
          <Type className="w-4 h-4 text-brand-primary" aria-hidden="true" />
          Font Family
        </h3>

        <div className="max-w-sm">
          <label
            htmlFor="font-select"
            className="block text-xs text-brand-text/60 mb-1"
          >
            Select storefront font
          </label>
          <select
            id="font-select"
            value={theme.fontFamily}
            onChange={handleFontChange}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-brand-surface
                       text-brand-text px-3 py-2 text-sm
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary
                       transition-colors duration-150"
          >
            {FONT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Font preview */}
          <p
            className="mt-2 text-sm text-brand-text/70 truncate"
            style={{ fontFamily: theme.fontFamily }}
          >
            আমার সোনার বাংলা — Preview Text
          </p>
        </div>
      </section>

      {/* ── Save Button ────────────────────────────────────────────────── */}
      <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="primary"
          size="md"
          isLoading={isSaving}
          leftIcon={<Save className="w-4 h-4" aria-hidden="true" />}
          onClick={handleSave}
        >
          {isSaving ? 'Saving…' : 'Save Theme'}
        </Button>
      </div>
    </div>
  );
};