// src/components/storefront/TrustBadges.tsx
'use client';

import React from 'react';
import { Truck, RefreshCw, Zap, Shield, CheckCircle, type LucideIcon } from 'lucide-react';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { useLanguage } from '@/context/LanguageContext';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface BadgeDefinition {
  key: string;
  labelEn: string;
  labelBn: string;
  icon: string;
  isVisible: boolean;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const DEFAULT_BADGES: BadgeDefinition[] = [
  { key: 'cod',      labelEn: 'Cash on Delivery',  labelBn: 'ক্যাশ অন ডেলিভারি', icon: 'truck',   isVisible: true },
  { key: 'return',   labelEn: 'Easy Return',        labelBn: 'সহজ রিটার্ন',        icon: 'refresh', isVisible: true },
  { key: 'delivery', labelEn: 'Fast Delivery',      labelBn: 'দ্রুত ডেলিভারি',     icon: 'zap',     isVisible: true },
  { key: 'secure',   labelEn: 'Secure Payment',     labelBn: 'নিরাপদ পেমেন্ট',     icon: 'shield',  isVisible: true },
  { key: 'genuine',  labelEn: '100% Genuine',       labelBn: '১০০% আসল',           icon: 'check',   isVisible: true },
];

const ICON_MAP: Record<string, LucideIcon> = {
  truck:   Truck,
  refresh: RefreshCw,
  zap:     Zap,
  shield:  Shield,
  check:   CheckCircle,
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Parses the settings.trustBadges JSON string from SiteConfig, merging any
 * stored overrides onto the DEFAULT_BADGES array keyed by badge.key.
 * Falls back to DEFAULT_BADGES on any parse error.
 *
 * @param raw - The raw JSON string from SiteConfigMap['settings.trustBadges'].
 * @returns Merged array of BadgeDefinition objects.
 */
function parseBadges(raw: string | undefined): BadgeDefinition[] {
  if (!raw) return DEFAULT_BADGES;

  try {
    const parsed: Partial<BadgeDefinition>[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_BADGES;

    // Build a lookup from the stored overrides.
    const overrideMap = new Map<string, Partial<BadgeDefinition>>();
    for (const entry of parsed) {
      if (entry.key) overrideMap.set(entry.key, entry);
    }

    // Merge overrides onto defaults, preserving default labels/icons for
    // any field not explicitly overridden.
    return DEFAULT_BADGES.map((def) => {
      const override = overrideMap.get(def.key);
      return override ? { ...def, ...override } : def;
    });
  } catch {
    return DEFAULT_BADGES;
  }
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

/**
 * Renders a configurable row of trust badge cards sourced from SiteConfig.
 * Returns null when every badge is hidden.
 */
export const TrustBadges: React.FC = () => {
  const config = useSiteConfig();
  const { lang } = useLanguage();

  const badges = parseBadges(config['settings.trustBadges']);
  const visibleBadges = badges.filter((b) => b.isVisible);

  if (visibleBadges.length === 0) return null;

  return (
    <section className="w-full py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-screen-xl mx-auto flex flex-wrap justify-center gap-4">
        {visibleBadges.map((badge) => {
          const IconComponent = ICON_MAP[badge.icon] ?? CheckCircle;
          const label = lang === 'bn' ? badge.labelBn : badge.labelEn;

          return (
            <div
              key={badge.key}
              className="flex flex-col items-center text-center p-3 rounded-xl bg-brand-surface shadow-sm border border-brand-secondary/20 min-w-[90px] max-w-[110px] flex-1"
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-brand-primary/10 mb-2">
                <IconComponent
                  className="w-5 h-5 text-brand-primary"
                  aria-hidden="true"
                  strokeWidth={1.75}
                />
              </div>
              <span className="text-xs font-medium text-brand-text leading-tight">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};