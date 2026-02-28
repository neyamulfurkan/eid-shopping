// src/app/api/site-config/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getCachedSiteConfig, setSiteConfigBatch } from '@/lib/siteConfig';
import type { SiteConfigMap } from '@/lib/types';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Asserts the request carries a valid ADMIN session.
 * @param req - Incoming Next.js request (unused directly; auth() reads cookies).
 * @returns The session if valid, or a NextResponse error to return immediately.
 */
async function requireAdmin(): Promise<
  | { ok: true; session: import('next-auth').Session }
  | { ok: false; response: NextResponse }
> {
  const session = await auth();

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthenticated' }, { status: 401 }),
    };
  }

  if (session.user?.role !== 'ADMIN') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { ok: true, session };
}

// ─────────────────────────────────────────────
// GET /api/site-config
// ─────────────────────────────────────────────

/**
 * Returns either the full SiteConfigMap or the active banner list.
 *
 * @param req - Incoming request. Reads ?section=banners query param.
 * @returns { data: SiteConfigMap } or { data: Banner[] } with HTTP 200.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.get('section') === 'banners') {
      const banners = await prisma.banner.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      });
      return NextResponse.json({ data: banners });
    }

    const config: SiteConfigMap = await getCachedSiteConfig();
    return NextResponse.json({ data: config });
  } catch (error) {
    console.error('[GET /api/site-config]', error);
    return NextResponse.json(
      { error: 'Failed to fetch site configuration', details: error },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────
// PATCH /api/site-config
// ─────────────────────────────────────────────

/**
 * Bulk-upserts SiteConfig key-value pairs. Requires ADMIN session.
 *
 * @param req - Body must be Record<string, string> of config keys to values.
 * @returns { data: 'ok' } with HTTP 200 on success.
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  try {
    const body: unknown = await req.json();

    if (
      typeof body !== 'object' ||
      body === null ||
      Array.isArray(body) ||
      Object.values(body as Record<string, unknown>).some((v) => typeof v !== 'string')
    ) {
      return NextResponse.json(
        { error: 'Request body must be a flat Record<string, string>' },
        { status: 400 },
      );
    }

    await setSiteConfigBatch(body as Record<string, string>);
    return NextResponse.json({ data: 'ok' });
  } catch (error) {
    console.error('[PATCH /api/site-config]', error);
    return NextResponse.json(
      { error: 'Failed to update site configuration', details: error },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────
// POST /api/site-config — Banner CRUD
// ─────────────────────────────────────────────

/**
 * Dispatches banner CRUD operations based on the `action` field in the request body.
 * Supported actions: create_banner, update_banner, delete_banner, toggle_banner.
 * Requires ADMIN session.
 *
 * @param req - Body must include `action: string` plus action-specific fields.
 * @returns { data: Banner | 'deleted' } with the appropriate HTTP status.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action } = body;

  if (typeof action !== 'string') {
    return NextResponse.json(
      { error: 'Missing or invalid `action` field in request body' },
      { status: 400 },
    );
  }

  try {
    switch (action) {
      // ── Create a new banner ────────────────────────────────────────────────
      case 'create_banner': {
        const {
          imageUrl,
          cloudinaryId,
          titleEn,
          titleBn,
          subtitleEn,
          subtitleBn,
          ctaTextEn,
          ctaTextBn,
          ctaLink,
          displayOrder,
          isActive,
        } = body;

        if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
          return NextResponse.json(
            { error: '`imageUrl` is required for create_banner' },
            { status: 400 },
          );
        }

        if (typeof cloudinaryId !== 'string' || !cloudinaryId.trim()) {
          return NextResponse.json(
            { error: '`cloudinaryId` is required for create_banner' },
            { status: 400 },
          );
        }

        const created = await prisma.banner.create({
          data: {
            imageUrl,
            cloudinaryId,
            titleEn:    typeof titleEn    === 'string' ? titleEn    : null,
            titleBn:    typeof titleBn    === 'string' ? titleBn    : null,
            subtitleEn: typeof subtitleEn === 'string' ? subtitleEn : null,
            subtitleBn: typeof subtitleBn === 'string' ? subtitleBn : null,
            ctaTextEn:  typeof ctaTextEn  === 'string' ? ctaTextEn  : null,
            ctaTextBn:  typeof ctaTextBn  === 'string' ? ctaTextBn  : null,
            ctaLink:    typeof ctaLink    === 'string' ? ctaLink    : null,
            displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
            isActive:     isActive      !== undefined ? Boolean(isActive)   : true,
          },
        });

        return NextResponse.json({ data: created }, { status: 201 });
      }

      // ── Update an existing banner ──────────────────────────────────────────
      case 'update_banner': {
        const { id, ...rest } = body;

        if (typeof id !== 'string' || !id.trim()) {
          return NextResponse.json(
            { error: '`id` is required for update_banner' },
            { status: 400 },
          );
        }

        // Build a safe partial update object — only include provided string fields
        const data: Record<string, unknown> = {};

        const stringFields = [
          'imageUrl', 'cloudinaryId',
          'titleEn', 'titleBn',
          'subtitleEn', 'subtitleBn',
          'ctaTextEn', 'ctaTextBn',
          'ctaLink',
        ] as const;

        for (const field of stringFields) {
          if (field in rest) {
            data[field] = typeof rest[field] === 'string' ? rest[field] : null;
          }
        }

        if ('displayOrder' in rest) {
          data.displayOrder = Number(rest.displayOrder);
        }
        if ('isActive' in rest) {
          data.isActive = Boolean(rest.isActive);
        }

        const updated = await prisma.banner.update({
          where: { id },
          data,
        });

        return NextResponse.json({ data: updated });
      }

      // ── Delete a banner ────────────────────────────────────────────────────
      case 'delete_banner': {
        const { id } = body;

        if (typeof id !== 'string' || !id.trim()) {
          return NextResponse.json(
            { error: '`id` is required for delete_banner' },
            { status: 400 },
          );
        }

        await prisma.banner.delete({ where: { id } });
        return NextResponse.json({ data: 'deleted' });
      }

      // ── Toggle banner active state ─────────────────────────────────────────
      case 'toggle_banner': {
        const { id, isActive } = body;

        if (typeof id !== 'string' || !id.trim()) {
          return NextResponse.json(
            { error: '`id` is required for toggle_banner' },
            { status: 400 },
          );
        }

        if (isActive === undefined) {
          return NextResponse.json(
            { error: '`isActive` is required for toggle_banner' },
            { status: 400 },
          );
        }

        const toggled = await prisma.banner.update({
          where: { id },
          data: { isActive: Boolean(isActive) },
        });

        return NextResponse.json({ data: toggled });
      }

      // ── Unknown action ─────────────────────────────────────────────────────
      default:
        return NextResponse.json(
          {
            error: `Unknown action: "${action}". Valid actions: create_banner, update_banner, delete_banner, toggle_banner`,
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error(`[POST /api/site-config action=${action}]`, error);
    return NextResponse.json(
      { error: `Failed to execute action "${action}"`, details: error },
      { status: 500 },
    );
  }
}