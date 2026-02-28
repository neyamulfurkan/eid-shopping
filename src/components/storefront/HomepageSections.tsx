// src/components/storefront/HomepageSections.tsx
'use client';

import React from 'react';
import type { Banner } from '@prisma/client';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { useLanguage } from '@/context/LanguageContext';
import { HeroSlider } from '@/components/storefront/HeroSlider';
import { FlashDeals } from '@/components/storefront/FlashDeals';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { TrustBadges } from '@/components/storefront/TrustBadges';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { DEFAULT_HOMEPAGE_SECTIONS, type AdminProductListItem } from '@/lib/types';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

/** Keys that are known and renderable by this component. */
const KNOWN_SECTION_KEYS = [
  'hero',
  'flash_deals',
  'featured_products',
  'new_arrivals',
  'trust_badges',
] as const;

type KnownSectionKey = (typeof KNOWN_SECTION_KEYS)[number];

/** SiteConfig key suffix map for per-section enabled flags. */
const SECTION_ENABLED_CONFIG_KEY: Record<KnownSectionKey, string> = {
  hero:               'sections.heroEnabled',
  flash_deals:        'sections.flashDealsEnabled',
  featured_products:  'sections.featuredProductsEnabled',
  new_arrivals:       'sections.newArrivalsEnabled',
  trust_badges:       'sections.trustBadgesEnabled',
};

/** Standard inner container used for all non-hero sections. */
const CONTAINER_CLASS = 'max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Parses the sections.order JSON string from SiteConfig into an ordered
 * string array. Falls back to the DEFAULT_HOMEPAGE_SECTIONS key order
 * on any parse error or if the config key is absent.
 *
 * @param raw - Raw JSON string value from SiteConfigMap['sections.order'].
 * @returns Ordered array of section key strings.
 */
function parseSectionOrder(raw: string | undefined): string[] {
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
        return parsed as string[];
      }
    } catch {
      // Fall through to default.
    }
  }
  return DEFAULT_HOMEPAGE_SECTIONS.map((s) => s.key);
}

/**
 * Determines whether a section is enabled based on its SiteConfig flag.
 * Treats absent keys as enabled (opt-out model) so new deployments show
 * all sections without requiring an explicit admin save.
 *
 * @param config - Flat SiteConfigMap.
 * @param sectionKey - The known section key to check.
 * @returns true when the section should be rendered.
 */
function isSectionEnabled(
  config: Record<string, string>,
  sectionKey: KnownSectionKey,
): boolean {
  const configKey = SECTION_ENABLED_CONFIG_KEY[sectionKey];
  const raw = config[configKey];
  // Treat missing key as enabled; explicit 'false' disables.
  if (raw === undefined || raw === null || raw === '') return true;
  return raw !== 'false';
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface HomepageSectionsProps {
  banners: Banner[];
  flashProducts: AdminProductListItem[];
  featuredProducts: AdminProductListItem[];
  newArrivals: AdminProductListItem[];
}

// ─────────────────────────────────────────────
// Section sub-renderers
// ─────────────────────────────────────────────

interface SectionHeadingProps {
  label: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ label }) => (
  <h2 className="text-xl sm:text-2xl font-bold text-brand-primary mb-5">
    {label}
  </h2>
);

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

/**
 * Renders all homepage sections in the admin-configured order, skipping
 * any section whose visibility flag is false in SiteConfig.
 *
 * @param banners - Active banner records for the HeroSlider.
 * @param flashProducts - Flash-deal products for the FlashDeals section.
 * @param featuredProducts - Featured products for the Featured Products grid.
 * @param newArrivals - Newest products for the New Arrivals grid.
 */
export const HomepageSections: React.FC<HomepageSectionsProps> = ({
  banners,
  flashProducts,
  featuredProducts,
  newArrivals,
}) => {
  const config = useSiteConfig();
  const { t } = useLanguage();

  const orderedKeys = parseSectionOrder(config['sections.order']);

  return (
    <main aria-label="Homepage sections">
      {orderedKeys.map((key) => {
        // Skip unknown section keys gracefully.
        if (!KNOWN_SECTION_KEYS.includes(key as KnownSectionKey)) return null;

        const sectionKey = key as KnownSectionKey;

        if (!isSectionEnabled(config, sectionKey)) return null;

        switch (sectionKey) {
          // ── Hero — full-width, no container, no AnimatedSection ─────────
          case 'hero':
            return (
              <section key="hero" aria-label={t('section.hero')}>
                <HeroSlider banners={banners} />
              </section>
            );

          // ── Flash Deals ────────────────────────────────────────────────
          case 'flash_deals':
            if (!flashProducts.length) return null;
            return (
              <div key="flash_deals" className={CONTAINER_CLASS}>
                {/* FlashDeals already wraps itself in AnimatedSection */}
                <FlashDeals products={flashProducts} />
              </div>
            );

          // ── Featured Products ──────────────────────────────────────────
          case 'featured_products':
            return (
              <div key="featured_products" className={CONTAINER_CLASS}>
                <AnimatedSection>
                  <section
                    className="py-8"
                    aria-labelledby="featured-products-heading"
                  >
                    <SectionHeading
                      label={t('section.featuredProducts')}
                    />
                    <ProductGrid products={featuredProducts} />
                  </section>
                </AnimatedSection>
              </div>
            );

          // ── New Arrivals ───────────────────────────────────────────────
          case 'new_arrivals':
            return (
              <div key="new_arrivals" className={CONTAINER_CLASS}>
                <AnimatedSection delay={0.05}>
                  <section
                    className="py-8"
                    aria-labelledby="new-arrivals-heading"
                  >
                    <SectionHeading
                      label={t('section.newArrivals')}
                    />
                    <ProductGrid products={newArrivals} />
                  </section>
                </AnimatedSection>
              </div>
            );

          // ── Trust Badges ───────────────────────────────────────────────
          case 'trust_badges':
            return (
              <AnimatedSection key="trust_badges" delay={0.1}>
                {/* TrustBadges applies its own padding internally */}
                <TrustBadges />
              </AnimatedSection>
            );

          default:
            return null;
        }
      })}
    </main>
  );
};