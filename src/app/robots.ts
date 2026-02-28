// src/app/robots.ts

import { MetadataRoute } from 'next';

/**
 * Generates the robots.txt file served at /robots.txt.
 * Allows all crawlers on public pages and blocks admin routes.
 * @returns MetadataRoute.Robots object consumed by Next.js.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/admin/*',
          '/auth/',
          '/api/',
          '/order-confirmation',
          '/checkout',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}