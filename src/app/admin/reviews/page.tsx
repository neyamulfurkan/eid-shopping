// FILE 105: src/app/admin/reviews/page.tsx

import React from 'react';
import { ReviewModerator } from '@/components/admin/ReviewModerator';

/**
 * Admin reviews page that renders a page header and the ReviewModerator
 * component, which handles all data fetching and moderation actions.
 * @returns The admin review moderation page.
 */
export default function AdminReviewsPage(): React.JSX.Element {
  return (
    <div className="p-6 space-y-2">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Review Moderation</h1>
        <p className="text-sm text-brand-text/60 mt-1">
          Approve or reject customer reviews before they appear on the storefront.
        </p>
      </div>
      <ReviewModerator />
    </div>
  );
}