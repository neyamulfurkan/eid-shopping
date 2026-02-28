// src/components/storefront/CategoryFilter.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface Category {
  id: string;
  nameEn: string;
  nameBn: string;
  slug: string;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedSlug: string | null;
  onChange: (slug: string | null) => void;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

/**
 * Horizontally scrollable category filter pill row with a smooth Framer Motion
 * layout-animated active indicator that slides between selected pills.
 *
 * @param categories  - List of categories to display as filter pills.
 * @param selectedSlug - Currently active category slug, or null for "All".
 * @param onChange    - Callback invoked with the new slug (or null for All).
 */
export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedSlug,
  onChange,
}) => {
  const { lang, t } = useLanguage();

  const allLabel = lang === 'bn' ? 'সব' : 'All';

  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto py-2',
        // Hide scrollbar cross-browser
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
      )}
      role="listbox"
      aria-label={lang === 'bn' ? 'ক্যাটাগরি ফিল্টার' : 'Category filter'}
    >
      {/* ── All pill ── */}
      <Pill
        label={allLabel}
        isSelected={selectedSlug === null}
        onClick={() => onChange(null)}
        pillId="all"
      />

      {/* ── Category pills ── */}
      {categories.map((cat) => (
        <Pill
          key={cat.id}
          label={lang === 'bn' ? cat.nameBn : cat.nameEn}
          isSelected={selectedSlug === cat.slug}
          onClick={() => onChange(cat.slug)}
          pillId={cat.id}
        />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// Pill sub-component
// ─────────────────────────────────────────────

interface PillProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  pillId: string;
}

/**
 * Individual filter pill. When selected, renders a Framer Motion layoutId
 * background span that animates smoothly between sibling pills.
 *
 * @param label      - Display text for the pill.
 * @param isSelected - Whether this pill is currently active.
 * @param onClick    - Selection handler.
 * @param pillId     - Unique key used for React and motion layout tracking.
 */
const Pill: React.FC<PillProps> = ({ label, isSelected, onClick, pillId }) => (
  <button
    type="button"
    role="option"
    aria-selected={isSelected}
    onClick={onClick}
    className={cn(
      'relative flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap',
      'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2',
      'focus-visible:ring-brand-primary focus-visible:ring-offset-2',
      isSelected
        ? 'text-white'
        : 'bg-brand-surface border border-brand-secondary/30 text-brand-text hover:border-brand-primary/50',
    )}
  >
    {/* Animated background for selected state */}
    {isSelected && (
      <motion.span
        layoutId="category-active"
        className="absolute inset-0 rounded-full bg-brand-primary"
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        style={{ zIndex: 0 }}
      />
    )}

    {/* Label sits above the animated background */}
    <span className="relative z-10">{label}</span>
  </button>
);