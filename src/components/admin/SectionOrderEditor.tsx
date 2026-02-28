// src/components/admin/SectionOrderEditor.tsx
'use client';

import React, { useState } from 'react';
import { DragSortList } from '@/components/ui/DragSortList';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import {
  type SiteConfigMap,
  type HomepageSection,
  DEFAULT_HOMEPAGE_SECTIONS,
} from '@/lib/types';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

/**
 * All section keys the editor is aware of.
 * Used to read per-section enabled flags from SiteConfig.
 */
const SECTION_KEYS = DEFAULT_HOMEPAGE_SECTIONS.map((s) => s.key);

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Builds the SiteConfig key used to store the enabled flag for a section.
 * @param key - Section key, e.g. 'hero'.
 * @returns SiteConfig key string, e.g. 'sections.heroEnabled'.
 */
const enabledKey = (key: string): string => {
  // Convert snake_case key to camelCase prefix: flash_deals → flashDeals
  const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  return `sections.${camel}Enabled`;
};

/**
 * Reconstructs the ordered HomepageSection[] from SiteConfig.
 * Falls back to DEFAULT_HOMEPAGE_SECTIONS if sections.order is absent or invalid.
 *
 * @param config - Flat SiteConfigMap from the database.
 * @returns Ordered HomepageSection[] with isVisible flags applied.
 */
const buildSectionsFromConfig = (config: SiteConfigMap): HomepageSection[] => {
  // Build a lookup map from DEFAULT_HOMEPAGE_SECTIONS by key
  const defaultMap = new Map<string, HomepageSection>(
    DEFAULT_HOMEPAGE_SECTIONS.map((s) => [s.key, s]),
  );

  // Parse stored order
  let orderedKeys: string[] = [];
  try {
    const raw = config['sections.order'];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        orderedKeys = parsed.filter((k): k is string => typeof k === 'string');
      }
    }
  } catch {
    // Fall through to default
  }

  if (orderedKeys.length === 0) {
    // No stored order — return defaults
    return DEFAULT_HOMEPAGE_SECTIONS.map((s) => {
      const storedEnabled = config[enabledKey(s.key)];
      return {
        ...s,
        isVisible: storedEnabled === undefined ? s.isVisible : storedEnabled !== 'false',
      };
    });
  }

  // Reconstruct ordered list from stored keys, then append any unknown keys from defaults
  const seen = new Set<string>();
  const ordered: HomepageSection[] = [];

  orderedKeys.forEach((key, index) => {
    seen.add(key);
    const base = defaultMap.get(key) ?? {
      key,
      labelEn: key,
      labelBn: key,
      isVisible: true,
      order: index,
    };
    const storedEnabled = config[enabledKey(key)];
    ordered.push({
      ...base,
      order: index,
      isVisible: storedEnabled === undefined ? base.isVisible : storedEnabled !== 'false',
    });
  });

  // Append any default sections not present in stored order
  DEFAULT_HOMEPAGE_SECTIONS.forEach((s) => {
    if (!seen.has(s.key)) {
      const storedEnabled = config[enabledKey(s.key)];
      ordered.push({
        ...s,
        order: ordered.length,
        isVisible: storedEnabled === undefined ? s.isVisible : storedEnabled !== 'false',
      });
    }
  });

  return ordered;
};

/**
 * Serialises a HomepageSection[] into the SiteConfig patch body.
 * Produces sections.order plus one *Enabled flag per known section key.
 *
 * @param sections - Current ordered sections array.
 * @returns Record<string, string> ready for PATCH /api/site-config.
 */
const buildPatchBody = (sections: HomepageSection[]): Record<string, string> => {
  const body: Record<string, string> = {
    'sections.order': JSON.stringify(sections.map((s) => s.key)),
  };

  SECTION_KEYS.forEach((key) => {
    const section = sections.find((s) => s.key === key);
    body[enabledKey(key)] = String(section?.isVisible ?? true);
  });

  // Also persist any sections not in the DEFAULT list (future-proofing)
  sections.forEach((s) => {
    if (!SECTION_KEYS.includes(s.key)) {
      body[enabledKey(s.key)] = String(s.isVisible);
    }
  });

  return body;
};

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface SectionOrderEditorProps {
  /** Server-fetched SiteConfigMap passed from the admin theme page. */
  initialConfig: SiteConfigMap;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

/**
 * Admin editor for reordering and toggling homepage sections.
 * Parses the stored section order and enabled flags from SiteConfig,
 * renders a DragSortList for visual editing, and persists changes via
 * PATCH /api/site-config on save.
 *
 * @param initialConfig - Server-fetched SiteConfigMap.
 */
export const SectionOrderEditor: React.FC<SectionOrderEditorProps> = ({
  initialConfig,
}) => {
  const { showToast } = useToast();

  const [sections, setSections] = useState<HomepageSection[]>(() =>
    buildSectionsFromConfig(initialConfig),
  );
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Persists the current sections state to the database via PATCH /api/site-config.
   */
  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const body = buildPatchBody(sections);

      const res = await fetch('/api/site-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      showToast('Section order saved successfully.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save.';
      showToast(`Error: ${message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-brand-text">Homepage Sections</h2>
          <p className="text-sm text-brand-text/60">
            Drag to reorder sections. Toggle the switch to show or hide each section.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          isLoading={isSaving}
          onClick={handleSave}
        >
          Save Order
        </Button>
      </div>

      {/* Drag-and-drop list */}
      <DragSortList items={sections} onChange={setSections} />

      {/* Helper note */}
      <p className="text-xs text-brand-text/40">
        Changes take effect on the storefront within 30 seconds after saving.
      </p>
    </div>
  );
};