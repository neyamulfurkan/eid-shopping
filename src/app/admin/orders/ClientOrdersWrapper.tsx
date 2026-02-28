// src/app/admin/orders/ClientOrdersWrapper.tsx
'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronDown } from 'lucide-react';
import { OrderTable } from '@/components/admin/OrderTable';
import { useToast } from '@/context/ToastContext';
import type { AdminOrderListItem } from '@/lib/types';
import { OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ClientOrdersWrapperProps {
  orders: AdminOrderListItem[];
  initialStatus: string;
  initialSearch: string;
  statuses: string[];
}

/**
 * Client island wrapping OrderTable with filter controls (status dropdown + search)
 * and the status-change API call handler. Updates the URL to trigger server re-renders.
 * @param orders - Pre-fetched orders from the server component.
 * @param initialStatus - The currently active status filter value.
 * @param initialSearch - The current search query string.
 * @param statuses - Array of valid status filter values including 'ALL'.
 */
export const ClientOrdersWrapper: React.FC<ClientOrdersWrapperProps> = ({
  orders,
  initialStatus,
  initialSearch,
  statuses,
}) => {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [searchValue, setSearchValue] = useState(initialSearch);
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // orderId being updated

  // ── Filter helpers ────────────────────────────

  /**
   * Pushes a new URL with updated filter/search params, resetting to page 1.
   * @param overrides - Partial filter state to merge into the current filters.
   */
  function applyFilters(overrides: { status?: string; search?: string }) {
    const params = new URLSearchParams();
    const status = overrides.status ?? initialStatus;
    const search = overrides.search ?? searchValue;

    if (status && status !== 'ALL') params.set('status', status);
    if (search) params.set('search', search);
    params.set('page', '1');

    startTransition(() => {
      router.push(`/admin/orders?${params.toString()}`);
    });
  }

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    applyFilters({ status: e.target.value });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ search: searchValue });
  };

  const handleSearchClear = () => {
    setSearchValue('');
    applyFilters({ search: '' });
  };

  // ── Status change handler ─────────────────────

  /**
   * Calls PATCH /api/orders/[orderId] with the new status, then refreshes
   * the server component data. Shows a toast on success or failure.
   * @param orderId - The ID of the order to update.
   * @param status - The new OrderStatus value to set.
   */
  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    setIsUpdating(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: status }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || 'Failed to update order status');
      }

      showToast('Order status updated.', 'success');
      router.refresh();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Could not update order status.',
        'error',
      );
    } finally {
      setIsUpdating(null);
    }
  };

  // ─────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status Filter */}
        <div className="relative">
          <select
            value={initialStatus}
            onChange={handleStatusFilterChange}
            className={cn(
              'appearance-none pl-3 pr-8 py-2 rounded-xl border border-brand-secondary/30',
              'bg-brand-surface text-brand-text text-sm',
              'focus:outline-none focus:ring-2 focus:ring-brand-primary/30',
              'cursor-pointer min-w-[160px]',
            )}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'All Statuses' : s}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-text/40 pointer-events-none"
          />
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/40"
            />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search by name, phone, order #…"
              className={cn(
                'w-full pl-9 pr-8 py-2 rounded-xl border border-brand-secondary/30',
                'bg-brand-surface text-brand-text text-sm placeholder:text-brand-text/40',
                'focus:outline-none focus:ring-2 focus:ring-brand-primary/30',
              )}
            />
            {searchValue && (
              <button
                type="button"
                onClick={handleSearchClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-text/40 hover:text-brand-text transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className={cn(
              'px-4 py-2 rounded-xl bg-brand-primary text-white text-sm font-medium',
              'hover:opacity-90 transition-opacity',
              isPending && 'opacity-60 cursor-not-allowed',
            )}
            disabled={isPending}
          >
            Search
          </button>
        </form>

        {/* Pending indicator */}
        {(isPending || isUpdating) && (
          <span className="text-xs text-brand-text/40 self-center animate-pulse">
            Updating…
          </span>
        )}
      </div>

      {/* Orders Table */}
      <OrderTable orders={orders} onStatusChange={handleStatusChange} />
    </div>
  );
};