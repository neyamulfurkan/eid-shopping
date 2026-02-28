// src/lib/i18n.ts

import type { Language, SiteConfigMap, TranslationMap } from '@/lib/types';

// ─────────────────────────────────────────────
// Default Translation Map
// ─────────────────────────────────────────────

/**
 * Hardcoded fallback translations for all storefront UI keys.
 * These are used when no DB overrides exist in SiteConfig.
 * Keys are dot-namespaced by UI region (nav, btn, label, msg, checkout, section, page).
 */
export const DEFAULT_TRANSLATIONS: TranslationMap = {
    // Payment methods
  'payment.bkash':  { en: 'bKash',            bn: 'বিকাশ' },
  'payment.nagad':  { en: 'Nagad',            bn: 'নগদ' },
  'payment.rocket': { en: 'Rocket',           bn: 'রকেট' },
  'payment.cod':    { en: 'Cash on Delivery', bn: 'ক্যাশ অন ডেলিভারি' },

  // Navigation
  'nav.home':          { en: 'Home',       bn: 'হোম' },
  'nav.products':      { en: 'Products',   bn: 'পণ্য' },
  'nav.blog':          { en: 'Blog',       bn: 'ব্লগ' },
  'nav.wishlist':      { en: 'Wishlist',   bn: 'উইশলিস্ট' },
  'nav.cart':          { en: 'Cart',       bn: 'কার্ট' },
  'nav.all':           { en: 'All',        bn: 'সব' },

  // Buttons
  'btn.addToCart':        { en: 'Add to Cart',         bn: 'কার্টে যোগ করুন' },
  'btn.buyNow':           { en: 'Buy Now',              bn: 'এখনই কিনুন' },
  'btn.checkout':         { en: 'Proceed to Checkout',  bn: 'চেকআউটে যান' },
  'btn.orderViaWhatsApp': { en: 'Order via WhatsApp',   bn: 'হোয়াটসঅ্যাপে অর্ডার করুন' },
  'btn.viewAll':          { en: 'View All',             bn: 'সব দেখুন' },
  'btn.continueShopping': { en: 'Continue Shopping',    bn: 'কেনাকাটা চালিয়ে যান' },
  'btn.moveToCart':       { en: 'Move to Cart',         bn: 'কার্টে নিন' },
  'btn.remove':           { en: 'Remove',               bn: 'মুছুন' },
  'btn.apply':            { en: 'Apply',                bn: 'প্রয়োগ করুন' },
  'btn.save':             { en: 'Save',                 bn: 'সংরক্ষণ করুন' },
  'btn.cancel':           { en: 'Cancel',               bn: 'বাতিল করুন' },
  'btn.close':            { en: 'Close',                bn: 'বন্ধ করুন' },
  'btn.submit':           { en: 'Submit',               bn: 'জমা দিন' },
  'btn.writeReview':      { en: 'Write a Review',       bn: 'রিভিউ লিখুন' },
  'btn.submitReview':     { en: 'Submit Review',        bn: 'রিভিউ জমা দিন' },

  // Labels
  'label.price':         { en: 'Price',           bn: 'মূল্য' },
  'label.size':          { en: 'Size',            bn: 'সাইজ' },
  'label.color':         { en: 'Color',           bn: 'রঙ' },
  'label.quantity':      { en: 'Quantity',        bn: 'পরিমাণ' },
  'label.subtotal':      { en: 'Subtotal',        bn: 'সাবটোটাল' },
  'label.total':         { en: 'Total',           bn: 'মোট' },
  'label.promoCode':     { en: 'Promo Code',      bn: 'প্রমো কোড' },
  'label.discount':      { en: 'Discount',        bn: 'ছাড়' },
  'label.orderNumber':   { en: 'Order Number',    bn: 'অর্ডার নম্বর' },
  'label.category':      { en: 'Category',        bn: 'ক্যাটাগরি' },
  'label.description':   { en: 'Description',     bn: 'বিবরণ' },
  'label.reviews':       { en: 'Reviews',         bn: 'রিভিউ' },
  'label.rating':        { en: 'Rating',          bn: 'রেটিং' },
  'label.name':          { en: 'Name',            bn: 'নাম' },
  'label.yourName':      { en: 'Your Name',       bn: 'আপনার নাম' },
  'label.comment':       { en: 'Comment',         bn: 'মন্তব্য' },
  'label.commentPlaceholder': { en: 'Share your experience with this product…', bn: 'এই পণ্য সম্পর্কে আপনার অভিজ্ঞতা শেয়ার করুন…' },
  'label.date':          { en: 'Date',            bn: 'তারিখ' },
  'label.status':        { en: 'Status',          bn: 'অবস্থা' },
  'label.inStock':       { en: 'In Stock',        bn: 'স্টকে আছে' },
  'label.salePrice':     { en: 'Sale Price',      bn: 'বিক্রয় মূল্য' },
  'label.originalPrice': { en: 'Original Price',  bn: 'আসল মূল্য' },
  'label.delivery':      { en: 'Delivery',        bn: 'ডেলিভারি' },
  'label.payment':       { en: 'Payment',         bn: 'পেমেন্ট' },
  'label.address':       { en: 'Address',         bn: 'ঠিকানা' },
  'label.phone':         { en: 'Phone',           bn: 'ফোন' },

  // Messages
  'msg.outOfStock':      { en: 'Out of Stock',                         bn: 'স্টক শেষ' },
  'msg.addedToCart':     { en: 'Added to cart!',                       bn: 'কার্টে যোগ হয়েছে!' },
  'msg.cartEmpty':       { en: 'Your cart is empty.',                   bn: 'আপনার কার্ট খালি।' },
  'msg.wishlistEmpty':   { en: 'Your wishlist is empty.',               bn: 'আপনার উইশলিস্ট খালি।' },
  'msg.reviewSubmitted': { en: 'Review submitted, awaiting approval.',  bn: 'রিভিউ জমা হয়েছে, অনুমোদনের অপেক্ষায়।' },
  'msg.promoApplied':    { en: 'Promo code applied!',                   bn: 'প্রমো কোড প্রয়োগ হয়েছে!' },
  'msg.promoInvalid':    { en: 'Invalid or expired promo code.',        bn: 'অবৈধ বা মেয়াদোত্তীর্ণ প্রমো কোড।' },
  'msg.orderSuccess':    { en: 'Order placed successfully!',            bn: 'অর্ডার সফলভাবে দেওয়া হয়েছে!' },
  'msg.orderError':      { en: 'Failed to place order. Try again.',     bn: 'অর্ডার দিতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।' },
  'msg.noProducts':      { en: 'No products found.',                    bn: 'কোনো পণ্য পাওয়া যায়নি।' },
  'msg.noReviews':       { en: 'No reviews yet. Be the first to review!', bn: 'এখনো কোনো রিভিউ নেই। প্রথম রিভিউ করুন!' },
  'msg.loading':         { en: 'Loading…',                              bn: 'লোড হচ্ছে…' },
  'msg.contactShop':     { en: 'Contact the shop on WhatsApp',          bn: 'হোয়াটসঅ্যাপে দোকানে যোগাযোগ করুন' },
  'msg.selectVariant':   { en: 'Please select all options.',            bn: 'অনুগ্রহ করে সব অপশন নির্বাচন করুন।' },
  'msg.relatedProducts': { en: 'Related Products',                      bn: 'সম্পর্কিত পণ্য' },

  // Checkout form
  'checkout.name':               { en: 'Full Name',               bn: 'পুরো নাম' },
  'checkout.nameLabel':          { en: 'Full Name',               bn: 'পুরো নাম' },
  'checkout.namePlaceholder':    { en: 'Enter your full name',    bn: 'আপনার পুরো নাম লিখুন' },
  'checkout.phone':              { en: 'Phone Number',            bn: 'ফোন নম্বর' },
  'checkout.phonePlaceholder':   { en: '01XXXXXXXXX',             bn: '০১XXXXXXXXX' },
  'checkout.address':            { en: 'Delivery Address',        bn: 'ডেলিভারি ঠিকানা' },
  'checkout.addressPlaceholder': { en: 'Enter your full address', bn: 'আপনার পুরো ঠিকানা লিখুন' },
  'checkout.paymentMethod':      { en: 'Payment Method',          bn: 'পেমেন্ট পদ্ধতি' },
  'checkout.transactionId':      { en: 'Transaction ID',          bn: 'ট্রানজেকশন আইডি' },
  'checkout.transactionIdHint':  { en: 'Enter the transaction ID from your payment', bn: 'আপনার পেমেন্টের ট্রানজেকশন আইডি দিন' },
  'checkout.placeOrder':         { en: 'Place Order',             bn: 'অর্ডার দিন' },
  'checkout.codLabel':           { en: 'Cash on Delivery',        bn: 'ক্যাশ অন ডেলিভারি' },
  'checkout.sendTo':             { en: 'Send',                    bn: 'পাঠান' },
  'checkout.to':                 { en: 'to',                      bn: 'এ' },
  'checkout.enterTxId':          { en: 'Then enter your Transaction ID below.', bn: 'তারপর নিচে আপনার ট্রানজেকশন আইডি দিন।' },

  // WhatsApp order message
  'whatsapp.orderMessage': {
    en: 'Hi! I want to order: {product}, Size: {size}, Color: {color}, My location: __________',
    bn: 'হ্যালো! আমি অর্ডার করতে চাই: {product}, সাইজ: {size}, রঙ: {color}, আমার ঠিকানা: __________',
  },
  'whatsapp.na': { en: 'N/A', bn: 'নেই' },

  // Homepage sections
  'section.flashDeals':        { en: 'Flash Deals',        bn: 'ফ্ল্যাশ ডিল' },
  'section.featuredProducts':  { en: 'Featured Products',  bn: 'বিশেষ পণ্য' },
  'section.newArrivals':       { en: 'New Arrivals',       bn: 'নতুন পণ্য' },
  'section.categories':        { en: 'Categories',         bn: 'ক্যাটাগরি' },
  'section.trustBadges':       { en: 'Why Shop With Us',   bn: 'কেন আমাদের কাছে কেনাকাটা করবেন' },
  'section.blog':              { en: 'Latest Posts',       bn: 'সর্বশেষ পোস্ট' },
  'section.bestsellers':       { en: 'Bestsellers',        bn: 'সেরা বিক্রয়' },
  'section.testimonials':      { en: 'What Customers Say', bn: 'ক্রেতারা কী বলেন' },

  // Page titles / headings
  'page.products':          { en: 'All Products',          bn: 'সব পণ্য' },
  'page.cart':              { en: 'Your Cart',             bn: 'আপনার কার্ট' },
  'page.checkout':          { en: 'Checkout',              bn: 'চেকআউট' },
  'page.wishlist':          { en: 'Wishlist',              bn: 'উইশলিস্ট' },
  'page.blog':              { en: 'Blog',                  bn: 'ব্লগ' },
  'page.orderConfirmation': { en: 'Order Confirmed',       bn: 'অর্ডার নিশ্চিত হয়েছে' },

  // Trust badges
  'badge.cod':      { en: 'Cash on Delivery',  bn: 'ক্যাশ অন ডেলিভারি' },
  'badge.return':   { en: 'Easy Return',        bn: 'সহজ রিটার্ন' },
  'badge.delivery': { en: 'Fast Delivery',      bn: 'দ্রুত ডেলিভারি' },
  'badge.secure':   { en: 'Secure Payment',     bn: 'নিরাপদ পেমেন্ট' },
  'badge.genuine':  { en: '100% Genuine',       bn: '১০০% আসল' },

  // Flash deal
  'flashDeal.endsIn': { en: 'Ends in',  bn: 'শেষ হবে' },
  'flashDeal.expired': { en: 'Expired', bn: 'মেয়াদ শেষ' },

  // Countdown timer labels
  'timer.days':    { en: 'Days',    bn: 'দিন' },
  'timer.hours':   { en: 'Hours',   bn: 'ঘণ্টা' },
  'timer.minutes': { en: 'Minutes', bn: 'মিনিট' },
  'timer.seconds': { en: 'Seconds', bn: 'সেকেন্ড' },

  // Review section
  'review.beFirst':     { en: 'Be the first to review this product.', bn: 'এই পণ্যটি প্রথম রিভিউ করুন।' },
  'review.averageRating': { en: 'Average Rating', bn: 'গড় রেটিং' },
  'review.totalReviews':  { en: 'reviews',        bn: 'রিভিউ' },

  // Sorting / Filtering
  'sort.label':     { en: 'Sort by',         bn: 'সাজান' },
  'sort.newest':    { en: 'Newest',          bn: 'নতুন' },
  'sort.priceAsc':  { en: 'Price: Low-High', bn: 'দাম: কম-বেশি' },
  'sort.priceDesc': { en: 'Price: High-Low', bn: 'দাম: বেশি-কম' },
  'sort.popular':   { en: 'Most Popular',    bn: 'সবচেয়ে জনপ্রিয়' },

  // Footer
  'footer.rights':   { en: 'All rights reserved.', bn: 'সর্বস্বত্ব সংরক্ষিত।' },
  'footer.followUs': { en: 'Follow Us',            bn: 'আমাদের অনুসরণ করুন' },
  'footer.contact':  { en: 'Contact Us',           bn: 'যোগাযোগ করুন' },
  'footer.links':    { en: 'Quick Links',          bn: 'দ্রুত লিঙ্ক' },
};

