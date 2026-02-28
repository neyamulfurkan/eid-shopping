// src/app/admin/theme/page.tsx
import React from 'react';
import { getCachedSiteConfig } from '@/lib/siteConfig';
import { ThemeEditor } from '@/components/admin/ThemeEditor';
import { SectionOrderEditor } from '@/components/admin/SectionOrderEditor';

/**
 * AdminThemePage — server component that renders the Theme Editor and
 * Section Order Editor, both pre-populated with the current SiteConfigMap.
 *
 * @returns The full admin theme settings page.
 */
export default async function AdminThemePage(): Promise<React.ReactElement> {
  const initialConfig = await getCachedSiteConfig();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Theme Editor</h1>
        <p className="mt-1 text-sm text-brand-text/60">
          Customise colours, fonts, and homepage layout for the storefront.
        </p>
      </div>

      {/* ── Section 1: Theme & Colors ─────────────────────────────────── */}
      <section aria-labelledby="theme-colors-heading">
        <h2
          id="theme-colors-heading"
          className="text-lg font-semibold text-brand-text mb-6"
        >
          Theme &amp; Colors
        </h2>
        <ThemeEditor initialConfig={initialConfig} />
      </section>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* ── Section 2: Homepage Sections ─────────────────────────────── */}
      <section aria-labelledby="homepage-sections-heading">
        <h2
          id="homepage-sections-heading"
          className="text-lg font-semibold text-brand-text mb-6"
        >
          Homepage Sections
        </h2>
        <SectionOrderEditor initialConfig={initialConfig} />
      </section>
    </div>
  );
}