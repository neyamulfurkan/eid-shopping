// src/lib/utils.ts

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CartItem } from '@/lib/types';
import { PromoType } from '@/lib/types';

// ─────────────────────────────────────────────
// Class Merging
// ─────────────────────────────────────────────

/**
 * Merges Tailwind CSS class names, resolving conflicts via tailwind-merge.
 * @param classes - Any number of class values (strings, arrays, objects).
 * @returns A single merged class string.
 */
export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}

// ─────────────────────────────────────────────
// Price Formatting
// ─────────────────────────────────────────────

/**
 * Formats a monetary amount as a BDT price string using the Bengali locale.
 * Outputs the ৳ symbol followed by the formatted number.
 * @param amount - The monetary value as a number or Prisma Decimal (coerced via toString).
 * @param currency - ISO 4217 currency code; defaults to 'BDT'.
 * @returns A formatted price string, e.g. '৳ ১,২৩৪.০০'.
 */
export function formatPrice(
  amount: number | { toString(): string },
  currency = 'BDT',
): string {
  const numeric = typeof amount === 'number' ? amount : parseFloat(amount.toString());
  return new Intl.NumberFormat('bn-BD', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numeric);
}

// ─────────────────────────────────────────────
// Date Formatting
// ─────────────────────────────────────────────

/**
 * Formats a Date or ISO date string into a human-readable date using the Bengali locale.
 * @param date - A Date object or an ISO 8601 date string.
 * @returns A formatted date string, e.g. '২৬ ফেব্রুয়ারি ২০২৬'.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

// ─────────────────────────────────────────────
// Order Number Generation
// ─────────────────────────────────────────────

/**
 * Generates a unique, human-readable order number prefixed with 'EID-'.
 * Combines a base-36 timestamp with a short random suffix for uniqueness.
 * @returns A string like 'EID-LK3R2FABX7'.
 */
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `EID-${timestamp}${random}`;
}

// ─────────────────────────────────────────────
// Slugification
// ─────────────────────────────────────────────

/**
 * Simple Bengali-to-Latin transliteration map for common characters.
 * Used by slugify to produce URL-safe slugs from Bengali product names.
 */
const BENGALI_TRANSLITERATION: Record<string, string> = {
  'অ': 'a', 'আ': 'aa', 'ই': 'i', 'ঈ': 'ii', 'উ': 'u', 'ঊ': 'uu',
  'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
  'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
  'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
  'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
  'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
  'প': 'p', 'ফ': 'ph', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
  'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh',
  'স': 's', 'হ': 'h', 'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y',
  'ৎ': 't', 'ং': 'ng', 'ঃ': 'h', 'ঁ': 'n',
  'া': 'a', 'ি': 'i', 'ী': 'ii', 'ু': 'u', 'ূ': 'uu',
  'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou', '্': '',
};

/**
 * Converts a string (English or Bengali) into a URL-safe slug.
 * Bengali characters are transliterated to Latin equivalents before processing.
 * @param text - The source text to slugify.
 * @returns A lowercase hyphen-separated slug string.
 */
export function slugify(text: string): string {
  // Transliterate Bengali characters
  let result = text
    .split('')
    .map((char) => BENGALI_TRANSLITERATION[char] ?? char)
    .join('');

  return result
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')   // Remove non-word chars (except spaces and hyphens)
    .replace(/[\s_]+/g, '-')    // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-')        // Collapse multiple hyphens
    .replace(/^-+|-+$/g, '');   // Trim leading/trailing hyphens
}

// ─────────────────────────────────────────────
// String Utilities
// ─────────────────────────────────────────────

/**
 * Truncates a string to the specified length and appends an ellipsis if truncated.
 * @param text - The input string to truncate.
 * @param length - Maximum allowed character length before truncation.
 * @returns The original string if within length, otherwise a truncated string ending with '…'.
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trimEnd() + '…';
}

// ─────────────────────────────────────────────
// WhatsApp
// ─────────────────────────────────────────────

/**
 * Constructs a WhatsApp deep-link URL with a pre-composed message.
 * Strips all non-digit characters from the phone number before building the URL.
 * @param phone - The recipient's phone number (any format; digits extracted automatically).
 * @param message - The pre-composed message to open in WhatsApp.
 * @returns A wa.me URL string ready to be used as an href or passed to window.open.
 */
export function getWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

// ─────────────────────────────────────────────
// Cart Calculations
// ─────────────────────────────────────────────

/**
 * Computes the cart subtotal and total from an array of CartItems.
 * Uses salePrice when available, otherwise falls back to basePrice.
 * In this implementation subtotal and total are equal; total is included
 * as a separate field to allow future addition of shipping fees or taxes.
 * @param items - The array of cart items to sum.
 * @returns An object containing subtotal and total, both in BDT.
 */
export function computeCartTotal(items: CartItem[]): { subtotal: number; total: number } {
  const subtotal = items.reduce((sum, item) => {
    const effectivePrice = item.salePrice ?? item.basePrice;
    return sum + effectivePrice * item.quantity;
  }, 0);
  return { subtotal, total: subtotal };
}

// ─────────────────────────────────────────────
// Promo Discount
// ─────────────────────────────────────────────

/**
 * Calculates the discount amount to deduct from the subtotal for a given promo code.
 * For PERCENTAGE type: returns subtotal × (value / 100).
 * For FIXED type: returns the lesser of the fixed value and the subtotal (to avoid negative totals).
 * @param subtotal - The cart subtotal in BDT before the discount is applied.
 * @param type - The promo code type (PERCENTAGE or FIXED).
 * @param value - The promo code value (percentage points or fixed BDT amount).
 * @returns The discount amount in BDT to subtract from the subtotal.
 */
export function applyPromoDiscount(subtotal: number, type: PromoType, value: number): number {
  if (type === PromoType.PERCENTAGE) {
    return subtotal * (value / 100);
  }
  // PromoType.FIXED
  return Math.min(value, subtotal);
}