// src/components/storefront/HeroSlider.tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Banner } from '@prisma/client';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const AUTO_ADVANCE_MS = 5000;

const SLIDE_VARIANTS = {
  enter: { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

const SLIDE_TRANSITION = {
  duration: 0.4,
  ease: 'easeInOut' as const,
};

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface HeroSliderProps {
  banners: Banner[];
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

interface ArrowButtonProps {
  direction: 'left' | 'right';
  onClick: () => void;
}

const ArrowButton: React.FC<ArrowButtonProps> = ({ direction, onClick }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    aria-label={direction === 'left' ? 'Previous slide' : 'Next slide'}
    className="
      absolute top-1/2 -translate-y-1/2 z-20
      flex items-center justify-center
      w-10 h-10 rounded-full
      bg-white/20 backdrop-blur-sm
      text-white border border-white/30
      hover:bg-white/35 transition-colors
      focus:outline-none focus-visible:ring-2 focus-visible:ring-white
    "
    style={{ [direction === 'left' ? 'left' : 'right']: '1rem' }}
  >
    {direction === 'left'
      ? <ChevronLeft size={22} strokeWidth={2.5} />
      : <ChevronRight size={22} strokeWidth={2.5} />
    }
  </motion.button>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

/**
 * Full-width hero image slider with auto-advance, bilingual text overlays,
 * dot navigation, and arrow controls.
 *
 * @param banners - Array of active Banner records from the database.
 * @returns An animated hero slider, or a branded placeholder if banners is empty.
 */
export const HeroSlider: React.FC<HeroSliderProps> = ({ banners }) => {
  const { lang } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Helpers ──────────────────────────────────

  const totalSlides = banners.length;

  const goTo = useCallback((index: number) => {
    setCurrentIndex((index + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);
  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);

  // ── Auto-advance ──────────────────────────────

  const startInterval = useCallback(() => {
    if (totalSlides <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % totalSlides);
    }, AUTO_ADVANCE_MS);
  }, [totalSlides]);

  const clearAutoAdvance = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /** Restart the timer whenever the index changes (manual or automatic). */
  useEffect(() => {
    clearAutoAdvance();
    startInterval();
    return clearAutoAdvance;
  }, [currentIndex, startInterval, clearAutoAdvance]);

  // ── Empty state ───────────────────────────────

  if (totalSlides === 0) {
    return (
      <div className="w-full h-[500px] bg-brand-primary flex items-center justify-center">
        <p className="text-white/60 text-lg font-medium">
          {lang === 'bn' ? 'কোনো ব্যানার নেই' : 'No banners configured'}
        </p>
      </div>
    );
  }

  // ── Current slide data ────────────────────────

  const slide = banners[currentIndex];
  const title     = (lang === 'bn' && slide.titleBn)    ? slide.titleBn    : slide.titleEn    ?? '';
  const subtitle  = (lang === 'bn' && slide.subtitleBn) ? slide.subtitleBn : slide.subtitleEn ?? '';
  const ctaText   = (lang === 'bn' && slide.ctaTextBn)  ? slide.ctaTextBn  : slide.ctaTextEn  ?? '';

  // ── Render ────────────────────────────────────

  return (
    <section
      aria-label="Hero image slider"
      className="relative w-full overflow-hidden"
      style={{ height: 'clamp(280px, 56vw, 600px)' }}
    >
      {/* ── Slides ── */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentIndex}
          variants={SLIDE_VARIANTS}
          initial="enter"
          animate="center"
          exit="exit"
          transition={SLIDE_TRANSITION}
          className="absolute inset-0"
        >
          {/* Background image */}
          <Image
            src={slide.imageUrl}
            alt={title || `Hero slide ${currentIndex + 1}`}
            fill
            priority={currentIndex === 0}
            sizes="100vw"
            className="object-cover object-center"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

          {/* Text content */}
          {(title || subtitle || ctaText) && (
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 px-4 sm:pb-20 sm:px-8 text-center z-10">
              {title && (
                <motion.h1
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="
                    text-white font-bold
                    text-2xl sm:text-4xl lg:text-5xl
                    leading-tight drop-shadow-lg
                    max-w-3xl
                  "
                >
                  {title}
                </motion.h1>
              )}

              {subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  className="
                    mt-2 text-white/90
                    text-sm sm:text-lg
                    drop-shadow max-w-xl
                  "
                >
                  {subtitle}
                </motion.p>
              )}

              {ctaText && slide.ctaLink && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.4 }}
                  className="mt-5"
                >
                  <Link href={slide.ctaLink} tabIndex={-1}>
                    <Button
                      variant="primary"
                      size="lg"
                      className="shadow-xl"
                    >
                      {ctaText}
                    </Button>
                  </Link>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Arrow navigation ── */}
      {totalSlides > 1 && (
        <>
          <ArrowButton direction="left"  onClick={goPrev} />
          <ArrowButton direction="right" onClick={goNext} />
        </>
      )}

      {/* ── Dot navigation ── */}
      {totalSlides > 1 && (
        <div
          role="tablist"
          aria-label="Slide navigation"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2"
        >
          {banners.map((_, i) => (
            <motion.button
              key={i}
              role="tab"
              aria-selected={i === currentIndex}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => goTo(i)}
              animate={{
                width:   i === currentIndex ? 24 : 8,
                opacity: i === currentIndex ? 1  : 0.55,
              }}
              transition={{ duration: 0.25 }}
              className="
                h-2 rounded-full bg-white
                focus:outline-none focus-visible:ring-2 focus-visible:ring-white
              "
            />
          ))}
        </div>
      )}
    </section>
  );
};