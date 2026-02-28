// src/app/(store)/products/[slug]/page.tsx

import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ProductImageGallery } from '@/components/storefront/ProductImageGallery';
import { ReviewsSection } from '@/components/storefront/ReviewsSection';
import { WhatsAppButton } from '@/components/storefront/WhatsAppButton';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { buildProductJsonLd, buildBreadcrumbJsonLd } from '@/lib/jsonld';
import { formatPrice } from '@/lib/utils';
import type { AdminProductListItem } from '@/lib/types';
import { AddToCartWidget } from './AddToCartWidget';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ProductPageProps {
  params: { slug: string };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Serialises Prisma Decimal fields on a product to plain numbers for safe
 * client prop passing. Called on both the main product and related products.
 */
function serialiseProduct(product: {
  id: string;
  slug: string;
  nameEn: string;
  nameBn: string;
  descriptionEn: string | null;
  descriptionBn: string | null;
  basePrice: { toString(): string };
  salePrice: { toString(): string } | null;
  isFlashDeal: boolean;
  isActive: boolean;
  isFeatured: boolean;
  flashDealEndsAt: Date | null;
  stockQty: number;
  lowStockThreshold: number;
  images: { url: string; cloudinaryId: string; isDefault: boolean }[];
  category: { nameEn: string; nameBn: string };
  _count?: { reviews: number };
}): AdminProductListItem {
    return {
    ...product,
    basePrice: parseFloat(product.basePrice.toString()),
    salePrice: product.salePrice ? parseFloat(product.salePrice.toString()) : null,
    flashDealEndsAt: product.flashDealEndsAt
      ? product.flashDealEndsAt.toISOString()
      : null,
  };
}

// ─────────────────────────────────────────────
// Static Params
// ─────────────────────────────────────────────

/**
 * Pre-generates static paths for all active products at build time.
 * @returns An array of slug params for Next.js static generation.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true },
  });
  return products.map((p) => ({ slug: p.slug }));
}

// ─────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────

/**
 * Generates dynamic SEO metadata for the product detail page.
 * @param params - Route params containing the product slug.
 * @returns Next.js Metadata object.
 */
export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    select: {
      nameEn: true,
      descriptionEn: true,
      images: { take: 1, select: { url: true } },
    },
  });

  if (!product) return { title: 'Product Not Found' };

  const siteUrl = process.env.NEXTAUTH_URL || '';

  return {
    title: product.nameEn,
    description: product.descriptionEn ?? undefined,
    alternates: {
      canonical: `${siteUrl}/products/${params.slug}`,
    },
    openGraph: {
      title: product.nameEn,
      description: product.descriptionEn ?? undefined,
      url: `${siteUrl}/products/${params.slug}`,
      type: 'website',
      images: product.images[0]?.url
        ? [{ url: product.images[0].url, width: 1200, height: 630, alt: product.nameEn }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.nameEn,
      description: product.descriptionEn ?? undefined,
      images: product.images[0]?.url ? [product.images[0].url] : [],
    },
  };
}

// ─────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────

/**
 * Product detail server page. Fetches the full product with images, active variants,
 * and approved reviews, renders server layout, and delegates interactive islands
 * (variant selector, cart widget, reviews form) to client components.
 */
