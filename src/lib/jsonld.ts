// src/lib/jsonld.ts

import type { AdminProductListItem, SiteConfigMap } from '@/lib/types';

/**
 * Builds a schema.org Product JSON-LD string for a product detail page.
 * @param product - Product list item extended with all image URLs.
 * @param siteUrl - The base URL of the deployed storefront (e.g. https://yourstore.com).
 * @returns A JSON string suitable for placement in a <script type="application/ld+json"> tag.
 */
export function buildProductJsonLd(
  product: AdminProductListItem & {
    images: { url: string }[];
    reviews?: { rating: number; reviewerName: string; comment?: string | null; createdAt?: Date }[];
    _count?: { reviews: number };
  },
  siteUrl: string
): string {
  const effectivePrice = product.salePrice ?? product.basePrice;
  const availability =
    product.stockQty > 0
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock';

  // Build aggregateRating if reviews exist — triggers Google star ratings in search
  const approvedReviews = product.reviews ?? [];
  const aggregateRating =
    approvedReviews.length > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue:
            Math.round(
              (approvedReviews.reduce((sum, r) => sum + r.rating, 0) /
                approvedReviews.length) *
                10,
            ) / 10,
          reviewCount: approvedReviews.length,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined;

  // Build individual review entries
  const reviewEntries =
    approvedReviews.length > 0
      ? approvedReviews.slice(0, 5).map((r) => ({
          '@type': 'Review',
          author: { '@type': 'Person', name: r.reviewerName },
          reviewRating: {
            '@type': 'Rating',
            ratingValue: r.rating,
            bestRating: 5,
            worstRating: 1,
          },
          reviewBody: r.comment ?? '',
          datePublished: r.createdAt
            ? new Date(r.createdAt).toISOString().split('T')[0]
            : undefined,
        }))
      : undefined;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.nameEn,
    description: product.descriptionEn ?? '',
    image: product.images.map((img) => img.url),
    url: `${siteUrl}/products/${product.slug}`,
    offers: {
      '@type': 'Offer',
      price: effectivePrice,
      priceCurrency: 'BDT',
      availability,
      url: `${siteUrl}/products/${product.slug}`,
      priceValidUntil: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .split('T')[0],
    },
  };

  if (aggregateRating) jsonLd['aggregateRating'] = aggregateRating;
  if (reviewEntries) jsonLd['review'] = reviewEntries;

  return JSON.stringify(jsonLd);
}

/**
 * Builds a schema.org Organization JSON-LD string for the root layout.
 * @param config - The flat SiteConfigMap fetched from the database.
 * @param siteUrl - The base URL of the deployed storefront.
 * @returns A JSON string suitable for placement in a <script type="application/ld+json"> tag.
 */
export function buildOrganizationJsonLd(
  config: SiteConfigMap,
  siteUrl: string
): string {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: config['contact.storeName'] || 'Eid Store',
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: config['contact.logo'] || '',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: config['contact.phone'] || '',
      contactType: 'customer service',
      areaServed: 'BD',
      availableLanguage: ['Bengali', 'English'],
    },
    sameAs: [
      config['social.facebook'] || '',
      config['social.instagram'] || '',
      config['social.tiktok'] || '',
    ].filter(Boolean),
  };

  return JSON.stringify(jsonLd);
}

/**
 * Builds a schema.org WebSite JSON-LD with SearchAction for Google Sitelinks Search Box.
 * @param config - SiteConfigMap from DB.
 * @param siteUrl - Base URL of the storefront.
 * @returns JSON-LD string.
 */
export function buildWebSiteJsonLd(
  config: SiteConfigMap,
  siteUrl: string
): string {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config['contact.storeName'] || 'Eid Store',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/products?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return JSON.stringify(jsonLd);
}

/**
 * Builds a schema.org BreadcrumbList JSON-LD for product or blog detail pages.
 * @param items - Array of breadcrumb items with name and url.
 * @returns JSON-LD string.
 */
export function buildBreadcrumbJsonLd(
  items: { name: string; url: string }[]
): string {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return JSON.stringify(jsonLd);
}