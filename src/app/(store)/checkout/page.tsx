// src/app/(store)/checkout/page.tsx
'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';

import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatPrice } from '@/lib/utils';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CheckoutForm } from '@/components/storefront/CheckoutForm';

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

/**
 * Guest checkout page with a two-column layout: CheckoutForm on the left,
 * order summary sidebar on the right. Redirects to /cart when cart is empty.
 */
const CheckoutPage: React.FC = () => {
  const router = useRouter();
  const { items, subtotal } = useCart();
  const { t, lang } = useLanguage();

  // Redirect to cart if there are no items to check out
  useEffect(() => {
    if (items.length === 0) {
      router.replace('/cart');
    }
  }, [items.length, router]);

  /**
   * Called by CheckoutForm on successful order creation.
   * Navigates to the confirmation page with the order number in the query string.
   * @param orderNumber - The EID-prefixed order number returned by the API.
   */
  const handleOrderSuccess = (orderNumber: string): void => {
    router.push('/order-confirmation?order=' + encodeURIComponent(orderNumber));
  };

  // While the redirect is in progress (cart is empty), render a minimal loading state
  // so the layout does not flash with an empty summary.
  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-brand-bg flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-brand-text/50">
            <ShoppingBag size={40} aria-hidden="true" />
            <p className="text-sm">
              {lang === 'bn' ? 'রিডাইরেক্ট হচ্ছে…' : 'Redirecting…'}
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-brand-bg py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1280px] mx-auto">

          {/* Page Title */}
          <h1 className="text-2xl font-bold text-brand-text mb-8">
            {t('page.checkout') || (lang === 'bn' ? 'চেকআউট' : 'Checkout')}
          </h1>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

            {/* ── Left: Checkout Form (2 columns wide on large screens) ── */}
            <div className="lg:col-span-2 bg-brand-surface rounded-2xl shadow-sm border border-brand-secondary/10 p-6">
              <CheckoutForm onOrderSuccess={handleOrderSuccess} />
            </div>

            {/* ── Right: Order Summary Sidebar ─────────────────────────── */}
            <div className="lg:col-span-1">
              <div className="bg-brand-surface rounded-2xl shadow-sm border border-brand-secondary/10 p-6 sticky top-24">

                <h2 className="text-lg font-semibold text-brand-text mb-5">
                  {t('label.orderSummary') || (lang === 'bn' ? 'অর্ডার সারসংক্ষেপ' : 'Order Summary')}
                </h2>

                {/* Cart Items List */}
                <ul className="space-y-4 mb-6" aria-label={lang === 'bn' ? 'কার্ট আইটেম' : 'Cart items'}>
                  {items.map((item) => {
                    const effectivePrice = item.salePrice ?? item.basePrice;
                    const itemTotal = effectivePrice * item.quantity;
                    const displayName = lang === 'bn' && item.nameBn ? item.nameBn : item.nameEn;

                    // Build a readable variant summary string (e.g. "সাইজ: M, রঙ: লাল")
                    const variantEntries = Object.entries(item.selectedVariants ?? {});
                    const variantSummary = variantEntries
                      .map(([type, value]) => `${type}: ${value}`)
                      .join(', ');

                    return (
                      <li
                        key={item.id}
                        className="flex items-start gap-3"
                      >
                        {/* Product Thumbnail */}
                        <div className="relative w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-brand-bg border border-brand-secondary/10">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={displayName}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag
                                size={20}
                                className="text-brand-text/30"
                                aria-hidden="true"
                              />
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-brand-text leading-snug truncate">
                            {displayName}
                          </p>
                          {variantSummary && (
                            <p className="text-xs text-brand-text/60 mt-0.5 truncate">
                              {variantSummary}
                            </p>
                          )}
                          <p className="text-xs text-brand-text/60 mt-0.5">
                            {formatPrice(effectivePrice)}{' '}
                            <span aria-hidden="true">×</span>{' '}
                            {item.quantity}
                          </p>
                        </div>

                        {/* Item Total */}
                        <p className="text-sm font-semibold text-brand-text flex-shrink-0">
                          {formatPrice(itemTotal)}
                        </p>
                      </li>
                    );
                  })}
                </ul>

                {/* Divider */}
                <div className="border-t border-brand-secondary/20 pt-4 space-y-2">
                  {/* Subtotal row */}
                  <div className="flex justify-between items-center text-sm text-brand-text/70">
                    <span>
                      {t('label.subtotal') || (lang === 'bn' ? 'সাবটোটাল' : 'Subtotal')}
                    </span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>

                  {/* Shipping note */}
                  <div className="flex justify-between items-center text-sm text-brand-text/60">
                    <span>
                      {lang === 'bn' ? 'ডেলিভারি চার্জ' : 'Delivery charge'}
                    </span>
                    <span className="text-green-600 font-medium">
                      {lang === 'bn' ? 'পরে নির্ধারিত হবে' : 'TBD'}
                    </span>
                  </div>

                  {/* Total row */}
                  <div className="flex justify-between items-center text-base font-bold text-brand-text border-t border-brand-secondary/10 pt-3 mt-1">
                    <span>
                      {t('label.total') || (lang === 'bn' ? 'মোট' : 'Total')}
                    </span>
                    <span className="text-brand-primary">{formatPrice(subtotal)}</span>
                  </div>
                </div>

                {/* Item count note */}
                <p className="mt-4 text-xs text-brand-text/40 text-center">
                  {items.length}{' '}
                  {lang === 'bn'
                    ? items.length === 1 ? 'টি পণ্য' : 'টি পণ্য'
                    : items.length === 1 ? 'item' : 'items'}
                </p>

              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default CheckoutPage;