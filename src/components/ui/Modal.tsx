// src/components/ui/Modal.tsx
'use client';

import React, { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

// ─────────────────────────────────────────────
// Size map
// ─────────────────────────────────────────────

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

/**
 * Portal-based modal with animated backdrop and sliding content panel.
 * Renders via React.createPortal into document.body; returns null during SSR.
 * @param isOpen - Controls whether the modal is visible.
 * @param onClose - Callback invoked when backdrop or close button is clicked.
 * @param title - Optional heading rendered in the modal header.
 * @param children - Modal body content.
 * @param size - Controls max-width of the content panel; defaults to 'md'.
 * @returns A portal-rendered modal overlay, or null if server-side.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        // Backdrop
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
        >
          {/* Content panel */}
          <motion.div
            key="modal-content"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'relative w-full bg-brand-surface rounded-2xl shadow-2xl',
              'flex flex-col max-h-[90vh]',
              SIZE_CLASSES[size],
            )}
          >
            {/* Header */}
            {(title != null) && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-brand-secondary/20 shrink-0">
                <h2 className="text-lg font-semibold text-brand-text truncate pr-4">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  aria-label="Close modal"
                  className="p-1.5 rounded-lg text-brand-text/60 hover:text-brand-text hover:bg-brand-secondary/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* Close button when no title */}
            {title == null && (
              <button
                onClick={onClose}
                aria-label="Close modal"
                className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-brand-text/60 hover:text-brand-text hover:bg-brand-secondary/10 transition-colors"
              >
                <X size={20} />
              </button>
            )}

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};