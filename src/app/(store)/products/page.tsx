// src/app/(store)/products/page.tsx

import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';
import { ClientProductFilters } from './ClientProductFilters';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { CategoryFilter } from '@/components/storefront/CategoryFilter';
import type { AdminProductListItem } from '@/lib/types';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PAGE_LIMIT = 24;

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'popular';

const SORT_OPTIONS: { value: SortOption; labelEn: string; labelBn: string }[] = [
  { value: 'newest',     labelEn: 'Newest First',   labelBn: 'নতুন প্রথমে' },
  { value: 'popular',    labelEn: 'Most Popular',   labelBn: 'জনপ্রিয়' },
  { value: 'price_asc',  labelEn: 'Price: Low–High', labelBn: 'দাম: কম–বেশি' },
  { value: 'price_desc', labelEn: 'Price: High–Low', labelBn: 'দাম: বেশি–কম' },
];

// ─────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────

/**
 * Generates page-level SEO metadata for the product catalog page.
 * @returns Next.js Metadata object with title and description.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: { category?: string; page?: string };
}): Promise<Metadata> {
  const siteUrl = process.env.NEXTAUTH_URL || '';
  const canonicalUrl = searchParams.category
    ? `${siteUrl}/products?category=${encodeURIComponent(searchParams.category)}`
    : `${siteUrl}/products`;

  let title = 'All Products';
  let description = 'Browse our full collection of fashion and cosmetics.';

  if (searchParams.category) {
    const category = await prisma.category.findUnique({
      where: { slug: searchParams.category },
      select: { nameEn: true },
    });
    if (category) {
      title = `${category.nameEn} Collection`;
      description = `Shop our ${category.nameEn} collection — fashion and cosmetics for Eid and Ramadan.`;
    }
  }

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Builds the Prisma orderBy clause from a sort query param string.
 * @param sort - The sort option key from URL search params.
 * @returns A Prisma-compatible orderBy object.
 */
function buildOrderBy(
  sort: string | undefined,
): Record<string, 'asc' | 'desc'> {
  switch (sort as SortOption) {
    case 'price_asc':  return { basePrice: 'asc' };
    case 'price_desc': return { basePrice: 'desc' };
    case 'popular':    return { createdAt: 'desc' }; // proxy until sales count indexed
    case 'newest':
    default:           return { createdAt: 'desc' };
  }
}



// ─────────────────────────────────────────────
// Pagination (server-rendered links)
// ─────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

/**
 * Server-rendered pagination controls using Next.js Link for SEO-friendly page navigation.
 *
 * @param currentPage - The currently active page number (1-based).
 * @param totalPages  - Total number of pages for the current query.
 * @param baseUrl     - The base URL with existing query params (without ?page=).
 */
