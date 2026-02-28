// src/components/storefront/WishlistButton.tsx
'use client';

import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import type { WishlistItem } from '@/lib/types';

interface WishlistButtonProps {
  product: WishlistItem;
}

/**
 * Toggles a product's wishlist membership with an animated tap interaction.
 *
 * @param product - The WishlistItem to add or remove from the wishlist.
 * @returns A circular icon button with a filled or outlined heart icon.
 */
export const WishlistButton: React.FC<WishlistButtonProps> = ({ product }) => {
  const { isInWishlist, addItem, removeItem } = useWishlist();
  const inWishlist = isInWishlist(product.productId);

  /**
   * Handles click: removes the item if already in wishlist, otherwise adds it.
   */
  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>): void => {
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
      onClick={handleToggle}
      whileTap={{ scale: 1.3 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={inWishlist}
      className="flex items-center justify-center w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-colors duration-150"
    >
      <Heart
        size={16}
        className={
          inWishlist
            ? 'fill-current text-red-500'
            : 'text-gray-400'
        }
      />
    </motion.button>
  );
};