// src/components/ui/Spinner.tsx

import React from 'react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

const SIZE_CLASSES = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
} as const;

interface SpinnerProps {
  /** Controls the dimensions of the spinner. Defaults to 'md'. */
  size?: keyof typeof SIZE_CLASSES;
  /** Additional Tailwind classes merged onto the SVG element. */
  className?: string;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

/**
 * A lightweight SVG spinner that inherits its color from the parent's text color via currentColor.
 * Uses Tailwind's animate-spin utility — no Framer Motion or external dependency required.
 * Safe to render in both server and client component trees.
 * @param size - 'sm' (16px) | 'md' (24px) | 'lg' (32px). Defaults to 'md'.
 * @param className - Optional extra Tailwind classes merged onto the SVG root element.
 * @returns An animated circular SVG spinner.
 */
export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  return (
    <svg
      className={`animate-spin ${SIZE_CLASSES[size]}${className ? ` ${className}` : ''}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
      role="status"
    >
      {/* Background track — low opacity full circle */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        opacity={0.25}
      />
      {/* Spinning arc — higher opacity quarter-circle path */}
      <path
        fill="currentColor"
        opacity={0.75}
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
};