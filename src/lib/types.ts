// src/lib/types.ts

import {
  PaymentMethod,
  OrderStatus,
  PaymentStatus,
  PromoType,
  Role,
} from '@prisma/client';

// ─────────────────────────────────────────────
// Re-exports from Prisma
// ─────────────────────────────────────────────

export { PaymentMethod, OrderStatus, PaymentStatus, PromoType, Role };

// ─────────────────────────────────────────────
// Primitive / Utility Types
// ─────────────────────────────────────────────

/** Supported UI languages. Default is Bengali ('bn') for the Bangladeshi market. */
export type Language = 'en' | 'bn';

/**
 * Flat key-value map of all SiteConfig rows fetched from the database.
 * Keys are dot-namespaced strings (e.g. 'theme.primaryColor', 'contact.whatsapp').
 * Values are always strings; complex values are JSON-stringified.
 */
export type SiteConfigMap = Record<string, string>;

/**
 * Bilingual translation map used by the i18n system.
 * Each key maps to an object with English and Bengali string values.
 */
export type TranslationMap = Record<string, { en: string; bn: string }>;

// ─────────────────────────────────────────────
// Cart
// ─────────────────────────────────────────────

/** A single item stored in the cart, keyed by productId + serialised variant selection. */
export interface CartItem {
  /** Unique cart entry id: productId + JSON.stringify(selectedVariants) */
  id: string;
  productId: string;
  nameEn: string;
  nameBn: string;
  imageUrl: string;
  /** Base price of the product (before any sale price) in BDT. */
  basePrice: number;
  /** Sale price override; null/undefined when not on sale. */
  salePrice: number | null;
  /** Map of variant type → selected value, e.g. { size: 'M', color: 'Red' }. */
  selectedVariants: Record<string, string>;
  quantity: number;
}

/** Full cart state shape used by CartContext. */
export interface CartState {
  items: CartItem[];
}

// ─────────────────────────────────────────────
// Wishlist
// ─────────────────────────────────────────────

/** A lightweight product snapshot stored in the localStorage wishlist. */
export interface WishlistItem {
  productId: string;
  nameEn: string;
  nameBn: string;
  imageUrl: string;
  /** Effective display price: salePrice if set, otherwise basePrice. */
  price: number;
}

// ─────────────────────────────────────────────
// Checkout & Orders
// ─────────────────────────────────────────────

/** Form data submitted by the guest checkout form. */
export interface CheckoutFormData {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: PaymentMethod;
  /** Transaction ID provided by the customer for mobile banking payments. */
  transactionId?: string;
}

/** Full order creation payload sent to POST /api/orders. */
export interface OrderCreatePayload extends CheckoutFormData {
  items: CartItem[];
  promoCode?: string;
}

// ─────────────────────────────────────────────
// Admin — Orders
// ─────────────────────────────────────────────

/** Flattened order item snapshot used in admin order listings and detail modals. */
export interface AdminOrderItemSnapshot {
  productNameEn: string;
  productNameBn: string;
  quantity: number;
  unitPrice: number;
  total: number;
  variantInfo: string | null;
}

/** Order shape used in the admin OrderTable component. */
export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: Date;
  items: AdminOrderItemSnapshot[];
}

// ─────────────────────────────────────────────
// Admin — Products
// ─────────────────────────────────────────────

/** Product image shape returned alongside product listings. */
export interface ProductImageItem {
  url: string;
  cloudinaryId: string;
  isDefault: boolean;
}

/**
 * Product shape used in admin product tables and storefront product grids.
 * Contains only the fields needed for listing and card rendering;
 * full product detail (variants, reviews) is fetched separately on the detail page.
 */
export interface AdminProductListItem {
  id: string;
  slug: string;
  nameEn: string;
  nameBn: string;
  /** Base price in BDT as a number (Decimal serialised before passing to client). */
  basePrice: number;
  /** Sale price in BDT; null when not on sale. */
  salePrice: number | null;
  isFlashDeal: boolean;
  isActive: boolean;
  isFeatured: boolean;
  flashDealEndsAt: string | null;
  descriptionEn?: string | null;
  descriptionBn?: string | null;
  stockQty: number;
  lowStockThreshold: number;  /** Up to two images; first is primary, second is the hover-reveal alternate. */
  images: ProductImageItem[];
  category: {
    nameEn: string;
    nameBn: string;
  };
  _count?: {
    reviews: number;
  };
  /** Average review rating (1–5), computed server-side. Undefined when no reviews exist. */
  averageRating?: number;
}

// ─────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────

/** Daily revenue data point for the analytics chart. */
export interface DailyRevenuePoint {
  /** ISO date string in 'YYYY-MM-DD' format. */
  date: string;
  revenue: number;
}

