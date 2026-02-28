// src/app/admin/orders/page.tsx

import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { AdminOrderListItem, OrderStatus as OrderStatusType } from '@/lib/types';
import { ClientOrdersWrapper } from './ClientOrdersWrapper';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface AdminOrdersPageProps {
  searchParams: {
    status?: string;
    page?: string;
    search?: string;
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const LIMIT = 20;

const ORDER_STATUSES = [
  'ALL',
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

/**
 * Serialises a Prisma order row to an AdminOrderListItem, converting Decimal
 * fields to numbers so the object is safe to pass to Client Components.
 */
function serialiseOrder(
  order: Awaited<ReturnType<typeof fetchOrders>>[0],
): AdminOrderListItem {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    // Extra fields forwarded for the detail modal but typed loosely on AdminOrderListItem
    ...(order.customerAddress ? { customerAddress: order.customerAddress } : {}),
    ...(order.transactionId ? { transactionId: order.transactionId } : {}),
    ...(order.notes ? { notes: order.notes } : {}),
    total: parseFloat(order.total.toString()),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      productNameEn: item.productNameEn,
      productNameBn: item.productNameBn,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice.toString()),
      total: parseFloat(item.total.toString()),
      variantInfo: item.variantInfo ?? null,
    })),
  };
}

// ─────────────────────────────────────────────
// Data Fetching
// ─────────────────────────────────────────────

/**
 * Fetches a paginated page of orders from the database.
 * @param where - Prisma where clause derived from searchParams.
 * @param page - The current page number (1-indexed).
 * @returns Array of order rows including nested items.
 */
async function fetchOrders(
  where: Prisma.OrderWhereInput,
  page: number,
) {
  return prisma.order.findMany({
    where,
    include: {
      items: true,
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * LIMIT,
    take: LIMIT,
  });
}

// ─────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────

/**
 * Admin orders page. Server component that fetches paginated, filterable orders
 * from Prisma and renders them inside a co-located ClientOrdersWrapper island
 * that handles status change API calls and filter/search URL updates.
 * @param searchParams - URL search parameters for status, page, and search filters.
 * @returns The admin orders page with table and pagination.
 */
export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  // ── Auth guard ──────────────────────────────
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/signin');
  }

  // ── Params ───────────────────────────────────
  const page = Math.max(1, Number(searchParams.page) || 1);
  const statusFilter =
    searchParams.status && searchParams.status !== 'ALL'
      ? searchParams.status
      : undefined;
  const search = searchParams.search?.trim() || undefined;

  // ── Where clause ─────────────────────────────
  const where: Prisma.OrderWhereInput = {
    ...(statusFilter && { orderStatus: statusFilter as OrderStatusType }),
    ...(search && {
      OR: [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } },
        { orderNumber: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  // ── Data fetch ───────────────────────────────
  const [rawOrders, total] = await Promise.all([
    fetchOrders(where, page),
    prisma.order.count({ where }),
  ]);

  const orders: AdminOrderListItem[] = rawOrders.map(serialiseOrder);
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // ── Build pagination href helper ─────────────
  function pageHref(p: number): string {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);
    params.set('page', String(p));
    return `/admin/orders?${params.toString()}`;
  }

  // ─────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Orders</h1>
          <p className="text-sm text-brand-text/50 mt-0.5">
            {total} order{total !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>

      {/* Client island: filter controls + table + status updates */}
      <ClientOrdersWrapper
        orders={orders}
        initialStatus={searchParams.status || 'ALL'}
        initialSearch={search || ''}
        statuses={ORDER_STATUSES as unknown as string[]}
      />

      {/* Server-rendered Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          {page > 1 && (
            <Link
              href={pageHref(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-brand-secondary/30 text-sm text-brand-text hover:bg-brand-bg transition-colors"
            >
              ← Previous
            </Link>
          )}

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
            .reduce<(number | '...')[]>((acc, p, idx, arr) => {
              if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                acc.push('...');
              }
              acc.push(p);
              return acc;
            }, [])
            .map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-brand-text/40 text-sm">
                  …
                </span>
              ) : (
                <Link
                  key={p}
                  href={pageHref(p as number)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    p === page
                      ? 'bg-brand-primary text-white font-medium'
                      : 'border border-brand-secondary/30 text-brand-text hover:bg-brand-bg'
                  }`}
                >
                  {p}
                </Link>
              ),
            )}

          {page < totalPages && (
            <Link
              href={pageHref(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-brand-secondary/30 text-sm text-brand-text hover:bg-brand-bg transition-colors"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}