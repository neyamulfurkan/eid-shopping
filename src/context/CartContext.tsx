// src/context/CartContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { CartItem, CartState } from '@/lib/types';
import { computeCartTotal } from '@/lib/utils';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const CART_STORAGE_KEY = 'eid-cart';

// ─────────────────────────────────────────────
// Reducer Actions
// ─────────────────────────────────────────────

type CartAction =
  | { type: 'HYDRATE'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; qty: number } }
  | { type: 'CLEAR_CART' };

// ─────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────

/**
 * Pure cart reducer that handles all cart state transitions atomically.
 * @param state - Current cart state.
 * @param action - The dispatched action.
 * @returns The next cart state.
 */
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'HYDRATE': {
      return { items: action.payload };
    }

    case 'ADD_ITEM': {
      const incoming = action.payload;
      const existingIndex = state.items.findIndex(
        (item) =>
          item.productId === incoming.productId &&
          JSON.stringify(item.selectedVariants) ===
            JSON.stringify(incoming.selectedVariants),
      );

      if (existingIndex !== -1) {
        // Increment quantity of the matching variant item
        const updatedItems = state.items.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: item.quantity + incoming.quantity }
            : item,
        );
        return { items: updatedItems };
      }

      // New variant combination — append to cart
      return { items: [...state.items, incoming] };
    }

    case 'REMOVE_ITEM': {
      return {
        items: state.items.filter((item) => item.id !== action.payload.id),
      };
    }

    case 'UPDATE_QUANTITY': {
      const { id, qty } = action.payload;
      if (qty <= 0) {
        // Remove item when quantity drops to zero or below
        return { items: state.items.filter((item) => item.id !== id) };
      }
      return {
        items: state.items.map((item) =>
          item.id === id ? { ...item, quantity: qty } : item,
        ),
      };
    }

    case 'CLEAR_CART': {
      return { items: [] };
    }

    default: {
      return state;
    }
  }
}

// ─────────────────────────────────────────────
// Context Shape
// ─────────────────────────────────────────────

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

/** Props for the CartProvider component. */
interface CartProviderProps {
  children: ReactNode;
}

/**
 * Provides cart state and actions to the component tree.
 * Persists cart items to localStorage and rehydrates on mount.
 */
export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const hasHydrated = React.useRef(false);

  // Rehydrate cart from localStorage on first mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[];
        if (Array.isArray(parsed)) {
          dispatch({ type: 'HYDRATE', payload: parsed });
        }
      }
    } catch {
      // Silently discard corrupted localStorage data
    }
  }, []);

  // Sync cart state to localStorage on every change (skip first render before hydration)
  useEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      return;
    }
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // Silently ignore write failures (e.g. private browsing quota exceeded)
    }
  }, [state.items]);

  // ── Actions ──────────────────────────────

  /**
   * Adds an item to the cart. If an identical productId + variant combination
   * already exists, its quantity is incremented instead of adding a duplicate.
   * @param item - The cart item to add. The id must be productId + '-' + JSON.stringify(selectedVariants).
   */
  const addItem = useCallback((item: CartItem) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  }, []);

  /**
   * Removes the cart item with the given id.
   * @param id - The unique cart item id.
   */
  const removeItem = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id } });
  }, []);

  /**
   * Updates the quantity of the cart item with the given id.
   * If qty is 0 or less, the item is removed from the cart.
   * @param id - The unique cart item id.
   * @param qty - The new quantity.
   */
  const updateQuantity = useCallback((id: string, qty: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, qty } });
  }, []);

  /**
   * Removes all items from the cart and clears localStorage.
   */
  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  // ── Derived values ───────────────────────

  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const { subtotal } = computeCartTotal(state.items);

  // ── Context value ────────────────────────

  const value: CartContextValue = {
    items: state.items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    itemCount,
    subtotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

/**
 * Returns the cart context value.
 * Must be called within a CartProvider; throws otherwise.
 * @returns CartContextValue containing items, actions, itemCount, and subtotal.
 */
export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}