/** Top-selling product entry for the analytics table. */
export interface TopProductEntry {
  name: string;
  sales: number;
  revenue: number;
}

/** Complete analytics payload returned by GET /api/analytics and used by AnalyticsChart. */
export interface AnalyticsData {
  todayRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  lowStockCount: number;
  dailyRevenue: DailyRevenuePoint[];
  topProducts: TopProductEntry[];
}

// ─────────────────────────────────────────────
// Theme
// ─────────────────────────────────────────────

/** A named colour preset that can be applied in the admin Theme Editor. */
export interface ThemePreset {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  surfaceColor: string;
  textColor: string;
}

/** Built-in theme presets available in the admin Theme Editor. */
export const THEME_PRESETS: ThemePreset[] = [
  // ── Eid & Ramadan ──────────────────────────────────────────────────────────
  {
    name: '🌙 Green-Gold (Eid Classic)',
    primaryColor: '#1B5E20',
    secondaryColor: '#F9A825',
    accentColor: '#FFD54F',
    bgColor: '#FAFAFA',
    surfaceColor: '#FFFFFF',
    textColor: '#1A1A1A',
  },
  {
    name: '🌸 Luxury Pink (Ramadan Feminine)',
    primaryColor: '#880E4F',
    secondaryColor: '#F8BBD0',
    accentColor: '#E91E63',
    bgColor: '#FFF8FB',
    surfaceColor: '#FFFFFF',
    textColor: '#1A1A1A',
  },
  {
    name: '🪔 Saffron Festive',
    primaryColor: '#B45309',
    secondaryColor: '#FDE68A',
    accentColor: '#F59E0B',
    bgColor: '#FFFBEB',
    surfaceColor: '#FFFFFF',
    textColor: '#1C1917',
  },
  {
    name: '🌿 Mint Ramadan',
    primaryColor: '#065F46',
    secondaryColor: '#A7F3D0',
    accentColor: '#10B981',
    bgColor: '#F0FDF4',
    surfaceColor: '#FFFFFF',
    textColor: '#064E3B',
  },
  // ── Minimalist ─────────────────────────────────────────────────────────────
  {
    name: '⬜ Minimalist White',
    primaryColor: '#212121',
    secondaryColor: '#757575',
    accentColor: '#FF6F00',
    bgColor: '#FFFFFF',
    surfaceColor: '#F5F5F5',
    textColor: '#212121',
  },
  {
    name: '🖤 Minimalist Dark',
    primaryColor: '#F3F4F6',
    secondaryColor: '#6B7280',
    accentColor: '#F59E0B',
    bgColor: '#111827',
    surfaceColor: '#1F2937',
    textColor: '#F9FAFB',
  },
  {
    name: '🩶 Slate Modern',
    primaryColor: '#334155',
    secondaryColor: '#94A3B8',
    accentColor: '#3B82F6',
    bgColor: '#F8FAFC',
    surfaceColor: '#FFFFFF',
    textColor: '#0F172A',
  },
  // ── Bold & Vibrant ─────────────────────────────────────────────────────────
  {
    name: '💜 Royal Purple',
    primaryColor: '#4A148C',
    secondaryColor: '#CE93D8',
    accentColor: '#AB47BC',
    bgColor: '#FAF5FF',
    surfaceColor: '#FFFFFF',
    textColor: '#1A1A1A',
  },
  {
    name: '🌊 Ocean Blue',
    primaryColor: '#01579B',
    secondaryColor: '#81D4FA',
    accentColor: '#0288D1',
    bgColor: '#F0F9FF',
    surfaceColor: '#FFFFFF',
    textColor: '#0D1B2A',
  },
  {
    name: '🌅 Sunset Orange',
    primaryColor: '#E65100',
    secondaryColor: '#FFCC80',
    accentColor: '#FF8F00',
    bgColor: '#FFFBF5',
    surfaceColor: '#FFFFFF',
    textColor: '#1A1A1A',
  },
  {
    name: '❤️ Crimson Red',
    primaryColor: '#991B1B',
    secondaryColor: '#FCA5A5',
    accentColor: '#DC2626',
    bgColor: '#FFF5F5',
    surfaceColor: '#FFFFFF',
    textColor: '#1A1A1A',
  },
  {
    name: '🪻 Lavender Dream',
    primaryColor: '#5B21B6',
    secondaryColor: '#DDD6FE',
    accentColor: '#8B5CF6',
    bgColor: '#F5F3FF',
    surfaceColor: '#FFFFFF',
    textColor: '#1E1B2E',
  },
  // ── Elegant ────────────────────────────────────────────────────────────────
  {
    name: '🌹 Rose Gold',
    primaryColor: '#B5485A',
    secondaryColor: '#F2C4CE',
    accentColor: '#E8839A',
    bgColor: '#FFF5F7',
    surfaceColor: '#FFFFFF',
    textColor: '#2D1B1E',
  },
  {
    name: '💎 Emerald Luxury',
    primaryColor: '#004D40',
    secondaryColor: '#A7F3D0',
    accentColor: '#00BFA5',
    bgColor: '#F0FBF8',
    surfaceColor: '#FFFFFF',
    textColor: '#0D2620',
  },
  {
    name: '🥇 Champagne Gold',
    primaryColor: '#78350F',
    secondaryColor: '#FDE68A',
    accentColor: '#D97706',
    bgColor: '#FEFCE8',
    surfaceColor: '#FFFFFF',
    textColor: '#1C1308',
  },
  {
    name: '🌑 Midnight Galaxy',
    primaryColor: '#7C3AED',
    secondaryColor: '#4B5563',
    accentColor: '#A78BFA',
    bgColor: '#0B0F1A',
    surfaceColor: '#151C2C',
    textColor: '#E2E8F0',
  },
  // ── Soft & Pastel ──────────────────────────────────────────────────────────
  {
    name: '🍑 Peach Blossom',
    primaryColor: '#C2410C',
    secondaryColor: '#FED7AA',
    accentColor: '#FB923C',
    bgColor: '#FFF7ED',
    surfaceColor: '#FFFFFF',
    textColor: '#431407',
  },
  {
    name: '🩵 Sky Pastel',
    primaryColor: '#0369A1',
    secondaryColor: '#BAE6FD',
    accentColor: '#38BDF8',
    bgColor: '#F0F9FF',
    surfaceColor: '#FFFFFF',
    textColor: '#082F49',
  },
  {
    name: '🌷 Blush Pink',
    primaryColor: '#9D174D',
    secondaryColor: '#FBCFE8',
    accentColor: '#EC4899',
    bgColor: '#FDF2F8',
    surfaceColor: '#FFFFFF',
    textColor: '#500724',
  },
  {
    name: '🍃 Sage Green',
    primaryColor: '#3D6B45',
    secondaryColor: '#BBF7D0',
    accentColor: '#4ADE80',
    bgColor: '#F0FDF4',
    surfaceColor: '#FFFFFF',
    textColor: '#14532D',
  },
  {
    name: '🫐 Berry Purple',
    primaryColor: '#6B21A8',
    secondaryColor: '#E9D5FF',
    accentColor: '#C084FC',
    bgColor: '#FAF5FF',
    surfaceColor: '#FFFFFF',
    textColor: '#3B0764',
  },
  // ── Cultural ───────────────────────────────────────────────────────────────
  {
    name: '🏮 Bengali Red',
    primaryColor: '#7F1D1D',
    secondaryColor: '#FCA5A5',
    accentColor: '#EF4444',
    bgColor: '#FFF5F5',
    surfaceColor: '#FFFFFF',
    textColor: '#1A1A1A',
  },
  {
    name: '🌾 Mustard Earth',
    primaryColor: '#713F12',
    secondaryColor: '#FEF08A',
    accentColor: '#CA8A04',
    bgColor: '#FEFCE8',
    surfaceColor: '#FFFFFF',
    textColor: '#1C1408',
  },
];
// ─────────────────────────────────────────────
// Homepage Sections
// ─────────────────────────────────────────────

