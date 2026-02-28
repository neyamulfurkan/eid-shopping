// src/components/storefront/ProductCard.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShoppingBag, Star } from 'lucide-react';
import type { AdminProductListItem, WishlistItem, CartItem } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';

// ─────────────────────────────────────────────
// Inline WishlistButton
// (FILE 056 not yet generated — inlined here to satisfy the dependency)
// ─────────────────────────────────────────────

interface WishlistButtonProps {
  product: WishlistItem;
}

const WishlistButton: React.FC<WishlistButtonProps> = ({ product }) => {
  const { addItem, removeItem, isInWishlist } = useWishlist();
  const inWishlist = isInWishlist(product.productId);

  const handleClick = (e: React.MouseEvent) => {
    // Prevent the parent Link from navigating when the heart is tapped
    e.preventDefault();
    e.stopPropagation();
    if (inWishlist) {
      removeItem(product.productId);
    } else {
      addItem(product);
    }
  };

  return (
    <motion.button
      type="button"
      aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      onClick={handleClick}
      whileTap={{ scale: 1.3 }}
      transition={{ duration: 0.15 }}
      className="flex items-center justify-center w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="w-4 h-4 transition-colors duration-200"
        fill={inWishlist ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ color: inWishlist ? '#E91E63' : '#6B7280' }}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </motion.button>
  );
};

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface ProductCardProps {
  product: AdminProductListItem;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

/**
 * Animated product card for use in storefront product grids.
 * Shows primary image with hover-reveal secondary image, sale/flash badges,
 * bilingual product name, formatted price with strikethrough original, and a wishlist toggle.
 */
export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { lang } = useLanguage();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [isHovered, setIsHovered] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cartItem: CartItem = {
      id: product.id + '-' + JSON.stringify({}),
      productId: product.id,
      nameEn: product.nameEn,
      nameBn: product.nameBn,
      imageUrl: product.images[0]?.url ?? '',
      basePrice: product.basePrice,
      salePrice: product.salePrice ?? null,
      selectedVariants: {},
      quantity: 1,
    };
    addItem(cartItem);
    showToast('Added to cart!', 'success');
  };

  const displayName = lang === 'bn' ? product.nameBn : product.nameEn;
  const primaryImage = product.images[0]?.url ?? null;
  const secondaryImage = product.images[1]?.url ?? null;
  const hasSale =
    product.salePrice !== null &&
    product.salePrice !== undefined &&
    product.salePrice < product.basePrice;

  /** WishlistItem snapshot derived from this product for the heart button. */
  const wishlistItem: WishlistItem = {
    productId: product.id,
    nameEn: product.nameEn,
    nameBn: product.nameBn,
    imageUrl: primaryImage ?? '',
    price: hasSale ? (product.salePrice as number) : product.basePrice,
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className="block rounded-2xl overflow-hidden bg-brand-surface shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      aria-label={displayName}
    >
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}
        transition={{ duration: 0.2 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className="rounded-2xl overflow-hidden bg-brand-surface"
      >
        {/* ── Image Container ─────────────────────────────── */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-t-2xl bg-gray-100">
          {primaryImage ? (
            <>
              {/* Primary image */}
              <Image
                src={primaryImage}
                alt={displayName}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={`object-cover transition-opacity duration-300 ${
                  isHovered && secondaryImage ? 'opacity-0' : 'opacity-100'
                }`}
                priority={false}
              />
              {/* Secondary image — revealed on hover */}
              {secondaryImage && (
                <Image
                  src={secondaryImage}
                  alt={`${displayName} — alternate view`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className={`object-cover transition-opacity duration-300 ${
                    isHovered ? 'opacity-100' : 'opacity-0'
                  }`}
                  priority={false}
                />
              )}
            </>
          ) : (
            /* Placeholder when no image is available */
            <div className="absolute inset-0 flex items-center justify-center bg-brand-secondary/10">
              <span className="text-brand-secondary/40 text-sm">No image</span>
            </div>
          )}

          {/* ── Badges ──────────────────────────────────── */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {hasSale && (
              <span className="inline-block rounded-md bg-brand-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-text shadow-sm">
                SALE
              </span>
            )}
            {product.isFlashDeal && (
              <span className="inline-block rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                🔥 Flash
              </span>
            )}
          </div>

          {/* ── Wishlist Button ──────────────────────────── */}
          <div className="absolute top-2 right-2">
            <WishlistButton product={wishlistItem} />
          </div>
        </div>

        {/* ── Card Body ───────────────────────────────────── */}
        <div className="rounded-b-2xl bg-brand-surface p-3">
          {/* Product name */}
          <p className="truncate text-sm font-medium text-brand-text leading-snug mb-1">
            {displayName}
          </p>

          {/* Average star rating */}
          {product.averageRating !== undefined && product.averageRating > 0 && (
            <div className="flex items-center gap-0.5 mb-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={11}
                  className={
                    star <= Math.round(product.averageRating!)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300 fill-gray-300'
                  }
                />
              ))}
              <span className="text-[10px] text-brand-text/50 ml-1">
                {product.averageRating.toFixed(1)}
              </span>
            </div>
          )}

          {/* Price + Add to Cart */}
          <div className="flex items-center justify-between gap-2 flex-wrap mt-1">
            <div className="flex items-center gap-2 flex-wrap">
              {hasSale ? (
                <>
                  <span className="text-sm font-bold text-brand-primary">
                    {formatPrice(product.salePrice as number)}
                  </span>
                  <span className="text-xs text-gray-400 line-through">
                    {formatPrice(product.basePrice)}
                  </span>
                </>
              ) : (
                <span className="text-sm font-bold text-brand-primary">
                  {formatPrice(product.basePrice)}
                </span>
              )}
            </div>
            <motion.button
              type="button"
              aria-label="Add to cart"
              onClick={handleAddToCart}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary text-white shadow-sm hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary shrink-0"
            >
              <ShoppingBag size={14} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};