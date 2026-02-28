// FILE 103: src/app/admin/settings/page.tsx

import React from 'react';
import { getCachedSiteConfig } from '@/lib/siteConfig';
import { SiteInfoForm } from '@/components/admin/SiteInfoForm';
import { PaymentSettings } from '@/components/admin/PaymentSettings';

/**
 * Admin settings page providing store information and payment configuration.
 * Fetches SiteConfigMap server-side and passes it to both client form components.
 *
 * @returns The settings page with Store Information and Payment & SMS sections.
 */
export default async function AdminSettingsPage(): Promise<React.JSX.Element> {
  const initialConfig = await getCachedSiteConfig();

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-brand-text">Settings</h1>
          <p className="mt-1 text-sm text-brand-text/60">
            Manage your store identity, contact details, and payment options.
          </p>
        </div>

        {/* Section 1 — Store Information */}
        <section className="mb-10">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-brand-text">Store Information</h2>
            <p className="mt-1 text-sm text-brand-text/60">
              Branding, contact details, and social media links shown across the storefront.
            </p>
          </div>

          <div className="rounded-2xl border border-brand-secondary/20 bg-brand-surface p-6 shadow-sm">
            <SiteInfoForm initialConfig={initialConfig} />
          </div>
        </section>

        {/* Divider */}
        <hr className="mb-10 border-brand-secondary/20" />

        {/* Section 2 — Payment & SMS */}
        <section>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-brand-text">Payment &amp; SMS</h2>
            <p className="mt-1 text-sm text-brand-text/60">
              Enable payment methods, configure merchant numbers, and set up SMS notifications.
            </p>
          </div>

          <div className="rounded-2xl border border-brand-secondary/20 bg-brand-surface p-6 shadow-sm">
            <PaymentSettings initialConfig={initialConfig} />
          </div>
        </section>

      </div>
    </div>
  );
}