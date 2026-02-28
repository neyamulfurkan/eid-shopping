// src/app/(store)/cart/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag, Trash2, Plus, Minus } from 'lucide-react';

import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { formatPrice } from '@/lib/utils';

// ─────────────────────────────────────────────
// Sub-component: Quantity Adjuster
// ─────────────────────────────────────────────

interface QuantityAdjusterProps {
  quantity: number;
  onDecrement: () => void;
  onIncrement: () => void;
}

/**
 * Compact +/- quantity adjuster used on each cart row.
 * @param quantity - Current item quantity.
 * @param onDecrement - Called when the minus button is pressed.
 * @param onIncrement - Called when the plus button is pressed.
 */
const QuantityAdjuster: React.FC<QuantityAdjusterProps> = ({
  quantity,
  onDecrement,
  onIncrement,
}) => (
  <div className="flex items-center gap-1 rounded-lg border border-brand-secondary/30 overflow-hidden">
    <button
      onClick={onDecrement}
      aria-label="Decrease quantity"
      className="flex items-center justify-center w-8 h-8 text-brand-text/70 hover:bg-brand-primary/10 hover:text-brand-primary transition-colors duration-150"
    >
      <Minus size={14} aria-hidden="true" />
    </button>
    <span className="w-8 text-center text-sm font-semibold text-brand-text select-none">
      {quantity}
    </span>
    <button
      onClick={onIncrement}
      aria-label="Increase quantity"
      className="flex items-center justify-center w-8 h-8 text-brand-text/70 hover:bg-brand-primary/10 hover:text-brand-primary transition-colors duration-150"
    >
      <Plus size={14} aria-hidden="true" />
    </button>
  </div>
);

// ─────────────────────────────────────────────
// Sub-component: Empty State
// ─────────────────────────────────────────────

interface EmptyCartProps {
  message: string;
  cta: string;
}

/** Centered empty cart illustration with a call-to-action link. */
const EmptyCart: React.FC<EmptyCartProps> = ({ message, cta }) => (
  <motion.div
    className="flex flex-col items-center justify-center gap-6 py-24 px-4 text-center"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
  >
    <div className="w-24 h-24 rounded-full bg-brand-primary/10 flex items-center justify-center">
      <ShoppingBag size={40} className="text-brand-primary/60" aria-hidden="true" />
    </div>
    <p className="text-lg font-medium text-brand-text/70">{message}</p>
    <Link href="/products">
      <Button variant="primary" size="md">{cta}</Button>
    </Link>
  </motion.div>
);

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

/**
 * Cart page — lists all cart items with quantity controls and an order summary.
 * Fully client-rendered; cart state comes from CartContext (localStorage-backed).
 */
