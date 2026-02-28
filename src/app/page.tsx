// src/app/page.tsx
import { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCachedSiteConfig } from '@/lib/siteConfig';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HomepageSections } from '@/components/storefront/HomepageSections';
import type { AdminProductListItem } from '@/lib/types';

// ─────────────────────────────────────────────
// Cached data fetchers
// ─────────────────────────────────────────────

/**
 * Fetches all active banners ordered by displayOrder.
 * Cached for 60 seconds with the 'banners' tag.
 */
const getBanners = unstable_cache(
  async () => {
    return prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  },
  ['homepage-banners'],
  { tags: ['banners'], revalidate: 60 },
);

/**
 * Fetches up to 8 active flash deal products whose deal has not yet expired.
 * Cached for 60 seconds with the 'flash-products' tag.
 */
const getFlashProducts = unstable_cache(
  async (): Promise<AdminProductListItem[]> => {
    const rows = await prisma.product.findMany({
      where: {
        isFlashDeal: true,
        isActive: true,
        flashDealEndsAt: { gt: new Date() },
      },
      include: {
        images: {
          take: 2,
          orderBy: { displayOrder: 'asc' },
        },
        category: {
          select: { nameEn: true, nameBn: true },
        },
        _count: { select: { reviews: true } },
      },
      take: 8,
    });

    return rows.map(serializeProduct);
  },
  ['homepage-flash-products'],
  { tags: ['flash-products', 'products'], revalidate: 60 },
);

/**
 * Fetches up to 8 active featured products.
 * Cached for 60 seconds with the 'featured-products' tag.
 */
const getFeaturedProducts = unstable_cache(
  async (): Promise<AdminProductListItem[]> => {
    const rows = await prisma.product.findMany({
      where: { isFeatured: true, isActive: true },
      include: {
        images: {
          take: 2,
          orderBy: { displayOrder: 'asc' },
        },
        category: {
          select: { nameEn: true, nameBn: true },
        },
        _count: { select: { reviews: true } },
      },
      take: 8,
    });

    return rows.map(serializeProduct);
  },
  ['homepage-featured-products'],
  { tags: ['featured-products', 'products'], revalidate: 60 },
);

/**
 * Fetches up to 8 of the most recently created active products.
 * Cached for 60 seconds with the 'new-arrivals' tag.
 */
const getNewArrivals = unstable_cache(
  async (): Promise<AdminProductListItem[]> => {
    const rows = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        images: {
          take: 2,
          orderBy: { displayOrder: 'asc' },
        },
        category: {
          select: { nameEn: true, nameBn: true },
        },
        _count: { select: { reviews: true } },
      },
      take: 8,
    });

    return rows.map(serializeProduct);
  },
  ['homepage-new-arrivals'],
  { tags: ['new-arrivals', 'products'], revalidate: 60 },
);

// ─────────────────────────────────────────────
// Serialiser
// ─────────────────────────────────────────────

/**
 * Converts Prisma Decimal monetary fields to plain numbers so the data is
 * serialisable across the server → client component boundary.
 *
 * @param row - Raw Prisma product row with Decimal fields.
 * @returns    AdminProductListItem with numeric monetary fields.
 */
function serializeProduct(
  row: Awaited<ReturnType<typeof prisma.product.findMany<{
    include: {
      images: { take: number; orderBy: { displayOrder: 'asc' } };
      category: { select: { nameEn: true; nameBn: true } };
      _count: { select: { reviews: true } };
    };
  }>>>[number],
): AdminProductListItem {
  return {
    id: row.id,
    slug: row.slug,
    nameEn: row.nameEn,
    nameBn: row.nameBn,
    basePrice: Number(row.basePrice),
    salePrice: row.salePrice !== null ? Number(row.salePrice) : null,
    isFlashDeal: row.isFlashDeal,
    isActive: row.isActive,
    isFeatured: row.isFeatured,
     flashDealEndsAt: row.flashDealEndsAt ? new Date(row.flashDealEndsAt).toISOString() as unknown as Date : null,
    descriptionEn: row.descriptionEn,
    descriptionBn: row.descriptionBn,
    stockQty: row.stockQty,
    lowStockThreshold: row.lowStockThreshold,
    images: row.images.map((img) => ({
      url: img.url,
      cloudinaryId: img.cloudinaryId,
      isDefault: img.isDefault,
    })),
    category: {
      nameEn: row.category.nameEn,
      nameBn: row.category.nameBn,
    },
    _count: row._count,
  };
}

// ─────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────

/**
 * Generates Next.js page metadata from live SiteConfig values.
 * @returns Metadata object with title, description, and Open Graph fields.
 */
export async function generateMetadata(): Promise<Metadata> {
  const config = await getCachedSiteConfig();

  const storeName = config['contact.storeName'] || 'Eid Store';
  const description =
    config['contact.descriptionEn'] ||
    `${storeName} — Premium fashion and cosmetics for Eid and Ramadan.`;
  const logoUrl = config['contact.logo'] || '';
  const siteUrl = process.env.NEXTAUTH_URL || '';

  return {
    title: `Home | ${storeName}`,
    description,
    alternates: {
      canonical: siteUrl,
    },
    openGraph: {
      title: `Home | ${storeName}`,
      description,
      url: siteUrl,
      siteName: storeName,
      images: logoUrl
        ? [{ url: logoUrl, width: 1200, height: 630, alt: storeName }]
        : [],
      type: 'website',
      locale: 'bn_BD',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Home | ${storeName}`,
      description,
      images: logoUrl ? [logoUrl] : [],
    },
  };
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

/**
 * Homepage server component.
 * Fetches all section data in parallel and passes it to the
 * client-rendered HomepageSections component.
 */
export default async function HomePage() {
  const [banners, flashProducts, featuredProducts, newArrivals] =
    await Promise.all([
      getBanners(),
      getFlashProducts(),
      getFeaturedProducts(),
      getNewArrivals(),
    ]);

  return (
    <>
      <Navbar />
      <HomepageSections
        banners={banners}
        flashProducts={flashProducts}
        featuredProducts={featuredProducts}
        newArrivals={newArrivals}
      />
      <Footer />
    </>
  );
}