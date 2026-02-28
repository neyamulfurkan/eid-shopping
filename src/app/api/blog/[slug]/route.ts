// src/app/api/blog/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { deleteImage } from '@/lib/cloudinary';

/**
 * Checks whether the current request has a valid ADMIN session.
 * @returns True if the caller is an authenticated admin, false otherwise.
 */
async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === 'ADMIN';
}

/**
 * GET /api/blog/[slug]
 * Public: returns published post by slug.
 * Admin: returns post regardless of published status (preview mode).
 *
 * @param _req - Incoming request (unused).
 * @param context - Route context containing slug param.
 * @returns JSON { data: BlogPost } or { error: string }.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  try {
    const { slug } = await context.params;
    const admin = await isAdmin();

    const post = await prisma.blogPost.findUnique({
      where: { slug },
    });

    // Non-admins cannot view missing or unpublished posts
    if (!admin && (!post || !post.isPublished)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // post will not be null here if admin === true (we skip the null guard above)
    if (!post) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ data: post });
  } catch (err) {
    console.error('[GET /api/blog/[slug]]', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/blog/[slug]
 * Admin only. Partially updates a blog post.
 * Automatically sets publishedAt when post is first published.
 *
 * @param req - Incoming request with partial BlogPost body.
 * @param context - Route context containing slug param.
 * @returns JSON { data: BlogPost } or { error: string }.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { slug } = await context.params;

    const body = await req.json() as Record<string, unknown>;

    // Fetch the current post to check existing publishedAt
    const existing = await prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true, isPublished: true, publishedAt: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Auto-set publishedAt when transitioning from unpublished → published for the first time
    const isBeingPublished =
      body.isPublished === true &&
      existing.isPublished === false &&
      existing.publishedAt === null;

    const updated = await prisma.blogPost.update({
      where: { slug },
      data: {
        ...(typeof body.titleEn === 'string' && { titleEn: body.titleEn }),
        ...(body.titleBn !== undefined && { titleBn: body.titleBn as string | null }),
        ...(typeof body.slug === 'string' && { slug: body.slug }),
        ...(body.excerptEn !== undefined && { excerptEn: body.excerptEn as string | null }),
        ...(body.excerptBn !== undefined && { excerptBn: body.excerptBn as string | null }),
        ...(typeof body.bodyEn === 'string' && { bodyEn: body.bodyEn }),
        ...(body.bodyBn !== undefined && { bodyBn: body.bodyBn as string | null }),
        ...(body.thumbnailUrl !== undefined && { thumbnailUrl: body.thumbnailUrl as string | null }),
        ...(body.cloudinaryId !== undefined && { cloudinaryId: body.cloudinaryId as string | null }),
        ...(typeof body.isPublished === 'boolean' && { isPublished: body.isPublished }),
        ...(isBeingPublished && { publishedAt: new Date() }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('[PATCH /api/blog/[slug]]', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/blog/[slug]
 * Admin only. Deletes a blog post and its associated Cloudinary asset if present.
 *
 * @param _req - Incoming request (unused).
 * @param context - Route context containing slug param.
 * @returns JSON { data: 'deleted' } or { error: string }.
 */
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { slug } = await context.params;

    const post = await prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true, cloudinaryId: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Remove Cloudinary asset before deleting the DB record
    if (post.cloudinaryId) {
      await deleteImage(post.cloudinaryId);
    }

    await prisma.blogPost.delete({ where: { slug } });

    return NextResponse.json({ data: 'deleted' });
  } catch (err) {
    console.error('[DELETE /api/blog/[slug]]', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}