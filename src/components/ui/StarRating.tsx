// FILE 039: src/components/ui/StarRating.tsx

'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  max?: number;
  interactive?: boolean;
  onChange?: (v: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP: Record<NonNullable<StarRatingProps['size']>, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

/**
 * Renders a row of star icons for rating display or interactive selection.
 * @param value - Current rating value (0–max).
 * @param max - Maximum number of stars. Defaults to 5.
 * @param interactive - Enables hover and click selection when true.
 * @param onChange - Callback invoked with the selected rating value.
 * @param size - Controls the icon dimensions: 'sm' | 'md' | 'lg'.
 * @returns A flex row of Star icons, filled up to the active value.
 */
export const StarRating: React.FC<StarRatingProps> = ({
  value,
  max = 5,
  interactive = false,
  onChange,
  size = 'md',
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const iconClass = SIZE_MAP[size];
  const activeValue = hoverValue ?? value;

  if (interactive) {
    return (
      <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Star rating">
        {Array.from({ length: max }, (_, i) => {
          const starNumber = i + 1;
          const isFilled = starNumber <= activeValue;
          return (
            <button
              key={starNumber}
              type="button"
              role="radio"
              aria-checked={starNumber === value}
              aria-label={`${starNumber} star${starNumber !== 1 ? 's' : ''}`}
              onClick={() => onChange?.(starNumber)}
              onMouseEnter={() => setHoverValue(starNumber)}
              onMouseLeave={() => setHoverValue(null)}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-sm transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  iconClass,
                  'transition-colors duration-100',
                  isFilled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                )}
              />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${value} out of ${max}`}>
      {Array.from({ length: max }, (_, i) => {
        const starNumber = i + 1;
        const isFilled = starNumber <= value;
        return (
          <Star
            key={starNumber}
            className={cn(
              iconClass,
              isFilled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            )}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
};