/**
 * Represents a single configurable homepage section.
 * Stored as a JSON array in SiteConfig under 'sections.order'.
 */
export interface HomepageSection {
  /** Unique string identifier used as the SiteConfig key suffix, e.g. 'hero', 'flash_deals'. */
  key: string;
  labelEn: string;
  labelBn: string;
  isVisible: boolean;
  order: number;
}

/** Default homepage section definitions used when SiteConfig has no sections.order entry. */
export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSection[] = [
  { key: 'hero',              labelEn: 'Hero Slider',       labelBn: 'হিরো স্লাইডার',      isVisible: true, order: 0 },
  { key: 'flash_deals',       labelEn: 'Flash Deals',       labelBn: 'ফ্ল্যাশ ডিল',         isVisible: true, order: 1 },
  { key: 'featured_products', labelEn: 'Featured Products', labelBn: 'বিশেষ পণ্য',           isVisible: true, order: 2 },
  { key: 'new_arrivals',      labelEn: 'New Arrivals',      labelBn: 'নতুন পণ্য',            isVisible: true, order: 3 },
  { key: 'trust_badges',      labelEn: 'Trust Badges',      labelBn: 'বিশ্বস্ততার ব্যাজ',    isVisible: true, order: 4 },
  { key: 'categories',        labelEn: 'Categories',        labelBn: 'ক্যাটাগরি',            isVisible: true, order: 5 },
];