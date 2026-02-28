// src/context/WishlistContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  ReactNode,
} from 'react';
import type { WishlistItem } from '@/lib/types';

// ─────────────────────────────────────────────
// State & Actions
// ─────────────────────────────────────────────

interface WishlistState {
  items: WishlistItem[];
}

type WishlistAction =
  | { type: 'HYDRATE'; payload: WishlistItem[] }
  | { type: 'ADD_ITEM'; payload: WishlistItem }
  | { type: 'REMOVE_ITEM'; payload: { productId: string } };

function wishlistReducer(
  state: WishlistState,
  action: WishlistAction,
): WishlistState {
  switch (action.type) {
    case 'HYDRATE':
      return { items: action.payload };

    case 'ADD_ITEM': {
      const alreadyExists = state.items.some(
        (i) => i.productId === action.payload.productId,
      );
      if (alreadyExists) return state;
      return { items: [...state.items, action.payload] };
    }

    case 'REMOVE_ITEM':
      return {
        items: state.items.filter(
          (i) => i.productId !== action.payload.productId,
        ),
      };

    default:
      return state;
  }
}

// ─────────────────────────────────────────────
// Context Shape
// ─────────────────────────────────────────────

interface WishlistContextValue {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  count: number;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

const STORAGE_KEY = 'eid-wishlist';

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

interface WishlistProviderProps {
  children: ReactNode;
}

/**
 * Provides wishlist state to the component tree with localStorage persistence.
 * Wrap this around any subtree that needs wishlist access.
 */
export const WishlistProvider: React.FC<WishlistProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(wishlistReducer, { items: [] });
  const hasHydrated = React.useRef(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WishlistItem[];
        if (Array.isArray(parsed)) {
          dispatch({ type: 'HYDRATE', payload: parsed });
        }
      }
    } catch {
      // Corrupted storage — start with empty wishlist
    }
  }, []);

  // Persist to localStorage on every state change (skip first render before hydration)
  useEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // Storage quota exceeded or unavailable — silently ignore
    }
  }, [state.items]);

  /**
   * Adds a product to the wishlist.
   * No-ops if the product is already present (deduplication by productId).
   *
   * @param item - The WishlistItem to add.
   */
  const addItem = (item: WishlistItem): void => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };

  /**
   * Removes a product from the wishlist by its productId.
   *
   * @param productId - The id of the product to remove.
   */
  const removeItem = (productId: string): void => {
    dispatch({ type: 'REMOVE_ITEM', payload: { productId } });
  };

  /**
   * Returns true if the product with the given id is currently in the wishlist.
   *
   * @param productId - The id of the product to check.
   * @returns Boolean indicating wishlist membership.
   */
  const isInWishlist = (productId: string): boolean =>
    state.items.some((i) => i.productId === productId);

  const value: WishlistContextValue = {
    items: state.items,
    addItem,
    removeItem,
    isInWishlist,
    count: state.items.length,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

/**
 * Returns the wishlist context value.
 * Must be used inside a WishlistProvider — throws otherwise.
 *
 * @returns WishlistContextValue with items, addItem, removeItem, isInWishlist, count.
 */
export const useWishlist = (): WishlistContextValue => {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return ctx;
};