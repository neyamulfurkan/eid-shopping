// src/app/api/blog/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { slugify } from '@/lib/utils';

// ─────────────────────────────────────────────
// GET /api/blog
// Public — returns published posts (or all posts for admin with published=all)
// ─────────────────────────────────────────────

/**
 * Retrieves a paginated list of blog posts.
 * Public callers receive only published posts ordered by publishedAt desc.
 * Authenticated admins may pass published=all to retrieve every post.
 * @param request - Incoming Next.js request with optional page, limit, published params.
 * @returns Paginated { data: { posts, total, page, limit } } or { error } on failure.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') ?? '10', 10)));
    const publishedParam = searchParams.get('published');

    // Determine whether the caller is an authenticated admin
    const session = await auth();
    const isAdmin = session?.user?.role === 'ADMIN';

    // Build where clause: admins may request all posts; everyone else sees published only
    const showAll = isAdmin && publishedParam === 'all';
    const where = showAll ? {} : { isPublished: true };

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          titleEn: true,
          titleBn: true,
          slug: true,
          excerptEn: true,
          excerptBn: true,
          thumbnailUrl: true,
          publishedAt: true,
          isPublished: true,
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    return NextResponse.json({ data: { posts, total, page, limit } });
  } catch (error) {
    console.error('[GET /api/blog]', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog posts', details: error },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────
// POST /api/blog
// Admin only — creates a new blog post
// ─────────────────────────────────────────────

/**
 * Creates a new blog post. Requires ADMIN session.
 * Auto-generates a slug from titleEn if none is supplied.
 * Sets publishedAt to now when isPublished is true and no publishedAt is provided.
 * @param request - Incoming Next.js request with blog post payload in JSON body.
 * @returns { data: post } with 201 on success, or { error } on failure.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ── Auth guard ──────────────────────────────────────────────────────────
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    if (session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      titleEn,
      titleBn,
      slug: rawSlug,
      excerptEn,
      excerptBn,
      bodyEn,
      bodyBn,
      thumbnailUrl,
      cloudinaryId,
      isPublished,
    } = body as {
      titleEn?: string;
      titleBn?: string;
      slug?: string;
      excerptEn?: string;
      excerptBn?: string;
      bodyEn?: string;
      bodyBn?: string;
      thumbnailUrl?: string;
      cloudinaryId?: string;
      isPublished?: boolean;
    };

    // ── Validation ──────────────────────────────────────────────────────────
    if (!titleEn || typeof titleEn !== 'string' || titleEn.trim().length === 0) {
      return NextResponse.json(
        { error: 'titleEn is required' },
        { status: 400 },
      );
    }

    if (!bodyEn || typeof bodyEn !== 'string' || bodyEn.trim().length < 10) {
      return NextResponse.json(
        { error: 'bodyEn is required and must be at least 10 characters' },
        { status: 400 },
      );
    }

    // ── Slug resolution ─────────────────────────────────────────────────────
    const slug =
      typeof rawSlug === 'string' && rawSlug.trim().length > 0
        ? rawSlug.trim()
        : slugify(titleEn.trim());

    if (!slug) {
      return NextResponse.json(
        { error: 'Could not generate a valid slug from titleEn' },
        { status: 400 },
      );
    }

    // ── Slug uniqueness check ───────────────────────────────────────────────
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: `A blog post with slug "${slug}" already exists` },
        { status: 409 },
      );
    }

    // ── publishedAt logic ───────────────────────────────────────────────────
    const shouldPublish = isPublished === true;
    const publishedAt = shouldPublish ? new Date() : null;

    // ── Create ──────────────────────────────────────────────────────────────
    const post = await prisma.blogPost.create({
      data: {
        titleEn: titleEn.trim(),
        titleBn: typeof titleBn === 'string' && titleBn.trim() ? titleBn.trim() : null,
        slug,
        excerptEn: typeof excerptEn === 'string' && excerptEn.trim() ? excerptEn.trim() : null,
        excerptBn: typeof excerptBn === 'string' && excerptBn.trim() ? excerptBn.trim() : null,
        bodyEn: bodyEn.trim(),
        bodyBn: typeof bodyBn === 'string' && bodyBn.trim() ? bodyBn.trim() : null,
        thumbnailUrl: typeof thumbnailUrl === 'string' && thumbnailUrl.trim() ? thumbnailUrl.trim() : null,
        cloudinaryId: typeof cloudinaryId === 'string' && cloudinaryId.trim() ? cloudinaryId.trim() : null,
        isPublished: shouldPublish,
        publishedAt,
      },
    });

    return NextResponse.json({ data: post }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/blog]', error);
    return NextResponse.json(
      { error: 'Failed to create blog post', details: error },
      { status: 500 },
    );
  }
}