// ─────────────────────────────────────────────
// buildTranslationMap
// ─────────────────────────────────────────────

/**
 * Builds a TranslationMap by overlaying DB-sourced i18n overrides onto DEFAULT_TRANSLATIONS.
 * SiteConfig keys prefixed with 'i18n.' are expected to encode the translation key and lang
 * using the pattern: i18n.<key>.<lang>  (e.g. 'i18n.btn.addToCart.en' → 'Add to Cart').
 *
 * @param config - Flat SiteConfigMap fetched from the database.
 * @returns A TranslationMap with DB overrides applied on top of defaults.
 */
export function buildTranslationMap(config: SiteConfigMap): TranslationMap {
  // Clone the defaults so we never mutate the constant.
  const map: TranslationMap = {};

  for (const key of Object.keys(DEFAULT_TRANSLATIONS)) {
    map[key] = { ...DEFAULT_TRANSLATIONS[key] };
  }

  // Overlay DB overrides.
  // Expected key pattern: i18n.<translationKey>.<lang>
  // e.g. 'i18n.btn.addToCart.en' = 'Add to Cart'
  //      'i18n.btn.addToCart.bn' = 'কার্টে যোগ করুন'
  for (const configKey of Object.keys(config)) {
    if (!configKey.startsWith('i18n.')) continue;

    const withoutPrefix = configKey.slice('i18n.'.length); // e.g. 'btn.addToCart.en'
    const lastDot = withoutPrefix.lastIndexOf('.');
    if (lastDot === -1) continue;

    const translationKey = withoutPrefix.slice(0, lastDot); // e.g. 'btn.addToCart'
    const lang = withoutPrefix.slice(lastDot + 1);          // e.g. 'en' or 'bn'

    if (lang !== 'en' && lang !== 'bn') continue;

    const value = config[configKey];
    if (!value) continue;

    if (!map[translationKey]) {
      // Support new keys added via DB without a default counterpart.
      map[translationKey] = { en: value, bn: value };
    }

    map[translationKey] = {
      ...map[translationKey],
      [lang]: value,
    };
  }

  return map;
}

// ─────────────────────────────────────────────
// t — translation lookup
// ─────────────────────────────────────────────

/**
 * Looks up a translation key in the provided TranslationMap for the given language.
 * Falls back to English if the requested language string is missing.
 * Falls back to the raw key string if neither language has a value, so the UI
 * always renders something meaningful rather than crashing or returning undefined.
 *
 * @param map  - The TranslationMap produced by buildTranslationMap (or DEFAULT_TRANSLATIONS).
 * @param key  - Dot-namespaced translation key, e.g. 'btn.addToCart'.
 * @param lang - The active UI language ('en' | 'bn').
 * @returns The resolved translation string; never undefined.
 */
export function t(map: TranslationMap, key: string, lang: Language): string {
  return map[key]?.[lang] ?? map[key]?.en ?? key;
}