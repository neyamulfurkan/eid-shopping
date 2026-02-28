'use client';

import React, { useState, useCallback } from 'react';
import { Plus, X, Navigation, LayoutList, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import type { SiteConfigMap } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavLink {
  labelEn: string;
  labelBn: string;
  href: string;
}

interface TrustBadge {
  key: string;
  labelEn: string;
  labelBn: string;
  isVisible: boolean;
}

interface NavFooterEditorProps {
  initialConfig: SiteConfigMap;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_BADGES: TrustBadge[] = [
  { key: 'cod',      labelEn: 'Cash on Delivery',  labelBn: 'ক্যাশ অন ডেলিভারি',  isVisible: true },
  { key: 'return',   labelEn: 'Easy Return',        labelBn: 'সহজ রিটার্ন',          isVisible: true },
  { key: 'delivery', labelEn: 'Fast Delivery',      labelBn: 'দ্রুত ডেলিভারি',      isVisible: true },
  { key: 'secure',   labelEn: 'Secure Payment',     labelBn: 'নিরাপদ পেমেন্ট',      isVisible: true },
  { key: 'genuine',  labelEn: '100% Genuine',       labelBn: '১০০% আসল',            isVisible: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseLinks(raw: string | undefined, fallback: NavLink[]): NavLink[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function parseBadges(raw: string | undefined): TrustBadge[] {
  if (!raw) return DEFAULT_BADGES;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_BADGES;
  } catch {
    return DEFAULT_BADGES;
  }
}

// ─── Sub-component ────────────────────────────────────────────────────────────

interface LinkRowsProps {
  links: NavLink[];
  onChange: (links: NavLink[]) => void;
  addPlaceholderEn: string;
  addPlaceholderHref: string;
}

const LinkRows: React.FC<LinkRowsProps> = ({ links, onChange, addPlaceholderEn, addPlaceholderHref }) => {
  const INPUT =
    'w-full rounded-lg border border-brand-secondary/30 bg-brand-surface px-2.5 py-1.5 text-sm ' +
    'text-brand-text placeholder:text-brand-text/40 focus:outline-none focus:ring-2 ' +
    'focus:ring-brand-primary/40 transition-shadow';

  const update = (index: number, field: keyof NavLink, value: string) => {
    onChange(links.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  const remove = (index: number) => onChange(links.filter((_, i) => i !== index));

  const add = () =>
    onChange([...links, { labelEn: '', labelBn: '', href: '/' }]);

  return (
    <div className="space-y-2">
      {links.map((link, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 items-center">
          <input
            type="text"
            value={link.labelEn}
            onChange={(e) => update(i, 'labelEn', e.target.value)}
            placeholder={addPlaceholderEn}
            className={INPUT}
          />
          <input
            type="text"
            value={link.labelBn}
            onChange={(e) => update(i, 'labelBn', e.target.value)}
            placeholder="বাংলা"
            className={INPUT}
          />
          <input
            type="text"
            value={link.href}
            onChange={(e) => update(i, 'href', e.target.value)}
            placeholder={addPlaceholderHref}
            className={INPUT}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors"
            aria-label="Remove link"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-sm text-brand-primary hover:underline mt-1"
      >
        <Plus size={14} /> Add link
      </button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const NavFooterEditor: React.FC<NavFooterEditorProps> = ({ initialConfig }) => {
  const { showToast } = useToast();
  const router = useRouter();

  const [navLinks, setNavLinks] = useState<NavLink[]>(() =>
    parseLinks(initialConfig['nav.links'], [
      { labelEn: 'Home', labelBn: 'হোম', href: '/' },
      { labelEn: 'Products', labelBn: 'পণ্যসমূহ', href: '/products' },
      { labelEn: 'Blog', labelBn: 'ব্লগ', href: '/blog' },
    ]),
  );

  const [footerCol1, setFooterCol1] = useState<NavLink[]>(() =>
    parseLinks(initialConfig['footer.col1Links'], []),
  );

  const [footerCol2, setFooterCol2] = useState<NavLink[]>(() =>
    parseLinks(initialConfig['footer.col2Links'], []),
  );

  const [badges, setBadges] = useState<TrustBadge[]>(() =>
    parseBadges(initialConfig['settings.trustBadges']),
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const payload: Record<string, string> = {
        'nav.links':              JSON.stringify(navLinks),
        'footer.col1Links':       JSON.stringify(footerCol1),
        'footer.col2Links':       JSON.stringify(footerCol2),
        'settings.trustBadges':   JSON.stringify(badges),
      };

      const res = await fetch('/api/site-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save');
      showToast('Navigation & badges saved', 'success');
      router.refresh();
    } catch {
      showToast('Failed to save — please try again', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [navLinks, footerCol1, footerCol2, badges, showToast, router]);

  const SECTION =
    'flex items-center gap-2 pb-2 border-b border-brand-secondary/20 mb-4 text-base font-semibold text-brand-text';

  const COL_HEADER = 'text-xs font-semibold text-brand-text/50 mb-1.5';

  return (
    <div className="space-y-8 max-w-2xl">

      {/* ── Navigation Links ── */}
      <section>
        <div className={SECTION}>
          <Navigation size={18} className="text-brand-primary" />
          <span>Navigation Links</span>
        </div>
        <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 mb-2">
          <p className={COL_HEADER}>Label (EN)</p>
          <p className={COL_HEADER}>Label (BN)</p>
          <p className={COL_HEADER}>Link URL</p>
          <span />
        </div>
        <LinkRows
          links={navLinks}
          onChange={setNavLinks}
          addPlaceholderEn="e.g. Home"
          addPlaceholderHref="e.g. /"
        />
      </section>

      {/* ── Footer Column 1 ── */}
      <section>
        <div className={SECTION}>
          <LayoutList size={18} className="text-brand-primary" />
          <span>Footer Column 1 Links</span>
        </div>
        <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 mb-2">
          <p className={COL_HEADER}>Label (EN)</p>
          <p className={COL_HEADER}>Label (BN)</p>
          <p className={COL_HEADER}>Link URL</p>
          <span />
        </div>
        <LinkRows
          links={footerCol1}
          onChange={setFooterCol1}
          addPlaceholderEn="e.g. Products"
          addPlaceholderHref="/products"
        />
      </section>

      {/* ── Footer Column 2 ── */}
      <section>
        <div className={SECTION}>
          <LayoutList size={18} className="text-brand-primary" />
          <span>Footer Column 2 Links</span>
        </div>
        <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 mb-2">
          <p className={COL_HEADER}>Label (EN)</p>
          <p className={COL_HEADER}>Label (BN)</p>
          <p className={COL_HEADER}>Link URL</p>
          <span />
        </div>
        <LinkRows
          links={footerCol2}
          onChange={setFooterCol2}
          addPlaceholderEn="e.g. Privacy Policy"
          addPlaceholderHref="/"
        />
      </section>

      {/* ── Trust Badges ── */}
      <section>
        <div className={SECTION}>
          <Shield size={18} className="text-brand-primary" />
          <span>Trust Badges</span>
        </div>
        <div className="space-y-3">
          {badges.map((badge, i) => (
            <div
              key={badge.key}
              className="flex items-center gap-4 rounded-xl border border-brand-secondary/20 px-4 py-3 bg-brand-surface"
            >
              <label className="relative inline-flex cursor-pointer items-center shrink-0">
                <input
                  type="checkbox"
                  checked={badge.isVisible}
                  onChange={(e) =>
                    setBadges((prev) =>
                      prev.map((b, j) =>
                        j === i ? { ...b, isVisible: e.target.checked } : b,
                      ),
                    )
                  }
                  className="sr-only"
                />
                <div
                  className={`h-5 w-9 rounded-full transition-colors ${
                    badge.isVisible ? 'bg-brand-primary' : 'bg-gray-300'
                  }`}
                />
                <div
                  className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    badge.isVisible ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </label>
              <div className="grid grid-cols-2 gap-2 flex-1">
                <input
                  type="text"
                  value={badge.labelEn}
                  onChange={(e) =>
                    setBadges((prev) =>
                      prev.map((b, j) => (j === i ? { ...b, labelEn: e.target.value } : b)),
                    )
                  }
                  className="w-full rounded-lg border border-brand-secondary/30 bg-brand-bg px-2.5 py-1.5 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                />
                <input
                  type="text"
                  value={badge.labelBn}
                  onChange={(e) =>
                    setBadges((prev) =>
                      prev.map((b, j) => (j === i ? { ...b, labelBn: e.target.value } : b)),
                    )
                  }
                  className="w-full rounded-lg border border-brand-secondary/30 bg-brand-bg px-2.5 py-1.5 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                  dir="auto"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Save */}
      <div className="flex justify-end pt-2 border-t border-brand-secondary/20">
        <Button variant="primary" size="md" isLoading={isSaving} onClick={handleSave}>
          Save Navigation & Badges
        </Button>
      </div>
    </div>
  );
};