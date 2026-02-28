// src/components/storefront/FlashDeals.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import type { AdminProductListItem } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { ProductCard } from '@/components/storefront/ProductCard';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface FlashDealsProps {
  products: AdminProductListItem[];
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

/**
 * Homepage Flash Deals section with countdown timer and scrollable product row.
 * Returns null when no flash-deal products are provided.
 *
 * @param products - Array of AdminProductListItem flagged as flash deals.
 * @returns Rendered section or null.
 */
export const FlashDeals: React.FC<FlashDealsProps> = ({ products }) => {
  const { t } = useLanguage();

  // Compute the earliest flashDealEndsAt among all provided products.
  // Products without a flashDealEndsAt timestamp are excluded from the min calculation.
  const earliestEndsAt = useMemo<Date | null>(() => {
        const timestamps = products
      .map((p) => p.flashDealEndsAt)
      .filter((d): d is string => d !== null && d !== undefined && new Date(d).getTime() > Date.now());

    if (timestamps.length === 0) return null;

    const minTime = Math.min(...timestamps.map((d) => new Date(d).getTime()));
    return new Date(minTime);
  }, [products]);

    const [isExpired, setIsExpired] = useState(false);

  // Nothing to render if no products are provided or all deals have expired.
  if (!products || products.length === 0) return null;
  if (isExpired) return null;

  return (
    <AnimatedSection>
      <section className="w-full py-6" aria-labelledby="flash-deals-heading">
        {/* ── Section Header ───────────────────────────── */}
        <div className="flex items-center justify-between gap-4 mb-5 px-1">
          {/* Title */}
          <h2
            id="flash-deals-heading"
            className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-brand-primary"
          >
            <Flame
              className="w-6 h-6 text-orange-500 flex-shrink-0"
              aria-hidden="true"
            />
            {t('section.flashDeals')}
          </h2>

          {/* Countdown Timer — only shown when we have a valid end date */}
                    {earliestEndsAt !== null && (
            <div className="flex-shrink-0">
              <CountdownTimer endsAt={earliestEndsAt} onExpire={() => setIsExpired(true)} />
            </div>
          )}
        </div>

        {/* ── Product Row ──────────────────────────────── */}
        {/*
          Mobile  : horizontally scrollable flex row with scroll-snap
          Desktop : 4-column grid
        */}
        <div
          className="
            flex gap-4 overflow-x-auto
            snap-x snap-mandatory
            scrollbar-none
            pb-2
            lg:grid lg:grid-cols-4 lg:overflow-x-visible lg:snap-none lg:pb-0
          "
          role="list"
          aria-label={t('section.flashDeals')}
        >
          {products.map((product) => (
            <div
              key={product.id}
              role="listitem"
              className="
                snap-start flex-shrink-0
                w-[calc(50vw-24px)]
                sm:w-[calc(33.333vw-24px)]
                lg:w-auto
              "
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </section>
    </AnimatedSection>
  );
};