// src/components/layout/Navbar.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Menu,
  X,
  ShoppingBag,
  Heart,
  Sun,
  Moon,
  Search,
} from 'lucide-react';

import { useSiteConfig, useDarkMode } from '@/context/SiteConfigContext';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { useWishlist } from '@/context/WishlistContext';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface NavLink {
  labelEn: string;
  labelBn: string;
  href: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Parses the nav.links JSON string from SiteConfig into a typed array.
 * Falls back to a sensible default set on any parse error.
 * @param raw - The raw JSON string stored in SiteConfig.
 * @returns An array of NavLink objects.
 */
function parseNavLinks(raw: string | undefined, t: (key: string) => string): NavLink[] {
  const defaults: NavLink[] = [
    { labelEn: t('nav.home'),     labelBn: t('nav.home'),     href: '/' },
    { labelEn: t('nav.products'), labelBn: t('nav.products'), href: '/products' },
    { labelEn: t('nav.blog'),     labelBn: t('nav.blog'),     href: '/blog' },
  ];

  if (!raw) return defaults;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as NavLink[];
    }
    return defaults;
  } catch {
    return defaults;
  }
}

// ─────────────────────────────────────────────
// Sub-component: Badge
// ─────────────────────────────────────────────

interface BadgeProps {
  count: number;
}

/** Small count badge positioned over an icon. */
const CountBadge: React.FC<BadgeProps> = ({ count }) => {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-brand-accent text-brand-text text-xs font-semibold leading-none select-none">
      {count > 99 ? '99+' : count}
    </span>
  );
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

/**
 * Main storefront navigation bar.
 * Sticky, scroll-aware, with announcement bar, mobile drawer, language toggle,
 * dark mode toggle, cart count, and wishlist count.
 */
