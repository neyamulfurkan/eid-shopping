// src/components/ui/ColorPicker.tsx
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface ColorPickerProps {
  /** Current hex color value, e.g. '#1B5E20'. */
  value: string;
  /** Called with the new hex string whenever the color changes. */
  onChange: (hex: string) => void;
  /** Optional label rendered above the swatch button. */
  label?: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Normalises a raw hex input string to a full 6-digit lower-case hex value.
 * Accepts '#RGB', '#RRGGBB', 'RGB', and 'RRGGBB' formats.
 * Returns the original string unchanged if it cannot be normalised.
 * @param raw - The raw hex string entered by the user.
 * @returns A normalised '#RRGGBB' string, or the raw input if invalid.
 */
function normaliseHex(raw: string): string {
  const stripped = raw.replace(/^#/, '').toLowerCase();

  // Expand 3-char shorthand → 6-char
  if (/^[0-9a-f]{3}$/.test(stripped)) {
    const [r, g, b] = stripped;
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  if (/^[0-9a-f]{6}$/.test(stripped)) {
    return `#${stripped}`;
  }

  // Return as-is to let the user keep typing
  return raw;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

/**
 * ColorPicker — a swatch toggle button that opens a react-colorful HexColorPicker popover
 * with a direct hex text input for precise colour entry.
 *
 * @param value    - Current hex colour string (e.g. '#1B5E20').
 * @param onChange - Callback invoked with the updated hex string.
 * @param label    - Optional label rendered above the swatch.
 * @returns A controlled colour picker widget.
 */
export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>(value);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Sync inputValue when the external value prop changes ──────────────────
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // ── Close popover on outside click ────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (event: MouseEvent): void => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isOpen]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSwatchClick = useCallback((): void => {
    setIsOpen((prev) => !prev);
  }, []);

  const handlePickerChange = useCallback(
    (hex: string): void => {
      setInputValue(hex);
      onChange(hex);
    },
    [onChange],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const raw = event.target.value;
      setInputValue(raw);

      const normalised = normaliseHex(raw);
      // Only propagate upward when we have a valid full hex
      if (/^#[0-9a-fA-F]{6}$/.test(normalised)) {
        onChange(normalised);
      }
    },
    [onChange],
  );

  const handleInputBlur = useCallback((): void => {
    // On blur, snap the text input to the current valid value
    setInputValue(value);
  }, [value]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative inline-flex flex-col gap-1">
      {/* Optional label */}
      {label && (
        <label className="text-xs font-medium text-brand-text/70 select-none">
          {label}
        </label>
      )}

      {/* Swatch toggle button */}
      <button
        type="button"
        aria-label={label ? `Pick colour for ${label}` : 'Pick colour'}
        aria-expanded={isOpen}
        onClick={handleSwatchClick}
        className={cn(
          'w-8 h-8 rounded-md border-2 border-gray-300 shadow-sm',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2',
          'transition-transform duration-150 hover:scale-110 active:scale-95',
          isOpen && 'ring-2 ring-brand-primary ring-offset-2',
        )}
        style={{ backgroundColor: value }}
      />

      {/* Popover */}
      {isOpen && (
        <div
          className={cn(
            'absolute left-0 top-10 z-50',
            'flex flex-col gap-2 p-3',
            'bg-white dark:bg-gray-800 rounded-xl shadow-2xl',
            'border border-gray-200 dark:border-gray-700',
            'animate-fade-in',
          )}
          // Prevent the popover's own mousedown from propagating to document
          // (which would close it before a picker interaction registers)
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* react-colorful picker */}
          <HexColorPicker
            color={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
            onChange={handlePickerChange}
          />

          {/* Direct hex input */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400 select-none font-mono">#</span>
            <input
              type="text"
              value={inputValue.replace(/^#/, '')}
              onChange={(e) =>
                handleInputChange({
                  ...e,
                  target: { ...e.target, value: `#${e.target.value}` },
                })
              }
              onBlur={handleInputBlur}
              maxLength={6}
              spellCheck={false}
              aria-label="Hex colour code"
              className={cn(
                'w-full font-mono text-xs uppercase',
                'rounded-md border border-gray-300 dark:border-gray-600',
                'bg-gray-50 dark:bg-gray-900 text-brand-text',
                'px-2 py-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary',
                'transition-colors duration-150',
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
};