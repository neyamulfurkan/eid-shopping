'use client';

import React, { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { CategoryFilter } from '@/components/storefront/CategoryFilter';
import { cn } from '@/lib/utils';

const SORT_OPTIONS = [
  { value: 'newest',     labelEn: 'Newest First' },
  { value: 'popular',    labelEn: 'Most Popular' },
  { value: 'price_asc',  labelEn: 'Price: Low–High' },
  { value: 'price_desc', labelEn: 'Price: High–Low' },
];

interface ClientProductFiltersProps {
  categories: { id: string; nameEn: string; nameBn: string; slug: string }[];
  selectedSlug: string | null;
  currentSort: string;
  currentSearch?: string;
}

export const ClientProductFilters: React.FC<ClientProductFiltersProps> = ({
  categories,
  selectedSlug,
  currentSort,
  currentSearch = '',
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

    const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      if (!('page' in updates)) params.delete('page');
      const qs = params.toString();
      router.push(qs ? `/products?${qs}` : '/products');
    },
    [router, searchParams],
  );

  const handleCategoryChange = useCallback(
    (slug: string | null) => pushParams({ category: slug }),
    [pushParams],
  );

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => pushParams({ sort: e.target.value }),
    [pushParams],
  );

  return (
    <div className="flex flex-col gap-3 mb-6">
      {currentSearch && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-brand-text/60">Results for</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-brand-primary/10 text-brand-primary">
            {currentSearch}
            <button
              onClick={() => pushParams({ search: null })}
              className="hover:opacity-60 transition-opacity"
              aria-label="Clear search"
            >
              <X size={13} aria-hidden="true" />
            </button>
          </span>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <CategoryFilter
            categories={categories}
            selectedSlug={selectedSlug}
            onChange={handleCategoryChange}
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <SlidersHorizontal size={15} className="text-brand-text/50" aria-hidden="true" />
          <select
            value={currentSort}
            onChange={handleSortChange}
            className={cn(
              'text-sm rounded-xl border border-brand-secondary/30',
              'bg-brand-surface text-brand-text px-3 py-2 pr-8',
              'focus:outline-none focus:ring-2 focus:ring-brand-primary/40',
              'appearance-none cursor-pointer',
            )}
            aria-label="Sort products"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.labelEn}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};