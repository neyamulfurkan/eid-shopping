// src/components/ui/Toast.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  /** The notification message to display */
  message: string;
  /** Visual style variant */
  type: ToastType;
  /** Callback invoked when the user manually closes the toast */
  onClose: () => void;
}

// ─── Style Maps ───────────────────────────────────────────────────────────────

const CONTAINER_STYLES: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-500 text-green-800',
  error:   'bg-red-50   border-red-500   text-red-800',
  info:    'bg-blue-50  border-blue-500  text-blue-800',
};

const CLOSE_BUTTON_STYLES: Record<ToastType, string> = {
  success: 'text-green-600 hover:text-green-900',
  error:   'text-red-600   hover:text-red-900',
  info:    'text-blue-600  hover:text-blue-900',
};

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const ICONS: Record<ToastType, React.ReactElement> = {
  success: <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />,
  error:   <XCircle    className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />,
  info:    <Info       className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />,
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Animated toast notification rendered by ToastContext's overlay container.
 * Slides in from the right on mount and exits to the right on removal.
 * Not intended for standalone use — always rendered via ToastProvider.
 * @param message - The notification text displayed in the toast body.
 * @param type    - Controls icon and color scheme: 'success' | 'error' | 'info'.
 * @param onClose - Called when the user clicks the close button.
 * @returns An animated toast card.
 */
export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  return (
    <motion.div
      role="alert"
      aria-live="assertive"
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0,   opacity: 1 }}
      exit={{    x: 100, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={[
        'flex items-start gap-3 p-4 rounded-xl border shadow-lg w-80',
        CONTAINER_STYLES[type],
      ].join(' ')}
    >
      {/* Type icon */}
      {ICONS[type]}

      {/* Message */}
      <span className="flex-1 text-sm font-medium leading-snug">
        {message}
      </span>

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className={[
          'shrink-0 mt-0.5 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          CLOSE_BUTTON_STYLES[type],
        ].join(' ')}
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </motion.div>
  );
};

export default Toast;