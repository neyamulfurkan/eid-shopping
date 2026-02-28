// src/app/(store)/products/[slug]/AddToCartWidget.tsx
'use client';

import React, { useState, useCallback } from 'react';
import type { ProductVariant } from '@prisma/client';
import type { AdminProductListItem, CartItem } from '@/lib/types';
import { ProductVariantSelector } from '@/components/storefront/ProductVariantSelector';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { ShoppingBag, Plus, Minus } from 'lucide-react';

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface AddToCartWidgetProps {
  product: AdminProductListItem;
  variants: ProductVariant[];
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

/**
 * Client island for the product detail page.
 * Manages quantity, variant selection, and dispatches addItem to CartContext.
 *
 * @param product - Serialised product (Decimals already converted to numbers).
 * @param variants - Active ProductVariant records from Prisma.
 */
export const AddToCartWidget: React.FC<AddToCartWidgetProps> = ({
  product,
  variants,
}) => {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [quantity, setQuantity] = useState<number>(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const isOutOfStock = product.stockQty === 0;

  // ── Variant change handler ────────────────────────────────────────────────

  /**
   * Updates the selectedVariants map when a variant swatch/pill is clicked.
   * @param type - Variant type key, e.g. 'size' or 'color'.
   * @param value - The selected variant value.
   */
  const handleVariantChange = useCallback((type: string, value: string) => {
    setSelectedVariants((prev) => ({ ...prev, [type]: value }));
  }, []);

  // ── Quantity controls ────────────────────────────────────────────────────

  const increment = useCallback(() => {
    setQuantity((q) => Math.min(q + 1, product.stockQty || 99));
  }, [product.stockQty]);

  const decrement = useCallback(() => {
    setQuantity((q) => Math.max(1, q - 1));
  }, []);

  // ── Add to cart ──────────────────────────────────────────────────────────

  /**
   * Builds a CartItem from the current product + selection state and dispatches it.
   */
  const handleAddToCart = useCallback(() => {
    if (isOutOfStock) return;

    const cartItem: CartItem = {
      id: `${product.id}-${JSON.stringify(selectedVariants)}`,
      productId: product.id,
      nameEn: product.nameEn,
      nameBn: product.nameBn,
      imageUrl: product.images[0]?.url ?? '',
      basePrice: product.basePrice,
      salePrice: product.salePrice,
      selectedVariants,
      quantity,
    };

    addItem(cartItem);
    showToast(t('msg.addedToCart'), 'success');
  }, [
    isOutOfStock,
    product,
    selectedVariants,
    quantity,
    addItem,
    showToast,
    t,
  ]);

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">
      {/* Variant selector */}
      {variants.length > 0 && (
        <ProductVariantSelector
          variants={variants}
          selectedVariants={selectedVariants}
          onChange={handleVariantChange}
        />
      )}

      {/* Quantity selector + Add to Cart */}
      <div className="flex items-center gap-3 flex-wrap">

        {/* Quantity adjuster */}
        <div className="flex items-center rounded-xl border border-brand-secondary/30 bg-brand-surface overflow-hidden">
          <button
            type="button"
            onClick={decrement}
            disabled={quantity <= 1 || isOutOfStock}
            aria-label="Decrease quantity"
            className={cn(
              'flex items-center justify-center w-10 h-11',
              'text-brand-text/70 hover:text-brand-primary hover:bg-brand-primary/8',
              'transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            <Minus size={16} aria-hidden="true" />
          </button>

          <span
            className="w-10 text-center text-sm font-semibold text-brand-text select-none"
            aria-label={`Quantity: ${quantity}`}
            aria-live="polite"
          >
            {quantity}
          </span>

          <button
            type="button"
            onClick={increment}
            disabled={quantity >= (product.stockQty || 99) || isOutOfStock}
            aria-label="Increase quantity"
            className={cn(
              'flex items-center justify-center w-10 h-11',
              'text-brand-text/70 hover:text-brand-primary hover:bg-brand-primary/8',
              'transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Add to Cart button */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={cn(
            'flex-1 flex items-center justify-center gap-2',
            'h-11 px-6 rounded-xl font-semibold text-sm',
            'transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2',
            isOutOfStock
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-brand-primary text-white hover:bg-brand-primary/90 active:scale-[0.98]',
          )}
        >
          <ShoppingBag size={18} aria-hidden="true" />
          <span>
            {isOutOfStock ? t('msg.outOfStock') : t('btn.addToCart')}
          </span>
        </button>
      </div>
    </div>
  );
};