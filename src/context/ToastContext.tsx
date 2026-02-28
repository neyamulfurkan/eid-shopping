'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { AnimatePresence } from 'framer-motion';
import Toast from '@/components/ui/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  /** Display a toast notification */
  showToast: (message: string, type: ToastType) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Provides a global toast notification system with auto-dismiss after 3 s and
 * a maximum of 3 simultaneous toasts (oldest removed when limit is exceeded).
 */
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Track timeout IDs so we can clear them on unmount
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // Clean up all timers when the provider unmounts
  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  /**
   * Removes a single toast by id and clears its associated timer.
   * @param id - The unique toast id
   */
  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  /**
   * Adds a new toast, enforces the 3-toast maximum (removes oldest if needed),
   * and schedules auto-dismiss after 3000 ms.
   * @param message - The notification text
   * @param type - Visual style: 'success' | 'error' | 'info'
   */
  const showToast = useCallback(
    (message: string, type: ToastType) => {
      const id = Date.now();

      setToasts((prev) => {
        const updated = [...prev, { id, message, type }];
        // Keep only the most recent 3 toasts; remove overflow from the front
        if (updated.length > 3) {
          const removed = updated.shift()!;
          // Clear the timer for the evicted toast
          const evictedTimer = timers.current.get(removed.id);
          if (evictedTimer) {
            clearTimeout(evictedTimer);
            timers.current.delete(removed.id);
          }
        }
        return updated;
      });

      // Schedule auto-dismiss
      const timer = setTimeout(() => removeToast(id), 3000);
      timers.current.set(id, timer);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Fixed overlay container — bottom-right, above everything */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the toast context value.
 * @throws If called outside of a ToastProvider
 * @returns {{ showToast }} - Function to trigger toast notifications
 */
export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};