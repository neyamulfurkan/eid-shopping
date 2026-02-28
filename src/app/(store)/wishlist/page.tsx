// src/app/(store)/wishlist/page.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';

import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { formatPrice } from '@/lib/utils';
import type { CartItem } from '@/lib/types';

// ─────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────

const EmptyWishlist: React.FC<{ t: (key: string) => string }> = ({ t }) => (
  <motion.div
    className="flex flex-col items-center justify-center py-24 px-4 text-center"
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
  >
    <div className="w-20 h-20 rounded-full bg-brand-primary/10 flex items-center justify-center mb-6">
      <Heart size={36} className="text-brand-primary" aria-hidden="true" />
    </div>
    <h2 className="text-xl font-semibold text-brand-text mb-2">
      {t('msg.wishlistEmpty')}
    </h2>
    <p className="text-brand-text/60 text-sm mb-8 max-w-xs">
      {t('msg.wishlistEmptyHint')}
    </p>
    <Link href="/products">
      <Button variant="primary" size="md" leftIcon={<ShoppingBag size={16} />}>
        {t('nav.products')}
      </Button>
    </Link>
  </motion.div>
);

// ─────────────────────────────────────────────
// Wishlist Item Card
// ─────────────────────────────────────────────

interface WishlistCardProps {
  item: {
    productId: string;
    nameEn: string;
    nameBn: string;
    imageUrl: string;
    price: number;
  };
  lang: 'en' | 'bn';
  t: (key: string) => string;
  onMoveToCart: () => void;
  onRemove: () => void;
}

const WishlistCard: React.FC<WishlistCardProps> = ({
  item,
  lang,
  t,
  onMoveToCart,
  onRemove,
}) => {
  const displayName = lang === 'bn' && item.nameBn ? item.nameBn : item.nameEn;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ duration: 0.25 }}
      className="relative flex flex-col bg-brand-surface rounded-2xl overflow-hidden shadow-sm border border-brand-secondary/10 group"
    >
      {/* Product Image */}
      <Link
        href={`/products/${item.productId}`}
        className="block relative aspect-[3/4] w-full overflow-hidden bg-brand-bg"
        tabIndex={-1}
        aria-label={displayName}
      >
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={displayName}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-brand-secondary/10">
            <Heart size={32} className="text-brand-secondary/40" aria-hidden="true" />
          </div>
        )}
      </Link>

      {/* Info + Actions */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <Link href={`/products/${item.productId}`}>
          <p className="text-sm font-medium text-brand-text line-clamp-2 hover:text-brand-primary transition-colors duration-150">
            {displayName}
          </p>
        </Link>

        <p className="text-brand-primary font-semibold text-sm">
          {formatPrice(item.price)}
        </p>

        {/* Move to Cart */}
        <Button
          variant="primary"
          size="sm"
          className="w-full mt-auto"
          leftIcon={<ShoppingBag size={13} />}
          onClick={onMoveToCart}
        >
          {t('btn.moveToCart')}
        </Button>

        {/* Remove */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-brand-text/60 hover:text-red-500"
          leftIcon={<Trash2 size={13} />}
          onClick={onRemove}
        >
          {t('btn.remove')}
        </Button>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

/**
 * Wishlist page displaying saved products with move-to-cart and remove actions.
 * Wishlist state is persisted in localStorage via WishlistContext.
 */
export default function WishlistPage(): React.JSX.Element {
  const { items, removeItem } = useWishlist();
  const { addItem } = useCart();
  const { lang, t } = useLanguage();

  /**
   * Moves a wishlist item into the cart and removes it from the wishlist.
   * The CartItem id encodes the productId without variant suffix since wishlist
   * items are added without a variant selection.
   *
   * @param item - The WishlistItem to move.
   */
  const handleMoveToCart = (item: (typeof items)[number]): void => {
    const cartItem: CartItem = {
      id: `${item.productId}-default`,
      productId: item.productId,
      nameEn: item.nameEn,
      nameBn: item.nameBn,
      imageUrl: item.imageUrl,
      basePrice: item.price,
      salePrice: null,
      selectedVariants: {},
      quantity: 1,
    };
    addItem(cartItem);
    removeItem(item.productId);
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-brand-bg">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

          {items.length === 0 ? (
            <EmptyWishlist t={t} />
          ) : (
            <>
              {/* Page Header */}
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-2xl sm:text-3xl font-bold text-brand-text flex items-center gap-3">
                  <Heart
                    size={28}
                    className="text-brand-primary"
                    aria-hidden="true"
                  />
                  {t('nav.wishlist')}
                  <span className="text-base font-normal text-brand-text/50 ml-1">
                    ({items.length})
                  </span>
                </h1>
              </motion.div>

              {/* Grid */}
              <motion.div
                layout
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
              >
                <AnimatePresence mode="popLayout">
                  {items.map((item) => (
                    <WishlistCard
                      key={item.productId}
                      item={item}
                      lang={lang}
                      t={t}
                      onMoveToCart={() => handleMoveToCart(item)}
                      onRemove={() => removeItem(item.productId)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>

              {/* Continue Shopping */}
              <div className="mt-10 flex justify-center">
                <Link href="/products">
                  <Button variant="secondary" size="md">
                    {t('btn.continueShopping')}
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}