export default function CartPage(): React.ReactElement {
  const { items, removeItem, updateQuantity, subtotal } = useCart();
  const { lang, t } = useLanguage();

  const isEmpty = items.length === 0;

  // ── Labels (i18n) ────────────────────────────────────────────────────
  const pageTitle      = t('nav.cart');
  const emptyMessage   = t('msg.cartEmpty');
  const continueCta    = t('btn.continueShopping');
  const orderSummary   = t('label.orderSummary');
  const subtotalLabel  = t('label.subtotal');
  const shippingLabel  = t('label.shipping');
  const shippingValue  = t('label.shippingCalculated');
  const totalLabel     = t('label.total');
  const checkoutLabel  = t('btn.checkout');

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg">
      <Navbar />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Page Heading ────────────────────────────────────────────── */}
        <h1 className="text-2xl md:text-3xl font-bold text-brand-text mb-8">
          {pageTitle}
        </h1>

        {isEmpty ? (
          <EmptyCart message={emptyMessage} cta={continueCta} />
        ) : (
          <div className="flex flex-col md:flex-row gap-8 items-start">

            {/* ── Cart Items ────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0">
              <ul className="space-y-4" role="list" aria-label="Cart items">
                <AnimatePresence initial={false}>
                  {items.map((item) => {
                    const displayName = lang === 'bn' ? item.nameBn : item.nameEn;
                    const effectivePrice = item.salePrice ?? item.basePrice;
                    const itemTotal = effectivePrice * item.quantity;

                    const variantEntries = Object.entries(item.selectedVariants);

                    return (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -60, transition: { duration: 0.22 } }}
                        transition={{ duration: 0.28 }}
                        className="flex gap-4 bg-brand-surface rounded-2xl p-4 shadow-sm border border-brand-secondary/10"
                      >
                        {/* Product Image */}
                        <Link
                          href={`/products/${item.productId}`}
                          className="flex-shrink-0 rounded-xl overflow-hidden"
                          tabIndex={-1}
                          aria-hidden="true"
                        >
                          <div className="relative w-[60px] h-[80px]">
                            {item.imageUrl ? (
                              <Image
                                src={item.imageUrl}
                                alt={displayName}
                                fill
                                sizes="60px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-brand-secondary/20 flex items-center justify-center">
                                <ShoppingBag size={20} className="text-brand-text/30" />
                              </div>
                            )}
                          </div>
                        </Link>

                        {/* Info + Controls */}
                        <div className="flex-1 min-w-0 flex flex-col gap-2">

                          {/* Name */}
                          <Link
                            href={`/products/${item.productId}`}
                            className="text-sm font-semibold text-brand-text hover:text-brand-primary transition-colors duration-150 line-clamp-2"
                          >
                            {displayName}
                          </Link>

                          {/* Variant info */}
                          {variantEntries.length > 0 && (
                            <p className="text-xs text-brand-text/55">
                              {variantEntries
                                .map(([type, value]) => `${type}: ${value}`)
                                .join(' · ')}
                            </p>
                          )}

                          {/* Price row */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-brand-primary">
                              {formatPrice(effectivePrice)}
                            </span>
                            {item.salePrice !== null &&
                              item.salePrice !== undefined &&
                              item.salePrice < item.basePrice && (
                                <span className="text-xs text-brand-text/40 line-through">
                                  {formatPrice(item.basePrice)}
                                </span>
                              )}
                          </div>

                          {/* Bottom row: qty adjuster + item total + remove */}
                          <div className="flex items-center justify-between gap-3 mt-auto pt-1">
                            <QuantityAdjuster
                              quantity={item.quantity}
                              onDecrement={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              onIncrement={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                            />

                            <span className="text-sm font-bold text-brand-text">
                              {formatPrice(itemTotal)}
                            </span>

                            <button
                              onClick={() => removeItem(item.id)}
                              aria-label={`Remove ${displayName} from cart`}
                              className="flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors duration-150 flex-shrink-0"
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>

              {/* Continue Shopping link */}
              <div className="mt-6">
                <Link
                  href="/products"
                  className="text-sm text-brand-primary hover:underline underline-offset-2 transition-colors duration-150"
                >
                  ← {continueCta}
                </Link>
              </div>
            </div>

            {/* ── Order Summary ──────────────────────────────────────────── */}
            <aside
              className="w-full md:w-80 flex-shrink-0 bg-brand-surface rounded-2xl p-6 shadow-sm border border-brand-secondary/10 sticky top-24"
              aria-label="Order summary"
            >
              <h2 className="text-lg font-bold text-brand-text mb-5">
                {orderSummary}
              </h2>

              <dl className="space-y-3 text-sm">
                {/* Subtotal */}
                <div className="flex justify-between items-center">
                  <dt className="text-brand-text/70">{subtotalLabel}</dt>
                  <dd className="font-semibold text-brand-text">
                    {formatPrice(subtotal)}
                  </dd>
                </div>

                {/* Shipping */}
                <div className="flex justify-between items-center">
                  <dt className="text-brand-text/70">{shippingLabel}</dt>
                  <dd className="text-brand-text/55 text-xs italic">
                    {shippingValue}
                  </dd>
                </div>

                {/* Divider */}
                <div className="border-t border-brand-secondary/20 pt-3">
                  <div className="flex justify-between items-center">
                    <dt className="font-bold text-brand-text">{totalLabel}</dt>
                    <dd className="font-bold text-brand-primary text-base">
                      {formatPrice(subtotal)}
                    </dd>
                  </div>
                </div>
              </dl>

              {/* Checkout CTA */}
              <Link href="/checkout" className="block w-full mt-6">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  {checkoutLabel}
                </Button>
              </Link>
            </aside>

          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}