// FILE 069: src/components/admin/ReviewModerator.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { StarRating } from '@/components/ui/StarRating';
import { Button } from '@/components/ui/Button';
import { formatDate, truncate } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewWithProduct {
  id: string;
  productId: string;
  reviewerName: string;
  rating: number;
  comment: string | null;
  isApproved: boolean;
  createdAt: string;
  product: {
    nameEn: string;
  };
}

type TabFilter = 'all' | 'pending' | 'approved';

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Admin review moderation table with approve/reject/delete actions and
 * filter tabs for pending and approved reviews.
 * Fetches all reviews from GET /api/reviews?all=true on mount and after
 * each mutation.
 */
export const ReviewModerator: React.FC = () => {
  const { showToast } = useToast();

  const [reviews, setReviews] = useState<ReviewWithProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // ─── Data Fetching ───────────────────────────────────────────────────────

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/reviews?all=true');
      if (!res.ok) throw new Error('Failed to fetch reviews');
      const json = await res.json();
      setReviews(json.data ?? []);
    } catch {
      showToast('Failed to load reviews. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  /**
   * Approves a review by PATCHing the reviews API with isApproved: true.
   * @param id - The review id to approve.
   */
  const handleApprove = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isApproved: true }),
      });
      if (!res.ok) throw new Error('Failed to approve review');
      showToast('Review approved successfully.', 'success');
      await fetchReviews();
    } catch {
      showToast('Failed to approve review. Please try again.', 'error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  /**
   * Deletes a review after user confirms via window.confirm.
   * @param id - The review id to delete.
   */
  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this review? This action cannot be undone.',
    );
    if (!confirmed) return;

    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch('/api/reviews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete review');
      showToast('Review deleted.', 'success');
      await fetchReviews();
    } catch {
      showToast('Failed to delete review. Please try again.', 'error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  /**
   * Toggles the expanded state of a review comment.
   * @param id - The review id whose comment to toggle.
   */
  const toggleComment = (id: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ─── Filtered Data ───────────────────────────────────────────────────────

  const filteredReviews = reviews.filter((r) => {
    if (activeTab === 'pending') return !r.isApproved;
    if (activeTab === 'approved') return r.isApproved;
    return true;
  });

  const pendingCount = reviews.filter((r) => !r.isApproved).length;

  // ─── Tab Config ──────────────────────────────────────────────────────────

  const TABS: { key: TabFilter; label: string }[] = [
    { key: 'all', label: `All (${reviews.length})` },
    { key: 'pending', label: `Pending (${pendingCount})` },
    { key: 'approved', label: `Approved (${reviews.length - pendingCount})` },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-brand-text">Customer Reviews</h2>
        <p className="text-sm text-brand-text/60 mt-1">
          Approve or remove customer reviews before they appear on product pages.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-brand-secondary/20">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-text/60 hover:text-brand-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-brand-text/40">
            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading reviews…</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredReviews.length === 0 && (
        <div className="text-center py-16 text-brand-text/40">
          <p className="text-lg font-medium">No reviews found</p>
          <p className="text-sm mt-1">
            {activeTab === 'pending'
              ? 'All reviews have been moderated.'
              : activeTab === 'approved'
              ? 'No approved reviews yet.'
              : 'No reviews have been submitted yet.'}
          </p>
        </div>
      )}

      {/* Reviews Table */}
      {!isLoading && filteredReviews.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-brand-secondary/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-surface border-b border-brand-secondary/20 text-left">
                <th className="px-4 py-3 font-semibold text-brand-text/70 whitespace-nowrap">Product</th>
                <th className="px-4 py-3 font-semibold text-brand-text/70 whitespace-nowrap">Reviewer</th>
                <th className="px-4 py-3 font-semibold text-brand-text/70 whitespace-nowrap">Rating</th>
                <th className="px-4 py-3 font-semibold text-brand-text/70 min-w-[200px]">Comment</th>
                <th className="px-4 py-3 font-semibold text-brand-text/70 whitespace-nowrap">Date</th>
                <th className="px-4 py-3 font-semibold text-brand-text/70 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 font-semibold text-brand-text/70 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-secondary/10">
              {filteredReviews.map((review) => {
                const isExpanded = expandedComments.has(review.id);
                const comment = review.comment ?? '';
                const isLong = comment.length > 100;
                const isActing = actionLoading[review.id] ?? false;

                return (
                  <tr
                    key={review.id}
                    className="bg-brand-surface hover:bg-brand-bg/50 transition-colors align-top"
                  >
                    {/* Product */}
                    <td className="px-4 py-3 font-medium text-brand-text whitespace-nowrap max-w-[150px]">
                      <span
                        className="block truncate"
                        title={review.product.nameEn}
                      >
                        {review.product.nameEn}
                      </span>
                    </td>

                    {/* Reviewer */}
                    <td className="px-4 py-3 text-brand-text/80 whitespace-nowrap">
                      {review.reviewerName}
                    </td>

                    {/* Rating */}
                    <td className="px-4 py-3">
                      <StarRating value={review.rating} size="sm" interactive={false} />
                    </td>

                    {/* Comment */}
                    <td className="px-4 py-3 text-brand-text/70">
                      {comment ? (
                        <div>
                          <p className="leading-relaxed">
                            {isExpanded ? comment : truncate(comment, 100)}
                          </p>
                          {isLong && (
                            <button
                              onClick={() => toggleComment(review.id)}
                              className="mt-1 flex items-center gap-1 text-xs text-brand-primary hover:underline"
                            >
                              {isExpanded ? (
                                <>
                                  Show less <ChevronUp className="w-3 h-3" />
                                </>
                              ) : (
                                <>
                                  Show more <ChevronDown className="w-3 h-3" />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="italic text-brand-text/30">No comment</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-brand-text/60 whitespace-nowrap text-xs">
                      {formatDate(review.createdAt)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {review.isApproved ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {!review.isApproved && (
                          <Button
                            variant="ghost"
                            size="sm"
                            isLoading={isActing}
                            leftIcon={<CheckCircle className="w-4 h-4 text-green-600" />}
                            onClick={() => handleApprove(review.id)}
                            className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 px-2"
                            title="Approve review"
                          >
                            Approve
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          isLoading={isActing}
                          leftIcon={<Trash2 className="w-4 h-4 text-red-500" />}
                          onClick={() => handleDelete(review.id)}
                          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2"
                          title="Delete review"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};