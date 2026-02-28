// src/app/layout.tsx

import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Hind_Siliguri } from 'next/font/google';
import Script from 'next/script';

import '@/app/globals.css';

import { getCachedSiteConfig } from '@/lib/siteConfig';
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from '@/lib/jsonld';

import { SiteConfigProvider } from '@/context/SiteConfigContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { ToastProvider } from '@/context/ToastContext';
import { PageTransition } from '@/components/ui/PageTransition';
import { SessionProvider } from 'next-auth/react';

// ─────────────────────────────────────────────
// Font
// ─────────────────────────────────────────────

const hindSiliguri = Hind_Siliguri({
  subsets: ['latin', 'bengali'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hind-siliguri',
  display: 'swap',
});

// ─────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────

/**
 * Generates Next.js metadata for the root layout using dynamic SiteConfig values.
 * @returns Metadata object with title template, description, Open Graph, and icons.
 */
export async function generateMetadata(): Promise<Metadata> {
  const siteConfig = await getCachedSiteConfig();

  const storeName = siteConfig['contact.storeName'] || 'Eid Store';
  const description =
    siteConfig['contact.descriptionEn'] || 'Eid Fashion Store';
  const logo = siteConfig['contact.logo'] || '';
  const favicon = siteConfig['contact.favicon'] || '/favicon.ico';
  const siteUrl = process.env.NEXTAUTH_URL || '';

  return {
    metadataBase: new URL(siteUrl || 'http://localhost:3000'),
    title: {
      default: storeName,
      template: `%s | ${storeName}`,
    },
    description,
    keywords: ['eid fashion', 'ramadan', 'bangladesh fashion', 'eid collection', storeName],
    openGraph: {
      title: storeName,
      description,
      images: logo
        ? [{ url: logo, width: 1200, height: 630, alt: storeName }]
        : [],
      url: siteUrl,
      siteName: storeName,
      locale: 'bn_BD',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: storeName,
      description,
      images: logo ? [logo] : [],
    },
    icons: {
      icon: favicon,
      apple: favicon,
    },
    alternates: {
      canonical: siteUrl,
      languages: {
        'bn-BD': siteUrl,
        'en-US': siteUrl,
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

// ─────────────────────────────────────────────
// Root Layout
// ─────────────────────────────────────────────

interface RootLayoutProps {
  children: ReactNode;
}

/**
 * Root Next.js layout — server component.
 * Fetches SiteConfig, injects JSON-LD and optional Facebook Pixel,
 * and nests all context providers around the page tree.
 *
 * @param children - The active page rendered by the Next.js router.
 * @returns The full HTML shell with all providers and scripts.
 */
export default async function RootLayout({ children }: RootLayoutProps) {
  const siteConfig = await getCachedSiteConfig();

  const siteUrl = process.env.NEXTAUTH_URL || '';
  const organizationJsonLd = buildOrganizationJsonLd(siteConfig, siteUrl);
  const webSiteJsonLd = buildWebSiteJsonLd(siteConfig, siteUrl);
  const facebookPixelId = siteConfig['settings.facebookPixelId'] || '';

  return (
    <html
      lang="bn"
      className={hindSiliguri.variable}
      suppressHydrationWarning
    >
      <body className={hindSiliguri.className}>
        {/* Organisation structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: organizationJsonLd }}
        />
        {/* WebSite structured data — enables Google Sitelinks Search Box */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: webSiteJsonLd }}
        />

        {/* Facebook Pixel — only injected when a Pixel ID is configured */}
        {facebookPixelId && (
          <Script id="facebook-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${facebookPixelId}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}

        {/*
          Provider nesting order (outermost → innermost):
          SiteConfigProvider → LanguageProvider → CartProvider
          → WishlistProvider → ToastProvider → PageTransition → {children}
        */}
        <SessionProvider>
        <SiteConfigProvider initialConfig={siteConfig}>
          <LanguageProvider initialConfig={siteConfig}>
            <CartProvider>
              <WishlistProvider>
                <ToastProvider>
                  <PageTransition>
                    {children}
                  </PageTransition>
                </ToastProvider>
              </WishlistProvider>
            </CartProvider>
          </LanguageProvider>
        </SiteConfigProvider>
        </SessionProvider>
      </body>
    </html>
  );
}