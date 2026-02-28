// src/components/storefront/ReviewsSection.tsx
'use client';

import React, { useState } from 'react';
import type { Review } from '@prisma/client';
import { StarRating } from '@/components/ui/StarRating';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/lib/utils';
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ReviewsSectionProps {
  productId: string;
  reviews: Review[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Computes the average rating from an array of reviews.
 * @param reviews - Array of Review objects.
 * @returns Average rating rounded to one decimal, or 0 if no reviews.
 */
function computeAverage(reviews: Review[]): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

/**
 * Counts how many reviews have each star rating (1–5).
 * @param reviews - Array of Review objects.
 * @returns Record mapping star value to count.
 */
function computeBreakdown(reviews: Review[]): Record<number, number> {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    if (r.rating >= 1 && r.rating <= 5) counts[r.rating]++;
  }
  return counts;
}

// ─────────────────────────────────────────────
// Sub-component: Summary bar
// ─────────────────────────────────────────────

interface SummaryBarProps {
  reviews: Review[];
}

const ReviewSummaryBar: React.FC<SummaryBarProps> = ({ reviews }) => {
  const average = computeAverage(reviews);
  const breakdown = computeBreakdown(reviews);
  const total = reviews.length;

  return (
    <div className="flex flex-col sm:flex-row gap-6 p-4 bg-brand-surface rounded-xl border border-brand-secondary/20 mb-6">
      {/* Average score */}
      <div className="flex flex-col items-center justify-center min-w-[100px] gap-1">
        <span className="text-4xl font-bold text-brand-text">
          {total > 0 ? average.toFixed(1) : '—'}
        </span>
        <StarRating value={Math.round(average)} size="sm" />
        <span className="text-sm text-brand-text/60">
          {total} {total === 1 ? 'review' : 'reviews'}
        </span>
      </div>

      {/* Star breakdown */}
      <div className="flex-1 flex flex-col gap-1.5 justify-center">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = breakdown[star] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-sm">
              <span className="w-4 text-right text-brand-text/70 shrink-0">{star}</span>
              <div className="flex-1 h-2 bg-brand-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 text-brand-text/60 shrink-0">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Sub-component: Individual review card
// ─────────────────────────────────────────────

interface ReviewCardProps {
  review: Review;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = (review.comment?.length ?? 0) > 200;
  const displayComment =
    isLong && !expanded
      ? review.comment!.slice(0, 200) + '…'
      : (review.comment ?? '');

  return (
    <div className="py-4 border-b border-brand-secondary/10 last:border-0">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-brand-text text-sm">
            {review.reviewerName}
          </span>
          <StarRating value={review.rating} size="sm" />
        </div>
        <span className="text-xs text-brand-text/50 shrink-0 mt-0.5">
          {formatDate(review.createdAt)}
        </span>
      </div>
      {review.comment && (
        <div className="mt-2">
          <p className="text-sm text-brand-text/80 leading-relaxed">{displayComment}</p>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 flex items-center gap-1 text-xs text-brand-primary hover:underline"
            >
              {expanded ? (
                <>Show less <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>Show more <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

/**
 * Displays a product's approved reviews with summary statistics and a submission form.
 * @param productId - The product's DB id, sent with the review POST request.
 * @param reviews - Pre-filtered array of approved Review objects from the server.
 */
export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  productId,
  reviews,
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();

  // ── Form state ──────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedRating, setSelectedRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Validation ──────────────────────────────
  const [errors, setErrors] = useState<{
    name?: string;
    rating?: string;
  }>({});

  /**
   * Validates the review form fields.
   * @returns true if all fields are valid, false otherwise.
   */
  function validate(): boolean {
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = 'Name must be at least 2 characters.';
    if (selectedRating === 0) next.rating = 'Please select a star rating.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  /**
   * Resets the review form to its initial empty state.
   */
  function resetForm() {
    setName('');
    setSelectedRating(0);
    setComment('');
    setErrors({});
  }

  /**
   * Handles review form submission. POSTs to /api/reviews and shows a toast on success or error.
   * @param e - React form submit event.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          reviewerName: name.trim(),
          rating: selectedRating,
          comment: comment.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? 'Failed to submit review.');
      }

      showToast(t('msg.reviewSubmitted'), 'success');
      resetForm();
      setIsFormOpen(false);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Something went wrong.',
        'error',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <section className="mt-10">
      {/* Section heading */}
      <h2 className="text-xl font-bold text-brand-text mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-brand-primary" aria-hidden="true" />
        {t('label.reviews')}
      </h2>

      {/* Summary statistics — only shown when there are reviews */}
      {reviews.length > 0 && <ReviewSummaryBar reviews={reviews} />}

      {/* Review list */}
      {reviews.length === 0 ? (
        <p className="text-brand-text/60 text-sm py-4">{t('msg.noReviews')}</p>
      ) : (
        <div className="mb-6">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {/* Write a review toggle */}
      {!isFormOpen && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsFormOpen(true)}
        >
          {t('btn.writeReview')}
        </Button>
      )}

      {/* Inline review form */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 p-5 rounded-xl border border-brand-secondary/20 bg-brand-surface space-y-4"
          noValidate
        >
          <h3 className="font-semibold text-brand-text">{t('btn.writeReview')}</h3>

          {/* Name */}
          <div>
            <label
              htmlFor="review-name"
              className="block text-sm font-medium text-brand-text mb-1"
            >
              {t('checkout.name')}
            </label>
            <input
              id="review-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-base w-full"
              placeholder={t('checkout.name')}
              autoComplete="name"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Star rating selector */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              {t('label.rating')}
            </label>
            <StarRating
              value={selectedRating}
              interactive
              onChange={setSelectedRating}
              size="lg"
            />
            {errors.rating && (
              <p className="mt-1 text-xs text-red-500">{errors.rating}</p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label
              htmlFor="review-comment"
              className="block text-sm font-medium text-brand-text mb-1"
            >
              {t('label.comment')}
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="input-base w-full resize-none"
              placeholder={t('label.commentPlaceholder')}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              {t('btn.submitReview')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                resetForm();
                setIsFormOpen(false);
              }}
              disabled={isSubmitting}
            >
              {t('btn.cancel')}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
};