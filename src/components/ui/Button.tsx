// src/components/ui/Button.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant. Defaults to 'primary'. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Controls padding and font size. Defaults to 'md'. */
  size?: 'sm' | 'md' | 'lg';
  /** When true, replaces children with a centered Spinner and disables interaction. */
  isLoading?: boolean;
  /** Optional icon rendered to the left of the button label. */
  leftIcon?: React.ReactNode;
  /** Optional icon rendered to the right of the button label. */
  rightIcon?: React.ReactNode;
}

// ─────────────────────────────────────────────
// Style Maps
// ─────────────────────────────────────────────

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-brand-primary text-white hover:opacity-90',
  secondary:
    'border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white',
  ghost:
    'bg-transparent text-brand-primary hover:bg-brand-primary/10',
  danger:
    'bg-red-600 text-white hover:bg-red-700',
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

/**
 * Reusable animated button with variant, size, loading state, and icon support.
 * Wraps a native <button> in a Framer Motion element for tap and hover micro-interactions.
 * @param variant - Visual style: 'primary' | 'secondary' | 'ghost' | 'danger'.
 * @param size - Padding/font scale: 'sm' | 'md' | 'lg'.
 * @param isLoading - When true, shows a Spinner and disables the button.
 * @param leftIcon - ReactNode rendered before the label.
 * @param rightIcon - ReactNode rendered after the label.
 * @returns A motion.button element with all native button props forwarded.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...rest
}) => {
  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      whileHover={isDisabled ? undefined : { scale: 1.02 }}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={cn(
        BASE_CLASSES,
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      disabled={isDisabled}
      {...(rest as React.ComponentPropsWithoutRef<typeof motion.button>)}
    >
      {isLoading ? (
        <Spinner size={size === 'lg' ? 'md' : 'sm'} />
      ) : (
        <>
          {leftIcon && <span className="shrink-0" suppressHydrationWarning>{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0" suppressHydrationWarning>{rightIcon}</span>}
        </>
      )}
    </motion.button>
  );
};