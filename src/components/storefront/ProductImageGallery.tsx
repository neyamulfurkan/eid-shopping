'use client';

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ProductImage {
  url: string;
  cloudinaryId: string;
}

interface ProductImageGalleryProps {
  images: ProductImage[];
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

/**
 * Multi-image product gallery with thumbnail navigation,
 * hover zoom on desktop, and swipe support on mobile.
 */
export const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({ images }) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [transformOrigin, setTransformOrigin] = useState<string>('50% 50%');

  const mainImageRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number>(0);

  // ─── Derived ───────────────────────────────

  const hasMultiple = images.length > 1;
  const currentImage = images[selectedIndex] ?? images[0];

  // ─── Zoom Handlers (desktop only) ──────────

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTransformOrigin(`${x}% ${y}%`);
  }, []);

  const handleMouseEnter = useCallback(() => {
    // Only zoom on non-touch devices
    if (window.matchMedia('(hover: hover)').matches) {
      setIsZoomed(true);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsZoomed(false);
    setTransformOrigin('50% 50%');
  }, []);

  // ─── Swipe Handlers (mobile) ───────────────

  const handleDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number } }) => {
      const threshold = 50;
      if (info.offset.x < -threshold) {
        // Swipe left → next
        setSelectedIndex((prev) => (prev + 1) % images.length);
      } else if (info.offset.x > threshold) {
        // Swipe right → previous
        setSelectedIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    },
    [images.length],
  );

  // ─── Render ────────────────────────────────

  if (!currentImage) return null;

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row md:gap-4">
      {/* ── Thumbnail Strip ──────────────────── */}
      {hasMultiple && (
        <div className="flex flex-row gap-2 overflow-x-auto md:flex-col md:overflow-x-visible md:overflow-y-auto scrollbar-hide">
          {images.map((image, index) => (
            <button
              key={image.cloudinaryId || index}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={[
                'relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden',
                'transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                index === selectedIndex
                  ? 'ring-2 ring-brand-primary ring-offset-1'
                  : 'ring-1 ring-gray-200 hover:ring-brand-secondary opacity-70 hover:opacity-100',
              ].join(' ')}
              aria-label={`View image ${index + 1}`}
              aria-pressed={index === selectedIndex}
            >
              <Image
                src={image.url}
                alt={`Product thumbnail ${index + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* ── Main Image ───────────────────────── */}
      <div className="relative flex-1 min-w-0">
        <div
          ref={mainImageRef}
          className={[
            'relative w-full overflow-hidden rounded-2xl bg-brand-surface',
            'zoom-container',
            isZoomed ? 'cursor-zoom-in' : 'cursor-default',
          ].join(' ')}
          style={{ aspectRatio: '3 / 4' }}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selectedIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="absolute inset-0"
              drag={hasMultiple ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
            >
              <div
                className="w-full h-full"
                style={{
                  transformOrigin,
                  transform: isZoomed ? 'scale(2)' : 'scale(1)',
                  transition: isZoomed ? 'none' : 'transform 0.3s ease',
                }}
              >
                <Image
                  src={currentImage.url}
                  alt={`Product image ${selectedIndex + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover pointer-events-none select-none"
                  priority={selectedIndex === 0}
                  draggable={false}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Mobile dot indicators ─────────── */}
        {hasMultiple && (
          <div className="flex justify-center gap-1.5 mt-3 md:hidden">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={[
                  'w-2 h-2 rounded-full transition-all duration-200 focus:outline-none',
                  index === selectedIndex
                    ? 'bg-brand-primary w-4'
                    : 'bg-gray-300 hover:bg-brand-secondary',
                ].join(' ')}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};