// src/components/layout/AdminSidebar.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Palette,
  FileText,
  BookOpen,
  Star,
  Settings,
  LogOut,
  Menu,
  X,
  Store,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.FC<{ className?: string }>;
  /** If true, only match exact pathname rather than prefix. */
  exact?: boolean;
}

// ─────────────────────────────────────────────
// Nav config
// ─────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',   href: '/admin',              icon: LayoutDashboard, exact: true },
  { label: 'Products',    href: '/admin/products',     icon: Package },
  { label: 'Categories',  href: '/admin/categories',   icon: Tag },
  { label: 'Orders',      href: '/admin/orders',       icon: ShoppingCart },
  { label: 'Theme',       href: '/admin/theme',        icon: Palette },
  { label: 'Content',     href: '/admin/content',      icon: FileText },
  { label: 'Blog',        href: '/admin/blog',         icon: BookOpen },
  { label: 'Reviews',     href: '/admin/reviews',      icon: Star },
  { label: 'Settings',    href: '/admin/settings',     icon: Settings },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Determines whether a nav item should be shown as active for the current pathname.
 *
 * @param href - The nav item's target path.
 * @param pathname - The current Next.js pathname.
 * @param exact - When true, requires an exact match.
 * @returns True if the item is active.
 */
function isActive(href: string, pathname: string, exact = false): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

// ─────────────────────────────────────────────
// SidebarContent — shared between desktop and mobile overlay
// ─────────────────────────────────────────────

interface SidebarContentProps {
  /** Called when a nav item is clicked (used on mobile to close the drawer). */
  onNavClick?: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({ onNavClick }) => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userName = session?.user?.name ?? session?.user?.email ?? 'Admin';

  /**
   * Signs the admin user out of the NextAuth session via the client-side helper.
   */
  const handleSignOut = (): void => {
    void signOut({ callbackUrl: '/auth/signin' });
  };

  return (
    <div className="flex h-full flex-col">
      {/* ── Brand / Logo ─────────────────────────── */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 px-5">
        <Store className="h-6 w-6 text-brand-primary" aria-hidden="true" />
        <span className="text-lg font-semibold text-brand-text">Admin Panel</span>
      </div>

      {/* ── Nav items ────────────────────────────── */}
      <nav
        aria-label="Admin navigation"
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        <ul role="list" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, pathname, item.exact);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavClick}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                    active
                      ? 'bg-brand-primary/10 text-brand-primary'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-brand-text',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      active ? 'text-brand-primary' : 'text-gray-400',
                    )}
                    aria-hidden="true"
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── User / Sign-out ───────────────────────── */}
      <div className="shrink-0 border-t border-gray-200 px-3 py-4">
        <div className="mb-2 truncate px-3 text-xs font-medium text-gray-400">
          {userName}
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors duration-150 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// AdminSidebar
// ─────────────────────────────────────────────

/**
 * Admin dashboard sidebar providing navigation, user info, and sign-out.
 * Renders as a fixed panel on lg+ screens and as a slide-in drawer on mobile,
 * controlled by an internal hamburger toggle button visible only on smaller screens.
 */
export const AdminSidebar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const openDrawer  = (): void => setMobileOpen(true);
  const closeDrawer = (): void => setMobileOpen(false);

  return (
    <>
      {/* ── Desktop sidebar (lg+) ─────────────────────────── */}
      <aside
        className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r border-gray-200 bg-brand-surface lg:flex"
        aria-label="Admin sidebar"
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile: hamburger trigger ─────────────────────── */}
      <button
        type="button"
        onClick={openDrawer}
        aria-label="Open navigation menu"
        className="fixed left-4 top-4 z-50 flex items-center justify-center rounded-lg bg-brand-surface p-2 shadow-md lg:hidden"
      >
        <Menu className="h-5 w-5 text-brand-text" aria-hidden="true" />
      </button>

      {/* ── Mobile: animated drawer + backdrop ───────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={closeDrawer}
              aria-hidden="true"
            />

            {/* Drawer panel */}
            <motion.aside
              key="sidebar-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
              className="fixed left-0 top-0 z-50 h-full w-64 border-r border-gray-200 bg-brand-surface lg:hidden"
              aria-label="Admin navigation drawer"
            >
              {/* Close button inside drawer */}
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Close navigation menu"
                className="absolute right-3 top-4 flex items-center justify-center rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>

              <SidebarContent onNavClick={closeDrawer} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};