// src/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { deleteImage } from '@/lib/cloudinary';

/**
 * Checks whether the current session belongs to an ADMIN user.
 * @returns The session if admin, null otherwise.
 */
async function requireAdmin() {
  const session = await auth();
  if (!session || session.user?.role !== 'ADMIN') return null;
  return session;
}

/**
 * GET /api/products/[id]
 * Public. Fetches a single product by id or slug, including all images,
 * variants, category, and approved reviews.
 * @param _req - Incoming request (unused).
 * @param params - Route params containing the product id or slug.
 * @returns Full product object or 404.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { id } = params;

    // Try by id first, then fall back to slug
    let product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        variants: { where: { isActive: true }, orderBy: { type: 'asc' } },
        category: true,
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      product = await prisma.product.findUnique({
        where: { slug: id },
        include: {
          images: { orderBy: { displayOrder: 'asc' } },
          variants: { where: { isActive: true }, orderBy: { type: 'asc' } },
          category: true,
          reviews: {
            where: { isApproved: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ data: product });
  } catch (err) {
    console.error('[GET /api/products/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/products/[id]
 * Admin only. Partially updates a product including image and variant arrays.
 * Removed images are deleted from Cloudinary and the DB.
 * @param req - Request with partial product fields in the JSON body.
 * @param params - Route params containing the product id.
 * @returns Updated product or error response.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = (await req.json()) as Record<string, unknown>;

    const existing = await prisma.product.findUnique({
      where: { id },
      include: { images: true, variants: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // ── Handle images ──────────────────────────────────────────────────────
    if (Array.isArray(body.images)) {
      const incomingIds = (body.images as { id?: string }[])
        .map((img) => img.id)
        .filter(Boolean) as string[];

      // Delete images that are no longer in the incoming array
      const toDelete = existing.images.filter((img) => !incomingIds.includes(img.id));
      for (const img of toDelete) {
        await deleteImage(img.cloudinaryId).catch(() => {
          // Non-fatal: log but continue
          console.warn(`Failed to delete Cloudinary asset: ${img.cloudinaryId}`);
        });
        await prisma.productImage.delete({ where: { id: img.id } });
      }

      // Create new images (those without an id)
      const newImages = (body.images as { id?: string; url: string; cloudinaryId: string; displayOrder?: number; isDefault?: boolean }[])
        .filter((img) => !img.id);
      for (const img of newImages) {
        await prisma.productImage.create({
          data: {
            productId: id,
            url: img.url,
            cloudinaryId: img.cloudinaryId,
            displayOrder: img.displayOrder ?? 0,
            isDefault: img.isDefault ?? false,
          },
        });
      }

      delete body.images;
    }

    // ── Handle variants ────────────────────────────────────────────────────
    if (Array.isArray(body.variants)) {
      const incomingVariantIds = (body.variants as { id?: string }[])
        .map((v) => v.id)
        .filter(Boolean) as string[];

      // Delete removed variants
      const variantsToDelete = existing.variants.filter(
        (v) => !incomingVariantIds.includes(v.id),
      );
      for (const v of variantsToDelete) {
        await prisma.productVariant.delete({ where: { id: v.id } });
      }

      // Upsert each variant
      for (const v of body.variants as {
        id?: string;
        type: string;
        value: string;
        priceModifier?: number;
        stockQty?: number;
        isActive?: boolean;
      }[]) {
        if (v.id) {
          await prisma.productVariant.update({
            where: { id: v.id },
            data: {
              type: v.type,
              value: v.value,
              priceModifier: v.priceModifier ?? 0,
              stockQty: v.stockQty ?? 0,
              isActive: v.isActive ?? true,
            },
          });
        } else {
          await prisma.productVariant.create({
            data: {
              productId: id,
              type: v.type,
              value: v.value,
              priceModifier: v.priceModifier ?? 0,
              stockQty: v.stockQty ?? 0,
              isActive: v.isActive ?? true,
            },
          });
        }
      }

      delete body.variants;
    }

    // ── Update scalar fields ───────────────────────────────────────────────
    const {
      basePrice,
      salePrice,
      costPrice,
      flashDealEndsAt,
      ...rest
    } = body as {
      basePrice?: unknown;
      salePrice?: unknown;
      costPrice?: unknown;
      flashDealEndsAt?: unknown;
      [key: string]: unknown;
    };

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(basePrice !== undefined && { basePrice: parseFloat(String(basePrice)) }),
        ...(salePrice !== undefined && { salePrice: salePrice === null ? null : parseFloat(String(salePrice)) }),
        ...(costPrice !== undefined && { costPrice: costPrice === null ? null : parseFloat(String(costPrice)) }),
        ...(flashDealEndsAt !== undefined && { flashDealEndsAt: flashDealEndsAt === null ? null : new Date(String(flashDealEndsAt)) }),
      },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        variants: true,
        category: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('[PATCH /api/products/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/products/[id]
 * Admin only. Deletes all Cloudinary images for the product, then removes
 * the product and all related records from the database.
 * @param _req - Incoming request (unused).
 * @param params - Route params containing the product id.
 * @returns Success message or error response.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Delete all Cloudinary assets first
    for (const img of product.images) {
      await deleteImage(img.cloudinaryId).catch(() => {
        console.warn(`Failed to delete Cloudinary asset: ${img.cloudinaryId}`);
      });
    }

    // Prisma cascades will handle OrderItem, Review, ProductImage, ProductVariant
    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ data: 'deleted' });
  } catch (err) {
    console.error('[DELETE /api/products/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}