// src/components/storefront/ProductVariantSelector.tsx
'use client';

import React from 'react';
import type { ProductVariant } from '@prisma/client';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface ProductVariantSelectorProps {
  variants: ProductVariant[];
  selectedVariants: Record<string, string>;
  onChange: (type: string, value: string) => void;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Groups a flat ProductVariant array by their `type` field.
 * @param variants - Flat array of all product variants.
 * @returns A map from variant type string to its variants array.
 */
function groupVariantsByType(
  variants: ProductVariant[]
): Map<string, ProductVariant[]> {
  return variants.reduce((map, variant) => {
    const group = map.get(variant.type) ?? [];
    group.push(variant);
    map.set(variant.type, group);
    return map;
  }, new Map<string, ProductVariant[]>());
}

/**
 * Determines whether a CSS color string is a valid CSS color name or hex/rgb value.
 * Uses a pure regex check to avoid document access during SSR, preventing hydration mismatches.
 * @param value - The variant value string to test.
 * @returns true if the string can be used as a CSS background-color.
 */
function isValidCssColor(value: string): boolean {
  // Match hex colors: #rgb, #rrggbb, #rrggbbaa
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) return true;
  // Match rgb() and rgba()
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(\s*,\s*[\d.]+)?\s*\)$/.test(value)) return true;
  // Match hsl() and hsla()
  if (/^hsla?\(\s*\d+\s*,\s*[\d.]+%\s*,\s*[\d.]+%(\s*,\s*[\d.]+)?\s*\)$/.test(value)) return true;
  // Match common CSS named colors
  const NAMED_COLORS = new Set([
    'red','green','blue','yellow','orange','purple','pink','black','white','gray','grey',
    'brown','cyan','magenta','lime','indigo','violet','gold','silver','navy','teal',
    'coral','salmon','maroon','olive','aqua','turquoise','beige','ivory','lavender',
    'crimson','khaki','plum','tan','chocolate','tomato','orchid','sienna','peru',
  ]);
  return NAMED_COLORS.has(value.toLowerCase().trim());
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

interface ColorSwatchProps {
  variant: ProductVariant;
  isSelected: boolean;
  isOutOfStock: boolean;
  onClick: () => void;
}

/**
 * A circular colour swatch button for 'color' type variants.
 */
const ColorSwatch: React.FC<ColorSwatchProps> = ({
  variant,
  isSelected,
  isOutOfStock,
  onClick,
}) => {
  const canUseColor = isValidCssColor(variant.value);

  return (
    <button
      type="button"
      title={variant.value}
      aria-label={`Select colour: ${variant.value}${isOutOfStock ? ' (out of stock)' : ''}`}
      aria-pressed={isSelected}
      disabled={isOutOfStock}
      onClick={onClick}
      className={cn(
        'relative w-8 h-8 rounded-full border-2 transition-all duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
        isSelected
          ? 'ring-2 ring-offset-2 ring-brand-primary border-transparent'
          : 'border-gray-300 hover:border-brand-primary',
        isOutOfStock
          ? 'opacity-40 cursor-not-allowed'
          : 'cursor-pointer'
      )}
      style={canUseColor ? { backgroundColor: variant.value } : undefined}
    >
      {/* Fallback label for non-CSS-color values (e.g. 'Printed', 'Tie-Dye') */}
      {!canUseColor && (
        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold text-brand-text leading-none text-center px-0.5 rounded-full bg-brand-surface">
          {variant.value.slice(0, 4)}
        </span>
      )}

      {/* Diagonal strikethrough overlay for out-of-stock */}
      {isOutOfStock && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
        >
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'linear-gradient(to top right, transparent calc(50% - 0.5px), rgba(100,100,100,0.7) calc(50% - 0.5px), rgba(100,100,100,0.7) calc(50% + 0.5px), transparent calc(50% + 0.5px))',
            }}
          />
        </span>
      )}
    </button>
  );
};

interface SizePillProps {
  variant: ProductVariant;
  isSelected: boolean;
  isOutOfStock: boolean;
  onClick: () => void;
}

/**
 * A rectangular pill button for 'size' type variants.
 */
const SizePill: React.FC<SizePillProps> = ({
  variant,
  isSelected,
  isOutOfStock,
  onClick,
}) => (
  <button
    type="button"
    aria-label={`Select size: ${variant.value}${isOutOfStock ? ' (out of stock)' : ''}`}
    aria-pressed={isSelected}
    disabled={isOutOfStock}
    onClick={onClick}
    className={cn(
      'px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
      isSelected
        ? 'bg-brand-primary text-white border-brand-primary'
        : 'bg-brand-surface text-brand-text border-gray-300 hover:border-brand-primary hover:text-brand-primary',
      isOutOfStock
        ? 'line-through opacity-40 cursor-not-allowed'
        : 'cursor-pointer'
    )}
  >
    {variant.value}
  </button>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

/**
 * Renders grouped variant selectors for a product:
 * - 'color' type → circular colour swatches
 * - 'size' type → pill buttons
 * Out-of-stock variants are visually disabled and unclickable.
 *
 * @param variants - All ProductVariant records for the product.
 * @param selectedVariants - Currently selected values keyed by type.
 * @param onChange - Callback when a variant is selected.
 */
export const ProductVariantSelector: React.FC<ProductVariantSelectorProps> = ({
  variants,
  selectedVariants,
  onChange,
}) => {
  const groups = groupVariantsByType(variants);

  if (groups.size === 0) return null;

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([type, groupVariants]) => {
        const isColorType = type === 'color';
        const selectedValue = selectedVariants[type] ?? null;

        return (
          <div key={type} className="space-y-2">
            {/* Group label */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-brand-text capitalize">
                {type}
              </span>
              {selectedValue && (
                <span className="text-sm text-gray-500">
                  : {selectedValue}
                </span>
              )}
            </div>

            {/* Swatches or pills */}
            <div className="flex flex-wrap gap-2">
              {groupVariants
                .filter((v) => v.isActive)
                .map((variant) => {
                  const isSelected = selectedValue === variant.value;
                  const isOutOfStock = variant.stockQty === 0;

                  const handleClick = (): void => {
                    if (!isOutOfStock) {
                      onChange(type, variant.value);
                    }
                  };

                  return isColorType ? (
                    <ColorSwatch
                      key={variant.id}
                      variant={variant}
                      isSelected={isSelected}
                      isOutOfStock={isOutOfStock}
                      onClick={handleClick}
                    />
                  ) : (
                    <SizePill
                      key={variant.id}
                      variant={variant}
                      isSelected={isSelected}
                      isOutOfStock={isOutOfStock}
                      onClick={handleClick}
                    />
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
};