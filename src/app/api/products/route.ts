// src/app/api/products/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import type { AdminProductListItem } from '@/lib/types';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Asserts the request has a valid ADMIN session.
 * @param request - The incoming NextRequest (unused but kept for future IP logging).
 * @returns The session if valid, or a NextResponse 401/403 to return immediately.
 */
async function requireAdmin(): Promise<
  | { session: import('next-auth').Session; error: null }
  | { session: null; error: NextResponse }
> {
  const session = await auth();
  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Unauthenticated' }, { status: 401 }),
    };
  }
  if (session.user.role !== 'ADMIN') {
    return {
      session: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { session, error: null };
}

// ─────────────────────────────────────────────
// GET /api/products
// ─────────────────────────────────────────────

/**
 * Public product listing endpoint with filtering, sorting, and pagination.
 * @param request - Incoming GET request with optional query params:
 *   categorySlug, page, limit, featured, flashDeal, search, sortBy.
 * @returns Paginated product list with total count.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;

    const categorySlug = searchParams.get('categorySlug') ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') ?? '24', 10)),
    );
    const featured = searchParams.get('featured');
    const flashDeal = searchParams.get('flashDeal');
    const search = searchParams.get('search') ?? undefined;
    const sortBy = searchParams.get('sortBy') ?? 'newest';

    // Build where clause
    const where = {
      isActive: true,
      ...(categorySlug && { category: { slug: categorySlug } }),
      ...(featured === 'true' && { isFeatured: true }),
      ...(flashDeal === 'true' && {
        isFlashDeal: true,
        flashDealEndsAt: { gt: new Date() },
      }),
      ...(search && {
        OR: [
          { nameEn: { contains: search, mode: 'insensitive' as const } },
          { nameBn: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    // Build orderBy clause
    type OrderBy =
      | { basePrice: 'asc' | 'desc' }
      | { createdAt: 'asc' | 'desc' }
      | { orderItems: { _count: 'desc' } };

    const orderByMap: Record<string, OrderBy> = {
      price_asc: { basePrice: 'asc' },
      price_desc: { basePrice: 'desc' },
      popular: { orderItems: { _count: 'desc' } },
      newest: { createdAt: 'desc' },
    };
    const orderBy: OrderBy = orderByMap[sortBy] ?? { createdAt: 'desc' };

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          nameEn: true,
          nameBn: true,
          slug: true,
          basePrice: true,
          salePrice: true,
          stockQty: true,
          lowStockThreshold: true,
          isActive: true,
          isFeatured: true,
          isFlashDeal: true,
          flashDealEndsAt: true,
          descriptionEn: true,
          descriptionBn: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: {
              id: true,
              nameEn: true,
              nameBn: true,
              slug: true,
            },
          },
          images: {
            take: 2,
            orderBy: { displayOrder: 'asc' },
            select: {
              id: true,
              url: true,
              cloudinaryId: true,
              displayOrder: true,
              isDefault: true,
            },
          },
          _count: {
            select: { reviews: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

        const serialized: AdminProductListItem[] = products.map((p) => ({
      id: p.id,
      slug: p.slug,
      nameEn: p.nameEn,
      nameBn: p.nameBn,
      descriptionEn: p.descriptionEn ?? null,
      descriptionBn: p.descriptionBn ?? null,
      basePrice: Number(p.basePrice),
      salePrice: p.salePrice !== null ? Number(p.salePrice) : null,
      isFlashDeal: p.isFlashDeal,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
            flashDealEndsAt: p.flashDealEndsAt
        ? p.flashDealEndsAt.toISOString()
        : null,
      stockQty: p.stockQty,
      lowStockThreshold: p.lowStockThreshold,
      images: p.images.map((img) => ({
        url: img.url,
        cloudinaryId: img.cloudinaryId,
        isDefault: img.isDefault,
      })),
      category: {
        nameEn: p.category.nameEn,
        nameBn: p.category.nameBn,
      },
      _count: p._count,
    }));

    return NextResponse.json({
      data: {
        products: serialized,
        total,
        page,
        limit,
      },
    });
  } catch (err) {
    console.error('[GET /api/products]', err);
    return NextResponse.json(
      { error: 'Failed to fetch products', details: err instanceof Error ? err.message : err },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────
// POST /api/products
// ─────────────────────────────────────────────

interface ImageInput {
  url: string;
  cloudinaryId: string;
  isDefault?: boolean;
  displayOrder?: number;
}

interface VariantInput {
  type: string;
  value: string;
  stockQty?: number;
  priceModifier?: number;
}

interface CreateProductBody {
  nameEn: string;
  nameBn?: string;
  slug: string;
  categoryId: string;
  descriptionEn?: string;
  descriptionBn?: string;
  basePrice: number | string;
  salePrice?: number | string | null;
  costPrice?: number | string | null;
  stockQty?: number | string;
  lowStockThreshold?: number | string;
  isFeatured?: boolean;
  isFlashDeal?: boolean;
  flashDealEndsAt?: string | null;
  isActive?: boolean;
  images?: ImageInput[];
  variants?: VariantInput[];
}

/**
 * Admin-only endpoint to create a new product with nested images and variants.
 * @param request - POST request with product payload in the JSON body.
 * @returns The created product record with 201, or an error response.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = (await request.json()) as CreateProductBody;

    // ── Validation ───────────────────────────
    if (!body.nameEn || typeof body.nameEn !== 'string' || body.nameEn.trim().length === 0) {
      return NextResponse.json(
        { error: 'nameEn is required' },
        { status: 400 },
      );
    }

    if (!body.slug || typeof body.slug !== 'string' || body.slug.trim().length === 0) {
      return NextResponse.json(
        { error: 'slug is required' },
        { status: 400 },
      );
    }

    const basePrice = parseFloat(String(body.basePrice));
    if (isNaN(basePrice) || basePrice <= 0) {
      return NextResponse.json(
        { error: 'basePrice must be a positive number' },
        { status: 400 },
      );
    }

    if (!body.categoryId) {
      return NextResponse.json(
        { error: 'categoryId is required' },
        { status: 400 },
      );
    }

    // ── Slug uniqueness check ────────────────
    const existing = await prisma.product.findUnique({
      where: { slug: body.slug.trim() },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A product with slug "${body.slug}" already exists` },
        { status: 409 },
      );
    }

    // ── Coerce optional numerics ─────────────
    const salePrice =
      body.salePrice != null && body.salePrice !== ''
        ? parseFloat(String(body.salePrice))
        : null;
    const costPrice =
      body.costPrice != null && body.costPrice !== ''
        ? parseFloat(String(body.costPrice))
        : null;
    const stockQty =
      body.stockQty != null ? parseInt(String(body.stockQty), 10) : 0;
    const lowStockThreshold =
      body.lowStockThreshold != null
        ? parseInt(String(body.lowStockThreshold), 10)
        : 5;
    const flashDealEndsAt =
      body.isFlashDeal && body.flashDealEndsAt
        ? new Date(body.flashDealEndsAt)
        : null;

    // ── Prepare nested data ──────────────────
    const images: ImageInput[] = Array.isArray(body.images) ? body.images : [];
    const variants: VariantInput[] = Array.isArray(body.variants) ? body.variants : [];

    // ── Create product ───────────────────────
    const product = await prisma.product.create({
      data: {
        nameEn: body.nameEn.trim(),
        nameBn: body.nameBn?.trim() ?? '',
        slug: body.slug.trim(),
        categoryId: body.categoryId,
        descriptionEn: body.descriptionEn?.trim() ?? null,
        descriptionBn: body.descriptionBn?.trim() ?? null,
        basePrice,
        salePrice: salePrice !== null && !isNaN(salePrice) ? salePrice : null,
        costPrice: costPrice !== null && !isNaN(costPrice) ? costPrice : null,
        stockQty: isNaN(stockQty) ? 0 : stockQty,
        lowStockThreshold: isNaN(lowStockThreshold) ? 5 : lowStockThreshold,
        isFeatured: body.isFeatured ?? false,
        isFlashDeal: body.isFlashDeal ?? false,
        flashDealEndsAt,
        isActive: body.isActive ?? true,
        images: {
          createMany: {
            data: images.map((img, idx) => ({
              url: img.url,
              cloudinaryId: img.cloudinaryId,
              isDefault: img.isDefault ?? idx === 0,
              displayOrder: img.displayOrder ?? idx,
            })),
          },
        },
        variants: {
          createMany: {
            data: variants.map((v) => ({
              type: v.type,
              value: v.value,
              stockQty: v.stockQty ?? 0,
              priceModifier: v.priceModifier ?? 0,
            })),
          },
        },
      },
      include: {
        category: true,
        images: { orderBy: { displayOrder: 'asc' } },
        variants: true,
      },
    });

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/products]', err);
    return NextResponse.json(
      { error: 'Failed to create product', details: err instanceof Error ? err.message : err },
      { status: 500 },
    );
  }
}