export default async function ProductDetailPage({ params }: ProductPageProps) {
  // ── Fetch main product ──────────────────────────────────────────────────
  const raw = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: {
      category: { select: { nameEn: true, nameBn: true } },
      images: { orderBy: { displayOrder: 'asc' } },
      variants: { where: { isActive: true } },
      reviews: {
        where: { isApproved: true },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { reviews: true } },
    },
  });

  if (!raw || !raw.isActive) return notFound();

  const product = serialiseProduct(raw);

  // ── Fetch related products ──────────────────────────────────────────────
  const rawRelated = await prisma.product.findMany({
    where: {
      categoryId: raw.categoryId,
      id: { not: raw.id },
      isActive: true,
    },
    include: {
      category: { select: { nameEn: true, nameBn: true } },
      images: { take: 2, orderBy: { displayOrder: 'asc' } },
      _count: { select: { reviews: true } },
    },
    take: 4,
  });

  const relatedProducts: AdminProductListItem[] = rawRelated.map(serialiseProduct);

  // ── Effective pricing ────────────────────────────────────────────────────
  const hasDiscount =
    product.salePrice !== null && product.salePrice < product.basePrice;
  const displayPrice = product.salePrice ?? product.basePrice;

  // ── JSON-LD ──────────────────────────────────────────────────────────────
  const siteUrl = process.env.NEXTAUTH_URL || '';
  const jsonLd = buildProductJsonLd(
    {
      ...product,
      images: raw.images.map((i) => ({ url: i.url, cloudinaryId: i.cloudinaryId, isDefault: i.isDefault })),
      reviews: raw.reviews,
    },
    siteUrl,
  );

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: siteUrl },
    { name: 'Products', url: `${siteUrl}/products` },
    { name: product.nameEn, url: `${siteUrl}/products/${product.slug}` },
  ]);

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <>
      {/* Product structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      {/* Breadcrumb structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />

      <Navbar />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Breadcrumb ──────────────────────────────────────────────── */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-brand-text/60">
          <a href="/" className="hover:text-brand-primary transition-colors">Home</a>
          <span>/</span>
          <a href="/products" className="hover:text-brand-primary transition-colors">Products</a>
          <span>/</span>
          <span className="text-brand-text truncate max-w-[200px]">{product.nameEn}</span>
        </nav>

        {/* ── Two-column product area ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

          {/* Left: Image Gallery */}
          <div>
            <ProductImageGallery images={raw.images} />
          </div>

          {/* Right: Product Info + Cart Widget */}
          <div className="flex flex-col gap-6">

            {/* Category badge */}
            <div>
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full">
                {product.category.nameEn}
              </span>
            </div>

            {/* Product name */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-text leading-tight mb-1">
                {product.nameEn}
              </h1>
              {product.nameBn && (
                <p className="text-lg text-brand-text/70 font-medium">
                  {product.nameBn}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-brand-primary">
                {formatPrice(displayPrice)}
              </span>
              {hasDiscount && (
                <span className="text-lg text-brand-text/40 line-through">
                  {formatPrice(product.basePrice)}
                </span>
              )}
              {hasDiscount && (
                <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  {Math.round(
                    ((product.basePrice - (product.salePrice ?? 0)) / product.basePrice) * 100,
                  )}% off
                </span>
              )}
            </div>

            {/* Stock status */}
            {product.stockQty === 0 && (
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg w-fit">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Out of Stock
              </div>
            )}
            {product.stockQty > 0 && product.stockQty <= product.lowStockThreshold && (
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg w-fit">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Only {product.stockQty} left in stock
              </div>
            )}

            {/* Interactive cart + variant widget (client island) */}
            <AddToCartWidget
              product={product}
              variants={raw.variants}
            />

            {/* WhatsApp order button */}
            <WhatsAppButton
              productNameEn={product.nameEn}
              productNameBn={product.nameBn}
              selectedVariants={{}}
            />

            {/* Product description */}
            {(product.descriptionEn || product.descriptionBn) && (
              <div className="border-t border-brand-secondary/20 pt-5">
                <details className="group">
                  <summary className="cursor-pointer flex items-center justify-between font-semibold text-brand-text select-none list-none py-1">
                    <span>Product Description</span>
                    <svg
                      className="w-5 h-5 text-brand-text/50 group-open:rotate-180 transition-transform duration-200"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-3 text-sm text-brand-text/80 leading-relaxed space-y-2">
                    {product.descriptionEn && <p>{product.descriptionEn}</p>}
                    {product.descriptionBn && (
                      <p className="text-brand-text/70">{product.descriptionBn}</p>
                    )}
                  </div>
                </details>
              </div>
            )}

          </div>
        </div>

        {/* ── Reviews Section ─────────────────────────────────────────── */}
        <div className="mt-16 border-t border-brand-secondary/20 pt-10">
          <ReviewsSection productId={raw.id} reviews={raw.reviews} />
        </div>

        {/* ── Related Products ─────────────────────────────────────────── */}
        {relatedProducts.length > 0 && (
          <AnimatedSection className="mt-16">
            <h2 className="text-xl font-bold text-brand-text mb-6">
              Related Products
            </h2>
            <ProductGrid products={relatedProducts} />
          </AnimatedSection>
        )}

      </main>

      <Footer />
    </>
  );
}