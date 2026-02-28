// src/app/admin/products/page.tsx

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { Plus, Package } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { formatPrice } from '@/lib/utils';
import type { AdminProductListItem } from '@/lib/types';
import { ClientProductSearch } from './ClientProductSearch';
import { DeleteProductButton } from './DeleteProductButton';

// ─────────────────────────────────────────────
// Page Props
// ─────────────────────────────────────────────

interface AdminProductsPageProps {
  searchParams: { search?: string; page?: string };
}

// ─────────────────────────────────────────────
// Server Component
// ─────────────────────────────────────────────

/**
 * Admin products list page. Fetches paginated, searchable products from the
 * database and renders a data table with stock alerts and edit/delete actions.
 * @param searchParams - URL search parameters for filtering and pagination.
 * @returns The rendered admin products page.
 */
export default async function AdminProductsPage({
  searchParams,
}: AdminProductsPageProps) {
  // ── Auth guard ──────────────────────────────
  const session = await auth();
  if (!session || session.user?.role !== 'ADMIN') {
    redirect('/auth/signin');
  }

  // ── Pagination & search ─────────────────────
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const limit = 20;
  const skip = (page - 1) * limit;
  const search = searchParams.search?.trim() ?? '';

  const where = search
    ? {
        OR: [
          { nameEn: { contains: search, mode: 'insensitive' as const } },
          { nameBn: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  // ── Data fetch ──────────────────────────────
  const [rawProducts, total, ratingAggregates] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        images: { take: 1, orderBy: { displayOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
    prisma.review.groupBy({
      by: ['productId'],
      where: { isApproved: true },
      _avg: { rating: true },
    }),
  ]);

  const ratingMap = new Map<string, number>();
  for (const r of ratingAggregates) {
    if (r._avg.rating !== null) {
      ratingMap.set(r.productId, Math.round(r._avg.rating * 10) / 10);
    }
  }

  // Serialise Decimal fields to numbers for client consumption
  const products: (AdminProductListItem & { categoryNameEn: string })[] =
    rawProducts.map((p) => ({
      id: p.id,
      slug: p.slug,
      nameEn: p.nameEn,
      nameBn: p.nameBn,
      basePrice: parseFloat(p.basePrice.toString()),
      salePrice: p.salePrice ? parseFloat(p.salePrice.toString()) : null,
      isFlashDeal: p.isFlashDeal,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      flashDealEndsAt: p.flashDealEndsAt,
      stockQty: p.stockQty,
      lowStockThreshold: p.lowStockThreshold,
      images: p.images.map((img) => ({
        url: img.url,
        cloudinaryId: img.cloudinaryId,
        isDefault: img.isDefault,
      })),
      category: {
        nameEn: p.category.nameEn,
        nameBn: p.category.nameBn,
      },
      categoryNameEn: p.category.nameEn,
      averageRating: ratingMap.get(p.id),
    }));

  const totalPages = Math.ceil(total / limit);

  // ── Pagination URL builder ───────────────────
  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(p));
    return `/admin/products?${params.toString()}`;
  }

  // ── Render ──────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Products</h1>
          <p className="text-sm text-brand-text/60 mt-0.5">
            {total} product{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
            New Product
          </Button>
        </Link>
      </div>

      {/* Search */}
      <ClientProductSearch initialSearch={search} />

      {/* Table */}
      <div className="bg-brand-surface rounded-2xl border border-brand-secondary/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-secondary/20 bg-brand-bg">
                <th className="text-left px-4 py-3 font-semibold text-brand-text/70 w-16">
                  Image
                </th>
                <th className="text-left px-4 py-3 font-semibold text-brand-text/70">
                  Name (EN)
                </th>
                <th className="text-left px-4 py-3 font-semibold text-brand-text/70">
                  Category
                </th>
                <th className="text-left px-4 py-3 font-semibold text-brand-text/70">
                  Base Price
                </th>
                <th className="text-left px-4 py-3 font-semibold text-brand-text/70">
                  Stock
                </th>
                <th className="text-left px-4 py-3 font-semibold text-brand-text/70">
                  Status
                </th>
                <th className="text-right px-4 py-3 font-semibold text-brand-text/70">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-secondary/10">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-brand-text/50">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No products found{search ? ` for "${search}"` : ''}.</p>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const isLowStock =
                    product.stockQty <= product.lowStockThreshold;
                  const thumbnail = product.images[0]?.url ?? null;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-brand-bg/60 transition-colors"
                    >
                      {/* Thumbnail */}
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-brand-bg flex items-center justify-center shrink-0">
                          {thumbnail ? (
                            <Image
                              src={thumbnail}
                              alt={product.nameEn}
                              width={40}
                              height={40}
                              className="w-10 h-10 object-cover"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-brand-text/30" />
                          )}
                        </div>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium text-brand-text truncate">
                          {product.nameEn}
                        </p>
                        {product.nameBn && (
                          <p className="text-xs text-brand-text/50 truncate mt-0.5">
                            {product.nameBn}
                          </p>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 text-brand-text/80">
                        {product.category.nameEn}
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 text-brand-text/80">
                        <div>
                          {product.salePrice ? (
                            <>
                              <span className="font-medium text-brand-primary">
                                {formatPrice(product.salePrice)}
                              </span>
                              <span className="ml-1.5 text-xs line-through text-brand-text/40">
                                {formatPrice(product.basePrice)}
                              </span>
                            </>
                          ) : (
                            <span>{formatPrice(product.basePrice)}</span>
                          )}
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3">
                        <span
                          className={
                            isLowStock
                              ? 'font-semibold text-red-500'
                              : 'text-brand-text/80'
                          }
                        >
                          {product.stockQty}
                          {isLowStock && (
                            <span className="ml-1 text-xs">(low)</span>
                          )}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/products/${product.id}`}>
                            <Button variant="secondary" size="sm">
                              Edit
                            </Button>
                          </Link>
                          <DeleteProductButton
                            productId={product.id}
                            productName={product.nameEn}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-brand-text/60">
            Page {page} of {totalPages} — {total} total
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageUrl(page - 1)}>
                <Button variant="secondary" size="sm">
                  Previous
                </Button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={pageUrl(page + 1)}>
                <Button variant="primary" size="sm">
                  Next
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}