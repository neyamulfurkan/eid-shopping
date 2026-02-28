// src/components/storefront/ProductGrid.tsx
'use client';

import React from 'react';
import { PackageSearch } from 'lucide-react';
import { ProductCard } from '@/components/storefront/ProductCard';
import type { AdminProductListItem } from '@/lib/types';

// ─────────────────────────────────────────────
// Skeleton Card
// ─────────────────────────────────────────────

/**
 * Shimmer placeholder that matches the exact dimensions of ProductCard
 * to prevent layout shift while product data is loading.
 */
const SkeletonCard: React.FC = () => (
  <div className="rounded-2xl overflow-hidden bg-brand-surface shadow-sm">
    {/* Image area — aspect-[3/4] matches ProductCard image container */}
    <div className="aspect-[3/4] bg-gray-200 animate-pulse rounded-t-2xl" />

    {/* Card body */}
    <div className="rounded-b-2xl bg-brand-surface p-3 space-y-2">
      {/* Product name placeholder */}
      <div className="h-4 bg-gray-200 animate-pulse rounded w-4/5" />

      {/* Price placeholder */}
      <div className="flex items-center gap-2">
        <div className="h-4 bg-gray-200 animate-pulse rounded w-1/3" />
        <div className="h-3 bg-gray-200 animate-pulse rounded w-1/4" />
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface ProductGridProps {
  products: AdminProductListItem[];
  isLoading?: boolean;
  emptyMessage?: string;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

/**
 * Responsive product grid that handles three states:
 * loading (8 skeleton cards), empty (centred message with icon), and populated (ProductCard grid).
 *
 * @param products - Array of product items to render.
 * @param isLoading - When true, renders 8 shimmer skeleton cards instead of real products.
 * @param emptyMessage - Custom message displayed when products is empty and not loading.
 * @returns A responsive 2/3/4-column grid.
 */
export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isLoading = false,
  emptyMessage = 'No products found',
}) => {
  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (products.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
        <PackageSearch
          className="w-16 h-16 text-brand-secondary/40 mb-4"
          aria-hidden="true"
          strokeWidth={1.5}
        />
        <p className="text-brand-text/60 text-base font-medium">{emptyMessage}</p>
      </div>
    );
  }

  // ── Populated state ──────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};