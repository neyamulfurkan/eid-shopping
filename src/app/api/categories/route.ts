// src/app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { slugify } from '@/lib/utils';

/**
 * Asserts the requester has an active ADMIN session.
 * @returns The session on success, or a NextResponse 401/403 on failure.
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

/**
 * GET /api/categories
 * Public. Returns all active categories ordered by displayOrder with product count.
 * @returns { data: Category[] }
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Check if this is an admin request (has session) or public storefront request
    const session = await auth();
    const isAdmin = session?.user?.role === 'ADMIN';

    const categories = await prisma.category.findMany({
      where: isAdmin ? undefined : { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error('[GET /api/categories]', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: error },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories
 * Admin only. Creates a new category with an auto-generated or provided slug.
 * @param request - Body: { nameEn, nameBn, slug?, imageUrl?, displayOrder? }
 * @returns { data: Category } with status 201.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body: {
      nameEn?: string;
      nameBn?: string;
      slug?: string;
      imageUrl?: string;
      displayOrder?: number;
    } = await request.json();

    if (!body.nameEn || body.nameEn.trim().length === 0) {
      return NextResponse.json(
        { error: 'nameEn is required' },
        { status: 400 }
      );
    }

    const slug = (body.slug ?? slugify(body.nameEn)).trim().toLowerCase();

    if (!slug) {
      return NextResponse.json(
        { error: 'Could not derive a valid slug from nameEn' },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: `A category with slug "${slug}" already exists` },
        { status: 409 }
      );
    }

    const category = await prisma.category.create({
      data: {
        nameEn: body.nameEn.trim(),
        nameBn: body.nameBn?.trim() ?? '',
        slug,
        imageUrl: body.imageUrl ?? null,
        displayOrder: body.displayOrder ?? 0,
        isActive: true,
      },
    });

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/categories]', error);
    return NextResponse.json(
      { error: 'Failed to create category', details: error },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/categories
 * Admin only. Partially updates an existing category by id.
 * @param request - Body: { id, nameEn?, nameBn?, slug?, imageUrl?, displayOrder?, isActive? }
 * @returns { data: Category }
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body: {
      id?: string;
      nameEn?: string;
      nameBn?: string;
      slug?: string;
      imageUrl?: string;
      displayOrder?: number;
      isActive?: boolean;
    } = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // If slug is being updated, verify uniqueness excluding current record
    if (body.slug) {
      const slugConflict = await prisma.category.findFirst({
        where: { slug: body.slug, NOT: { id: body.id } },
      });
      if (slugConflict) {
        return NextResponse.json(
          { error: `A category with slug "${body.slug}" already exists` },
          { status: 409 }
        );
      }
    }

    const { id, ...updateFields } = body;

    const updated = await prisma.category.update({
      where: { id },
      data: updateFields,
      include: {
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[PATCH /api/categories]', error);
    return NextResponse.json(
      { error: 'Failed to update category', details: error },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categories
 * Admin only. Deletes a category only if it has no associated products.
 * @param request - Body: { id }
 * @returns { data: 'deleted' } or 409 if products exist.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body: { id?: string } = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const productCount = await prisma.product.count({
      where: { categoryId: body.id },
    });

    if (productCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with existing products' },
        { status: 409 }
      );
    }

    await prisma.category.delete({ where: { id: body.id } });

    return NextResponse.json({ data: 'deleted' });
  } catch (error) {
    console.error('[DELETE /api/categories]', error);
    return NextResponse.json(
      { error: 'Failed to delete category', details: error },
      { status: 500 }
    );
  }
}