const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  baseUrl,
}) => {
  if (totalPages <= 1) return null;

  /**
   * Builds a URL for a specific page number, appending or replacing the page param.
   * @param page - Target page number.
   * @returns Full URL string for that page.
   */
  const pageUrl = (page: number): string => {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}page=${page}`;
  };

  // Build a windowed page range (max 5 visible pages)
  const getPageRange = (): number[] => {
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: number[] = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push(-1); // -1 represents ellipsis
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const pages = getPageRange();

  return (
    <nav
      className="flex items-center justify-center gap-1 mt-10"
      aria-label="Pagination"
    >
      {/* Previous */}
      {currentPage > 1 ? (
        <Link
          href={pageUrl(currentPage - 1)}
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-xl',
            'border border-brand-secondary/30 bg-brand-surface',
            'text-brand-text/70 hover:text-brand-primary hover:border-brand-primary/50',
            'transition-colors duration-150',
          )}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </Link>
      ) : (
        <span
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-xl',
            'border border-brand-secondary/20 bg-brand-surface',
            'text-brand-text/30 cursor-not-allowed',
          )}
          aria-hidden="true"
        >
          <ChevronLeft size={16} />
        </span>
      )}

      {/* Page numbers */}
      {pages.map((page, idx) =>
        page === -1 ? (
          <span
            key={`ellipsis-${idx}`}
            className="flex items-center justify-center w-9 h-9 text-brand-text/40 text-sm select-none"
          >
            …
          </span>
        ) : (
          <Link
            key={page}
            href={pageUrl(page)}
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-xl text-sm font-medium',
              'transition-colors duration-150',
              page === currentPage
                ? 'bg-brand-primary text-white'
                : [
                    'border border-brand-secondary/30 bg-brand-surface',
                    'text-brand-text/70 hover:text-brand-primary hover:border-brand-primary/50',
                  ],
            )}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </Link>
        ),
      )}

      {/* Next */}
      {currentPage < totalPages ? (
        <Link
          href={pageUrl(currentPage + 1)}
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-xl',
            'border border-brand-secondary/30 bg-brand-surface',
            'text-brand-text/70 hover:text-brand-primary hover:border-brand-primary/50',
            'transition-colors duration-150',
          )}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </Link>
      ) : (
        <span
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-xl',
            'border border-brand-secondary/20 bg-brand-surface',
            'text-brand-text/30 cursor-not-allowed',
          )}
          aria-hidden="true"
        >
          <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
};

// ─────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────

interface ProductsPageProps {
  searchParams: {
    category?: string;
    page?: string;
    sort?: string;
  };
}

/**
 * Product catalog server page.
 * Fetches categories and paginated products from Prisma based on URL search params.
 * Delegates filter/sort interactivity to the ClientProductFilters client island.
 *
 * @param searchParams - URL search parameters: category slug, page number, sort option.
 * @returns The full products page including Navbar, filters, product grid, pagination, and Footer.
 */
export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const currentSort = (searchParams.sort as SortOption) || 'newest';
  const page        = Math.max(1, Number(searchParams.page) || 1);
  const skip        = (page - 1) * PAGE_LIMIT;

  // ── Build Prisma where clause ─────────────────────────────────────────

  const where = {
    isActive: true,
    ...(searchParams.category
      ? { category: { slug: searchParams.category } }
      : {}),
  };

  const orderBy = buildOrderBy(currentSort);

  // ── Parallel data fetching ────────────────────────────────────────────

  const [categories, rawProducts, totalProducts, ratingAggregates] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      select: { id: true, nameEn: true, nameBn: true, slug: true },
    }),

    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_LIMIT,
      select: {
        id: true,
        slug: true,
        nameEn: true,
        nameBn: true,
        basePrice: true,
        salePrice: true,
        isFlashDeal: true,
        isActive: true,
        isFeatured: true,
        flashDealEndsAt: true,
        descriptionEn: true,
        descriptionBn: true,
        stockQty: true,
        lowStockThreshold: true,
        category: {
          select: { nameEn: true, nameBn: true },
        },
        images: {
          take: 2,
          orderBy: { displayOrder: 'asc' },
          select: { url: true, cloudinaryId: true, isDefault: true },
        },
        _count: {
          select: { reviews: true },
        },
      },
    }),

    prisma.product.count({ where }),

    prisma.review.groupBy({
      by: ['productId'],
      where: { isApproved: true },
      _avg: { rating: true },
    }),
  ]);

  const totalPages = Math.ceil(totalProducts / PAGE_LIMIT);

  // ── Serialise Prisma Decimal fields to plain numbers ──────────────────
  // Decimal fields cannot be passed directly from server to client components.

  const ratingMap = new Map<string, number>();
  for (const r of ratingAggregates) {
    if (r._avg.rating !== null) {
      ratingMap.set(r.productId, Math.round(r._avg.rating * 10) / 10);
    }
  }

  const products: AdminProductListItem[] = rawProducts.map((p) => ({
    ...p,
    basePrice: parseFloat(p.basePrice.toString()),
    salePrice: p.salePrice ? parseFloat(p.salePrice.toString()) : null,
    averageRating: ratingMap.get(p.id),
  }));

  // ── Build base URL for pagination links (no page param) ───────────────

  const paginationBase = [
    '/products',
    searchParams.category ? `category=${encodeURIComponent(searchParams.category)}` : null,
    currentSort !== 'newest' ? `sort=${currentSort}` : null,
  ]
    .filter(Boolean)
    .join('?')
    .replace('/products?', '/products?') // no-op but keeps intent clear
    // Rebuild cleanly:
    .split('?')[0] +
    (() => {
      const qs: string[] = [];
      if (searchParams.category) qs.push(`category=${encodeURIComponent(searchParams.category)}`);
      if (currentSort !== 'newest') qs.push(`sort=${currentSort}`);
      return qs.length ? `?${qs.join('&')}` : '';
    })();

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <>
      <Navbar />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[60vh]">

        {/* ── Page Header ────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-text">
            Products
          </h1>
          {totalProducts > 0 && (
            <p className="text-sm text-brand-text/50 mt-1">
              {totalProducts} item{totalProducts !== 1 ? 's' : ''} found
              {searchParams.category ? ` in ${categories.find((c) => c.slug === searchParams.category)?.nameEn ?? searchParams.category}` : ''}
            </p>
          )}
        </div>

        {/* ── Filters: Category + Sort (client island) ───────────────── */}
        <Suspense fallback={<div className="h-12 mb-6" />}>
          <ClientProductFilters
            categories={categories}
            selectedSlug={searchParams.category ?? null}
            currentSort={currentSort}
          />
        </Suspense>

        {/* ── Product Grid ────────────────────────────────────────────── */}
        <ProductGrid
          products={products}
          emptyMessage={
            searchParams.category
              ? 'No products found in this category.'
              : 'No products available yet.'
          }
        />

        {/* ── Pagination ──────────────────────────────────────────────── */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          baseUrl={paginationBase}
        />

      </main>

      <Footer />
    </>
  );
}