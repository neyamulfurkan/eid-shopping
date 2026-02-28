// src/app/api/promo-codes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { PromoType } from '@/lib/types';

/** Standard success response shape. */
function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

/** Standard error response shape. */
function err(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Checks for a valid ADMIN session.
 * @returns The session if authenticated as ADMIN, null otherwise.
 */
async function getAdminSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') return null;
  return session;
}

// ─────────────────────────────────────────────
// GET /api/promo-codes
// Admin only — returns all promo codes ordered by creation date desc.
// ─────────────────────────────────────────────

/**
 * Retrieves all promo codes for the admin dashboard.
 * @returns { data: PromoCode[] } ordered by createdAt descending.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await getAdminSession();
    if (!session) return err('Unauthorized', 401);

    const codes = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return ok(codes);
  } catch (error) {
    console.error('[GET /api/promo-codes]', error);
    return err('Internal server error', 500);
  }
}

// ─────────────────────────────────────────────
// POST /api/promo-codes
// Dual-mode: public validation OR admin creation.
// ─────────────────────────────────────────────

/**
 * Dual-mode POST handler.
 * - No/non-admin session → public promo code validation.
 *   Body: { code: string, subtotal: number }
 *   Returns: { data: { valid: boolean, type?, value?, discountAmount?, reason? } }
 * - ADMIN session → create a new promo code.
 *   Body: { code, type, value, minOrderAmount?, maxUses?, expiresAt?, isActive? }
 *   Returns: { data: PromoCode } with status 201.
 * @param request - Incoming NextRequest.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const isAdmin = session?.user?.role === 'ADMIN';

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return err('Invalid JSON body', 400);
    }

    // ── Public validation mode ──────────────────────────────────────────────
    // Use body shape to determine mode: public validation sends { code, subtotal },
    // admin creation sends { code, type, value }. This prevents logged-in admins
    // from accidentally hitting the creation branch when testing checkout.
    const isPublicValidation = !('type' in body);

    if (!isAdmin || isPublicValidation) {
      const { code, subtotal } = body as { code?: unknown; subtotal?: unknown };

      if (typeof code !== 'string' || !code.trim()) {
        return err('Promo code is required', 400);
      }
      if (subtotal === undefined || subtotal === null || isNaN(Number(subtotal))) {
        return err('Valid subtotal is required', 400);
      }

      const subtotalNum = Number(subtotal);
      const upperCode = code.trim().toUpperCase();

      const promo = await prisma.promoCode.findUnique({
        where: { code: upperCode },
      });

      if (!promo) {
        return ok({ valid: false, reason: 'Invalid promo code' });
      }
      if (!promo.isActive) {
        return ok({ valid: false, reason: 'This promo code is no longer active' });
      }

      if (promo.expiresAt && promo.expiresAt < new Date()) {
        return ok({ valid: false, reason: 'Promo code expired' });
      }

      if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
        return ok({ valid: false, reason: 'Promo code usage limit reached' });
      }

      if (subtotalNum < Number(promo.minOrderAmount)) {
        const minFormatted = `৳${Number(promo.minOrderAmount).toLocaleString('bn-BD')}`;
        return ok({
          valid: false,
          reason: `Minimum order amount not met: ${minFormatted}`,
        });
      }

      let discountAmount: number;
      if (promo.type === PromoType.PERCENTAGE) {
        discountAmount = (subtotalNum * Number(promo.value)) / 100;
      } else {
        discountAmount = Math.min(Number(promo.value), subtotalNum);
      }

      return ok({
        valid: true,
        type: promo.type,
        value: Number(promo.value),
        discountAmount,
      });
    }

    // ── Admin creation mode ─────────────────────────────────────────────────
    const {
      code,
      type,
      value,
      minOrderAmount,
      maxUses,
      expiresAt,
      isActive,
    } = body as {
      code?: unknown;
      type?: unknown;
      value?: unknown;
      minOrderAmount?: unknown;
      maxUses?: unknown;
      expiresAt?: unknown;
      isActive?: unknown;
    };

    if (typeof code !== 'string' || !code.trim()) {
      return err('Promo code is required', 400);
    }
    if (type !== PromoType.PERCENTAGE && type !== PromoType.FIXED) {
      return err("type must be 'PERCENTAGE' or 'FIXED'", 400);
    }
    if (value === undefined || value === null || isNaN(Number(value)) || Number(value) <= 0) {
      return err('value must be a positive number', 400);
    }

    const upperCode = (code as string).trim().toUpperCase();

    // Check for duplicate code
    const existing = await prisma.promoCode.findUnique({
      where: { code: upperCode },
    });
    if (existing) {
      return err('A promo code with this code already exists', 409);
    }

    const newCode = await prisma.promoCode.create({
      data: {
        code: upperCode,
        type: type as PromoType,
        value: Number(value),
        minOrderAmount: minOrderAmount !== undefined && minOrderAmount !== null
          ? Number(minOrderAmount)
          : 0,
        maxUses: maxUses !== undefined && maxUses !== null
          ? Number(maxUses)
          : null,
        expiresAt: expiresAt ? new Date(expiresAt as string) : null,
        isActive: typeof isActive === 'boolean' ? isActive : true,
      },
    });

    return ok(newCode, 201);
  } catch (error) {
    console.error('[POST /api/promo-codes]', error);
    return err('Internal server error', 500);
  }
}

// ─────────────────────────────────────────────
// PATCH /api/promo-codes
// Admin only — update a promo code by id.
// ─────────────────────────────────────────────

/**
 * Updates an existing promo code.
 * Body: { id: string, ...fields to update }
 * @param request - Incoming NextRequest.
 * @returns { data: PromoCode } updated record.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getAdminSession();
    if (!session) return err('Unauthorized', 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return err('Invalid JSON body', 400);
    }

    const { id, code, type, value, minOrderAmount, maxUses, expiresAt, isActive } =
      body as {
        id?: unknown;
        code?: unknown;
        type?: unknown;
        value?: unknown;
        minOrderAmount?: unknown;
        maxUses?: unknown;
        expiresAt?: unknown;
        isActive?: unknown;
      };

    if (typeof id !== 'string' || !id.trim()) {
      return err('id is required', 400);
    }

    const existing = await prisma.promoCode.findUnique({ where: { id } });
    if (!existing) return err('Promo code not found', 404);

    // Validate type if provided
    if (
      type !== undefined &&
      type !== PromoType.PERCENTAGE &&
      type !== PromoType.FIXED
    ) {
      return err("type must be 'PERCENTAGE' or 'FIXED'", 400);
    }

    // Validate value if provided
    if (value !== undefined && (isNaN(Number(value)) || Number(value) <= 0)) {
      return err('value must be a positive number', 400);
    }

    const updated = await prisma.promoCode.update({
      where: { id },
      data: {
        ...(code !== undefined && { code: (code as string).trim().toUpperCase() }),
        ...(type !== undefined && { type: type as PromoType }),
        ...(value !== undefined && { value: Number(value) }),
        ...(minOrderAmount !== undefined && { minOrderAmount: Number(minOrderAmount) }),
        ...(maxUses !== undefined && {
          maxUses: maxUses === null ? null : Number(maxUses),
        }),
        ...(expiresAt !== undefined && {
          expiresAt: expiresAt === null ? null : new Date(expiresAt as string),
        }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    return ok(updated);
  } catch (error) {
    console.error('[PATCH /api/promo-codes]', error);
    return err('Internal server error', 500);
  }
}

// ─────────────────────────────────────────────
// DELETE /api/promo-codes
// Admin only — delete a promo code by id.
// ─────────────────────────────────────────────

/**
 * Deletes a promo code by id.
 * Body: { id: string }
 * @param request - Incoming NextRequest.
 * @returns { data: 'deleted' } on success.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getAdminSession();
    if (!session) return err('Unauthorized', 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return err('Invalid JSON body', 400);
    }

    const { id } = body as { id?: unknown };

    if (typeof id !== 'string' || !id.trim()) {
      return err('id is required', 400);
    }

    const existing = await prisma.promoCode.findUnique({ where: { id } });
    if (!existing) return err('Promo code not found', 404);

    await prisma.promoCode.delete({ where: { id } });

    return ok('deleted');
  } catch (error) {
    console.error('[DELETE /api/promo-codes]', error);
    return err('Internal server error', 500);
  }
}