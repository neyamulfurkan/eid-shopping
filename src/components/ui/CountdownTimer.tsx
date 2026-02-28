// FILE 035: src/components/ui/CountdownTimer.tsx

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface CountdownTimerProps {
  endsAt: Date | string;
  onExpire?: () => void;
}

interface TimerBlockProps {
  value: number;
  label: string;
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

/**
 * Calculates remaining time between now and a future date.
 * @param endsAt - Target date as Date object or ISO string.
 * @returns TimeLeft object with days, hours, minutes, seconds — all zero if expired.
 */
const calculateTimeLeft = (endsAt: Date | string): TimeLeft => {
  const end = endsAt instanceof Date ? endsAt : new Date(endsAt);
  const diff = end.getTime() - Date.now();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
};

/**
 * Determines whether a given end date is already in the past.
 * @param endsAt - Target date as Date object or ISO string.
 * @returns true if the date is in the past or now.
 */
const isExpired = (endsAt: Date | string): boolean => {
  const end = endsAt instanceof Date ? endsAt : new Date(endsAt);
  return end.getTime() <= Date.now();
};

/* ─────────────────────────────────────────────
   SUB-COMPONENT: TimerBlock
   Renders a single flip-card style digit block
   with an animated number transition.
───────────────────────────────────────────── */

const TimerBlock: React.FC<TimerBlockProps> = ({ value, label }) => {
  const displayValue = String(value).padStart(2, '0');

  return (
    <div className="flex flex-col items-center">
      <div className="relative rounded-xl bg-brand-primary text-white px-3 py-2 min-w-[52px] text-center overflow-hidden shadow-md">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={displayValue}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="block text-2xl font-bold leading-none tabular-nums"
          >
            {displayValue}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="mt-1.5 text-xs font-medium text-brand-text/60 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
};

/* ─────────────────────────────────────────────
   SEPARATOR
───────────────────────────────────────────── */

const Separator: React.FC = () => (
  <span className="text-brand-primary font-bold text-xl self-start mt-2 select-none" aria-hidden="true">
    :
  </span>
);

/* ─────────────────────────────────────────────
   MAIN COMPONENT: CountdownTimer
───────────────────────────────────────────── */

/**
 * Real-time countdown timer displaying days, hours, minutes, seconds.
 * @param endsAt - Target end date (Date or ISO string).
 * @param onExpire - Optional callback invoked once when the timer reaches zero.
 */
export const CountdownTimer: React.FC<CountdownTimerProps> = ({ endsAt, onExpire }) => {
  // Always start with zeros — matches server render exactly (no Date.now() on SSR).
  // The useEffect below corrects this after hydration completes.
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired]   = useState<boolean>(false);
  const [mounted, setMounted]   = useState<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpireRef = useRef(onExpire);

  // Keep callback ref stable to avoid re-registering the interval on every render
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Set mounted=true after hydration so the timer only renders on the client.
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // If already expired on mount, fire callback immediately and bail out
    if (isExpired(endsAt)) {
      setExpired(true);
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      onExpireRef.current?.();
      return;
    }

    setExpired(false);
    setTimeLeft(calculateTimeLeft(endsAt));

    intervalRef.current = setInterval(() => {
      const next = calculateTimeLeft(endsAt);
      setTimeLeft(next);

      if (next.days === 0 && next.hours === 0 && next.minutes === 0 && next.seconds === 0) {
        setExpired(true);
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onExpireRef.current?.();
      }
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [endsAt, mounted]);

  // Render nothing until client has mounted — avoids SSR/client HTML mismatch.
  if (!mounted) return null;

  if (expired) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center rounded-xl bg-red-100 text-red-700 px-4 py-2 text-sm font-semibold"
        role="status"
        aria-label="Offer expired"
      >
        Expired
      </motion.div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5"
      role="timer"
      aria-label={`Time remaining: ${timeLeft.days} days, ${timeLeft.hours} hours, ${timeLeft.minutes} minutes, ${timeLeft.seconds} seconds`}
      aria-live="off"
    >
      {timeLeft.days > 0 && (
        <>
          <TimerBlock value={timeLeft.days} label="DD" />
          <Separator />
        </>
      )}
      <TimerBlock value={timeLeft.hours} label="HH" />
      <Separator />
      <TimerBlock value={timeLeft.minutes} label="MM" />
      <Separator />
      <TimerBlock value={timeLeft.seconds} label="SS" />
    </div>
  );
};

export default CountdownTimer;