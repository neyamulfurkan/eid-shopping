// src/app/api/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import type { Role } from '@prisma/client';

/**
 * Checks whether the current session belongs to an ADMIN user.
 * @returns The session if admin, null otherwise.
 */
async function getAdminSession() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ADMIN') return null;
  return session;
}

/**
 * GET /api/reviews
 *
 * Admin + ?all=true  → all reviews across all products, ordered newest first,
 *                      each including the parent product's English name.
 * Public + ?productId → approved reviews for that product only.
 *
 * @param request - Incoming Next.js request.
 * @returns JSON response with { data: reviews } or an error shape.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all');
    const productId = searchParams.get('productId');

    const adminSession = await getAdminSession();

    // Admin path: return every review with the product name attached
    if (adminSession && all === 'true') {
      const reviews = await prisma.review.findMany({
        include: {
          product: {
            select: { nameEn: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ data: reviews });
    }

    // Public path: productId is mandatory
    if (!productId) {
      return NextResponse.json(
        { error: 'productId query parameter is required' },
        { status: 400 }
      );
    }

    const reviews = await prisma.review.findMany({
      where: { productId, isApproved: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: reviews });
  } catch (error) {
    console.error('[GET /api/reviews]', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews', details: error },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews
 *
 * Public endpoint. Creates a new review in a pending (unapproved) state.
 * The review will not appear on the storefront until an admin approves it.
 *
 * @param request - Incoming Next.js request containing { productId, reviewerName, rating, comment? }.
 * @returns JSON response with { data: review } and HTTP 201, or an error shape.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { productId, reviewerName, rating, comment } = body as Record<string, unknown>;

    // Validate productId
    if (!productId || typeof productId !== 'string') {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      );
    }

    // Confirm the product actually exists
    const productExists = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!productExists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Validate reviewerName
    if (
      !reviewerName ||
      typeof reviewerName !== 'string' ||
      reviewerName.trim().length < 2
    ) {
      return NextResponse.json(
        { error: 'reviewerName must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Validate rating: must be an integer between 1 and 5
    const ratingNum = Number(rating);
    if (
      rating === undefined ||
      rating === null ||
      !Number.isInteger(ratingNum) ||
      ratingNum < 1 ||
      ratingNum > 5
    ) {
      return NextResponse.json(
        { error: 'rating must be an integer between 1 and 5' },
        { status: 400 }
      );
    }

    // Sanitise optional comment
    const sanitisedComment =
      comment && typeof comment === 'string' ? comment.trim() : null;

    const review = await prisma.review.create({
      data: {
        productId,
        reviewerName: reviewerName.trim(),
        rating: ratingNum,
        comment: sanitisedComment,
        isApproved: false,
      },
    });

    return NextResponse.json({ data: review }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/reviews]', error);
    return NextResponse.json(
      { error: 'Failed to create review', details: error },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/reviews
 *
 * Admin only. Approves or rejects a review by updating its isApproved flag.
 *
 * @param request - Incoming Next.js request containing { id, isApproved }.
 * @returns JSON response with { data: updatedReview } or an error shape.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { id, isApproved } = body as Record<string, unknown>;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Review id is required' },
        { status: 400 }
      );
    }

    if (typeof isApproved !== 'boolean') {
      return NextResponse.json(
        { error: 'isApproved must be a boolean' },
        { status: 400 }
      );
    }

    const review = await prisma.review.update({
      where: { id },
      data: { isApproved },
    });

    return NextResponse.json({ data: review });
  } catch (error) {
    console.error('[PATCH /api/reviews]', error);
    return NextResponse.json(
      { error: 'Failed to update review', details: error },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reviews
 *
 * Admin only. Permanently removes a review from the database.
 *
 * @param request - Incoming Next.js request containing { id }.
 * @returns JSON response with { data: 'deleted' } or an error shape.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { id } = body as Record<string, unknown>;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Review id is required' },
        { status: 400 }
      );
    }

    await prisma.review.delete({ where: { id } });

    return NextResponse.json({ data: 'deleted' });
  } catch (error) {
    console.error('[DELETE /api/reviews]', error);
    return NextResponse.json(
      { error: 'Failed to delete review', details: error },
      { status: 500 }
    );
  }
}