export const Navbar: React.FC = () => {
  const config                   = useSiteConfig();
  const { itemCount }            = useCart();
  const { count: wishlistCount } = useWishlist();
  const { lang, setLang, t }     = useLanguage();
  const pathname                 = usePathname();

  // ── Derived config ────────────────────────

    const storeName        = config['contact.storeName'] || 'Eid Store';
  const logoUrl          = config['contact.logo'] || '';
  const announcementText = config['nav.announcementText'] || '';
  const announcementLink = config['nav.announcementLink'] || '';
  const navLinks         = parseNavLinks(config['nav.links'], t);

  // ── Local state ───────────────────────────

    const [isMenuOpen,   setIsMenuOpen]   = useState(false);
  const [isVisible,    setIsVisible]    = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');

  const router = useRouter();

  // Track scroll position for hide-on-scroll-down behaviour
  const lastScrollY = useRef(0);

  // Single source of truth for dark mode — lives in SiteConfigContext.
  // hasMounted: false during SSR + first client render, true after useEffect.
  // IMPORTANT: onClick is ALWAYS wired to toggleDarkMode — never gate the
  // click handler on hasMounted, only gate the icon rendering (see below).
  const { isDark: isDarkMode, toggleDark: toggleDarkMode, hasMounted } = useDarkMode();

    // ── Search submit ─────────────────────────

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = searchQuery.trim();
      if (!q) return;
      router.push(`/products?search=${encodeURIComponent(q)}`);
      setSearchQuery('');
      setIsSearchOpen(false);
      setIsMenuOpen(false);
    },
    [searchQuery, router],
  );

  // ── Scroll hide / show ────────────────────

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;

      if (currentY < 60) {
        // Always show navbar near the top of the page
        setIsVisible(true);
      } else if (currentY > lastScrollY.current) {
        // Scrolling down — hide
        setIsVisible(false);
        setIsMenuOpen(false);
      } else {
        // Scrolling up — show
        setIsVisible(true);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Close mobile menu on route change ────

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────

  return (
    <>
      {/* ── Announcement Bar ──────────────── */}
      <AnimatePresence>
        {announcementText && (
          <motion.div
            className="announcement-bar bg-brand-primary text-white text-center py-1.5 text-sm px-4"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {announcementLink ? (
              <Link
                href={announcementLink}
                className="hover:underline underline-offset-2"
              >
                {announcementText}
              </Link>
            ) : (
              <span>{announcementText}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navbar ────────────────────────── */}
      <motion.header
        className={cn(
          'sticky top-0 z-40',
          'bg-brand-surface/95 backdrop-blur-sm',
          'border-b border-brand-secondary/20',
          'h-16 md:h-[72px]',
        )}
        animate={{ y: isVisible ? 0 : '-100%' }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">

          {/* ── Logo / Store Name ────────── */}
          <Link
            href="/"
            className="flex items-center gap-2 flex-shrink-0"
            aria-label={t('nav.home')}
          >
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={storeName}
                width={120}
                height={40}
                className="h-9 w-auto object-contain"
                priority
              />
            ) : (
              <span className="text-brand-primary font-bold text-xl tracking-tight">
                {storeName}
              </span>
            )}
          </Link>

          {/* ── Desktop Nav Links ────────── */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors duration-150',
                  'hover:text-brand-primary',
                  pathname === link.href
                    ? 'text-brand-primary font-semibold'
                    : 'text-brand-text/80',
                )}
              >
                {lang === 'bn' ? link.labelBn : link.labelEn}
              </Link>
            ))}
          </nav>

                    {/* ── Desktop Search ───────────── */}
          <div className="hidden md:flex items-center">
            <AnimatePresence mode="wait">
              {isSearchOpen ? (
                <motion.form
                  key="search-open"
                  onSubmit={handleSearch}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 240, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="flex items-center overflow-hidden"
                >
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products…"
                    className={cn(
                      'w-full h-9 px-3 text-sm rounded-l-xl',
                      'border border-brand-secondary/30 border-r-0',
                      'bg-brand-bg text-brand-text placeholder:text-brand-text/40',
                      'focus:outline-none focus:ring-2 focus:ring-brand-primary/40',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                    className={cn(
                      'h-9 px-2.5 rounded-r-xl flex items-center justify-center',
                      'border border-brand-secondary/30 border-l-0',
                      'bg-brand-bg text-brand-text/50 hover:text-brand-primary',
                      'transition-colors duration-150',
                    )}
                    aria-label="Close search"
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                </motion.form>
              ) : (
                <motion.button
                  key="search-closed"
                  onClick={() => setIsSearchOpen(true)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    'flex items-center justify-center',
                    'h-9 w-9 rounded-lg',
                    'text-brand-text/70 hover:text-brand-primary hover:bg-brand-primary/8',
                    'transition-colors duration-150',
                  )}
                  aria-label="Open search"
                >
                  <Search size={18} aria-hidden="true" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right-side Icons ─────────── */}
          <div className="flex items-center gap-1 sm:gap-2">

            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
              className={cn(
                'hidden sm:flex items-center justify-center',
                'h-9 px-2.5 rounded-lg text-sm font-medium',
                'text-brand-text/70 hover:text-brand-primary hover:bg-brand-primary/8',
                'transition-colors duration-150 select-none',
              )}
              aria-label="Toggle language"
            >
              {lang === 'bn' ? 'EN' : 'বাং'}
            </button>

            {/* ── Dark Mode Toggle ──────────────────────────────────────────
              onClick is ALWAYS toggleDarkMode — never conditional.
              Only the ICON is gated on hasMounted to avoid hydration mismatch:
                · Server renders Moon (isDark=false).
                · Client's first render also renders Moon (isDark still false,
                  hasMounted still false) — identical to server → no mismatch.
                · After useEffect: hasMounted=true, isDark=correct value from
                  localStorage → icon updates to correct state.
              The opacity-0 placeholder is invisible so the user never sees it.
            ───────────────────────────────────────────────────────────────── */}
            <button
              onClick={toggleDarkMode}
              className={cn(
                'flex items-center justify-center',
                'h-9 w-9 rounded-lg',
                'text-brand-text/70 hover:text-brand-primary hover:bg-brand-primary/8',
                'transition-colors duration-150',
              )}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {!hasMounted ? (
                // Invisible placeholder — same SVG structure as Moon so server
                // and client HTML match during hydration. Never seen by user.
                <Moon size={18} aria-hidden="true" className="opacity-0" />
              ) : isDarkMode ? (
                <Sun  size={18} aria-hidden="true" />
              ) : (
                <Moon size={18} aria-hidden="true" />
              )}
            </button>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className={cn(
                'relative flex items-center justify-center',
                'h-9 w-9 rounded-lg',
                'text-brand-text/70 hover:text-brand-primary hover:bg-brand-primary/8',
                'transition-colors duration-150',
              )}
              aria-label={`${t('nav.wishlist')} (${wishlistCount})`}
            >
              <Heart size={18} aria-hidden="true" />
              <CountBadge count={wishlistCount} />
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className={cn(
                'relative flex items-center justify-center',
                'h-9 w-9 rounded-lg',
                'text-brand-text/70 hover:text-brand-primary hover:bg-brand-primary/8',
                'transition-colors duration-150',
              )}
              aria-label={`${t('nav.cart')} (${itemCount})`}
            >
              <ShoppingBag size={18} aria-hidden="true" />
              <CountBadge count={itemCount} />
            </Link>

            {/* Mobile Hamburger */}
            <button
              className={cn(
                'md:hidden flex items-center justify-center',
                'h-9 w-9 rounded-lg',
                'text-brand-text/70 hover:text-brand-primary hover:bg-brand-primary/8',
                'transition-colors duration-150',
              )}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-nav"
            >
              {isMenuOpen ? (
                <X    size={20} aria-hidden="true" />
              ) : (
                <Menu size={20} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* ── Mobile Drawer ─────────────────── */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.nav
              id="mobile-nav"
              aria-label="Mobile navigation"
              className={cn(
                'md:hidden absolute top-full left-0 right-0',
                'bg-brand-surface border-b border-brand-secondary/20',
                'shadow-lg z-50 overflow-hidden',
              )}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
            >
                      <div className="px-4 py-3 flex flex-col gap-1">
                {/* Mobile Search */}
                <form onSubmit={handleSearch} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products…"
                    className={cn(
                      'flex-1 h-10 px-3 text-sm rounded-xl',
                      'border border-brand-secondary/30',
                      'bg-brand-bg text-brand-text placeholder:text-brand-text/40',
                      'focus:outline-none focus:ring-2 focus:ring-brand-primary/40',
                    )}
                  />
                  <button
                    type="submit"
                    className={cn(
                      'h-10 w-10 flex items-center justify-center rounded-xl flex-shrink-0',
                      'bg-brand-primary text-white hover:opacity-90 transition-opacity',
                    )}
                    aria-label="Search"
                  >
                    <Search size={16} aria-hidden="true" />
                  </button>
                </form>

                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex items-center px-3 py-2.5 rounded-xl text-sm font-medium',
                      'transition-colors duration-150',
                      pathname === link.href
                        ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                        : 'text-brand-text/80 hover:bg-brand-primary/6 hover:text-brand-primary',
                    )}
                  >
                    {lang === 'bn' ? link.labelBn : link.labelEn}
                  </Link>
                ))}

                {/* Language toggle in mobile drawer */}
                <button
                  onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
                  className={cn(
                    'flex items-center px-3 py-2.5 rounded-xl text-sm font-medium',
                    'text-brand-text/70 hover:bg-brand-primary/6 hover:text-brand-primary',
                    'transition-colors duration-150 text-left',
                  )}
                  aria-label="Toggle language"
                >
                  {lang === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
                </button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
};