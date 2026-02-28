'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Type } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import type { SiteConfigMap } from '@/lib/types';
import { DEFAULT_TRANSLATIONS } from '@/lib/i18n';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContentTextEditorProps {
  /** Flat SiteConfigMap from the server, used to hydrate i18n.* override values. */
  initialConfig: SiteConfigMap;
}

/** Bilingual string pair for a single translation key. */
interface TranslationEntry {
  en: string;
  bn: string;
}

/** Local mutable state: maps every translation key to its current en/bn pair. */
type TranslationsState = Record<string, TranslationEntry>;

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Ordered accordion section definitions.
 * Each entry declares a display label and the key prefix that belongs to it.
 */
const SECTIONS: { label: string; prefix: string }[] = [
  { label: 'Navigation',        prefix: 'nav.'      },
  { label: 'Buttons',           prefix: 'btn.'      },
  { label: 'Labels',            prefix: 'label.'    },
  { label: 'Messages',          prefix: 'msg.'      },
  { label: 'Checkout',          prefix: 'checkout.' },
  { label: 'WhatsApp',          prefix: 'whatsapp.' },
  { label: 'Homepage Sections', prefix: 'section.'  },
  { label: 'Pages',             prefix: 'page.'     },
  { label: 'Trust Badges',      prefix: 'badge.'    },
  { label: 'Flash Deals',       prefix: 'flashDeal.'},
  { label: 'Countdown Timer',   prefix: 'timer.'    },
  { label: 'Reviews',           prefix: 'review.'   },
  { label: 'Sorting',           prefix: 'sort.'     },
  { label: 'Footer',            prefix: 'footer.'   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds the initial TranslationsState by overlaying initialConfig i18n.* values
 * on top of DEFAULT_TRANSLATIONS defaults.
 * @param config - Flat SiteConfigMap from the server.
 * @returns Mutable translations state for all DEFAULT_TRANSLATIONS keys.
 */
function buildInitialState(config: SiteConfigMap): TranslationsState {
  const state: TranslationsState = {};

  for (const key of Object.keys(DEFAULT_TRANSLATIONS)) {
    const enOverride = config[`i18n.${key}.en`];
    const bnOverride = config[`i18n.${key}.bn`];

    state[key] = {
      en: enOverride || DEFAULT_TRANSLATIONS[key].en,
      bn: bnOverride || DEFAULT_TRANSLATIONS[key].bn,
    };
  }

  return state;
}

/**
 * Groups all translation keys by their dot-prefix, mapping each SECTIONS entry
 * to the matching key list. Keys not matching any section are grouped under 'other'.
 * @param keys - All translation keys.
 * @returns Map from section prefix → matching keys.
 */
function groupKeysBySection(keys: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>(SECTIONS.map((s) => [s.prefix, []]));

  for (const key of keys) {
    let matched = false;
    for (const { prefix } of SECTIONS) {
      if (key.startsWith(prefix)) {
        map.get(prefix)!.push(key);
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (!map.has('other.')) map.set('other.', []);
      map.get('other.')!.push(key);
    }
  }

  return map;
}

// ─── Sub-component: Accordion Panel ──────────────────────────────────────────

interface AccordionPanelProps {
  label: string;
  keys: string[];
  translations: TranslationsState;
  onChange: (key: string, lang: 'en' | 'bn', value: string) => void;
}

/**
 * A collapsible accordion panel for one group of translation keys.
 * Renders each key with its monospace label and English/Bengali text inputs.
 */
const AccordionPanel: React.FC<AccordionPanelProps> = ({
  label,
  keys,
  translations,
  onChange,
}) => {
  const [open, setOpen] = useState(false);

  if (keys.length === 0) return null;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 bg-brand-surface hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
        aria-expanded={open}
      >
        <span className="font-semibold text-brand-text text-sm">{label}</span>
        <span className="text-gray-400 shrink-0">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {/* Body */}
      {open && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {keys.map((key) => {
            const entry = translations[key];
            if (!entry) return null;

            return (
              <div key={key} className="px-4 py-4 bg-white dark:bg-gray-900">
                {/* Key label */}
                <p className="font-mono text-xs text-gray-400 mb-3 select-all">{key}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* English */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      English
                    </label>
                    <textarea
                      rows={entry.en.length > 80 ? 3 : 1}
                      value={entry.en}
                      onChange={(e) => onChange(key, 'en', e.target.value)}
                      className="w-full input-base resize-none text-sm"
                      placeholder="English text"
                    />
                  </div>

                  {/* Bengali */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      বাংলা (Bengali)
                    </label>
                    <textarea
                      rows={entry.bn.length > 80 ? 3 : 1}
                      value={entry.bn}
                      onChange={(e) => onChange(key, 'bn', e.target.value)}
                      className="w-full input-base resize-none text-sm"
                      placeholder="Bengali text"
                      dir="auto"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * Admin editor that renders every DEFAULT_TRANSLATIONS key as an editable form
 * grouped into accordion sections. Saves all i18n.* overrides to /api/site-config
 * in a single PATCH batch, allowing clients to fully localise the storefront UI
 * without code changes.
 *
 * @param initialConfig - Flat SiteConfigMap passed from the server page component.
 * @returns Accordion-grouped bilingual text editor with a save button.
 */
export const ContentTextEditor: React.FC<ContentTextEditorProps> = ({
  initialConfig,
}) => {
  const { showToast } = useToast();
  const router = useRouter();

  const [translations, setTranslations] = useState<TranslationsState>(() =>
    buildInitialState(initialConfig),
  );
  const [isSaving, setIsSaving] = useState(false);

  // Pre-compute grouped keys once; translations state keys don't change.
  const allKeys = Object.keys(DEFAULT_TRANSLATIONS);
  const groupedKeys = groupKeysBySection(allKeys);

  // ── Handlers ───────────────────────────────────────────────────────────────

  /**
   * Updates a single en or bn value for the given translation key.
   * @param key - Translation key (e.g. 'btn.addToCart').
   * @param lang - 'en' or 'bn'.
   * @param value - New string value.
   */
  const handleChange = useCallback(
    (key: string, lang: 'en' | 'bn', value: string) => {
      setTranslations((prev) => ({
        ...prev,
        [key]: { ...prev[key], [lang]: value },
      }));
    },
    [],
  );

  /**
   * Serialises the full translations state into a flat i18n.* batch and
   * PATCHes /api/site-config to persist all values atomically.
   */
  const handleSave = useCallback(async () => {
    setIsSaving(true);

    try {
      // Build flat batch: { 'i18n.btn.addToCart.en': '...', 'i18n.btn.addToCart.bn': '...' }
      const batch: Record<string, string> = {};

      for (const [key, entry] of Object.entries(translations)) {
        batch[`i18n.${key}.en`] = entry.en;
        batch[`i18n.${key}.bn`] = entry.bn;
      }

      const res = await fetch('/api/site-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      showToast('Text content saved — refreshing…', 'success');
      // router.refresh() causes the server layout to re-fetch SiteConfig,
      // passing updated initialConfig to LanguageProvider whose useMemo([initialConfig])
      // then rebuilds the translation map with the new values.
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Failed to save: ${message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [translations, showToast]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Type size={20} className="text-brand-primary" />
          <div>
            <h2 className="text-lg font-semibold text-brand-text">Site Text</h2>
            <p className="text-sm text-gray-500">
              Edit all UI strings in English and Bengali. Changes take effect within 30 seconds.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          isLoading={isSaving}
          onClick={handleSave}
        >
          Save All Text
        </Button>
      </div>

      {/* Accordion sections */}
      <div className="space-y-3">
        {SECTIONS.map(({ label, prefix }) => {
          const keys = groupedKeys.get(prefix) ?? [];
          return (
            <AccordionPanel
              key={prefix}
              label={`${label} (${keys.length})`}
              keys={keys}
              translations={translations}
              onChange={handleChange}
            />
          );
        })}
      </div>

      {/* Sticky save footer */}
      <div className="sticky bottom-0 bg-brand-bg border-t border-gray-200 dark:border-gray-700 py-4 flex justify-end">
        <Button
          variant="primary"
          size="md"
          isLoading={isSaving}
          onClick={handleSave}
        >
          Save All Text
        </Button>
      </div>
    </div>
  );
};