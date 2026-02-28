// src/app/api/orders/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { generateOrderNumber, applyPromoDiscount } from '@/lib/utils';
import { sendSms } from '@/lib/sms';
import { PaymentMethod, OrderStatus, PromoType } from '@/lib/types';
import type { Prisma } from '@prisma/client';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface OrderItemInput {
  productId: string;
  quantity: number;
  /** Serialised variant selection, e.g. '{"size":"M","color":"Red"}' or a plain string. */
  selectedVariants?: Record<string, string>;
}

interface OrderCreateBody {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: string;
  transactionId?: string;
  promoCode?: string;
  items: OrderItemInput[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Validates that a string is a valid Bangladeshi mobile number (01XXXXXXXXX). */
function isValidBangladeshiPhone(phone: string): boolean {
  return /^01[3-9]\d{8}$/.test(phone);
}

/** Validates that a string is a member of the PaymentMethod enum. */
function isValidPaymentMethod(value: string): value is PaymentMethod {
  return Object.values(PaymentMethod).includes(value as PaymentMethod);
}

/** Serialises a variant map into a human-readable string for order snapshots. */
function serialiseVariantInfo(variants?: Record<string, string>): string | null {
  if (!variants || Object.keys(variants).length === 0) return null;
  return Object.entries(variants)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

/** Safely coerces a Prisma Decimal or number to a JS number. */
function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : parseFloat(value.toString());
}

// ─────────────────────────────────────────────
// GET /api/orders — Admin paginated order list
// ─────────────────────────────────────────────

/**
 * Returns a paginated list of orders with their items.
 * Requires ADMIN session.
 *
 * @query page   - Page number (default 1).
 * @query limit  - Items per page (default 20).
 * @query status - Filter by OrderStatus enum value.
 * @query search - Partial match on customerName or customerPhone.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10));
    const statusParam = searchParams.get('status');
    const search      = searchParams.get('search')?.trim() ?? '';

    // Build where clause
    const where: Prisma.OrderWhereInput = {};

    if (statusParam && Object.values(OrderStatus).includes(statusParam as OrderStatus)) {
      where.orderStatus = statusParam as OrderStatus;
    }

    if (search) {
      where.OR = [
        { customerName:  { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:  (page - 1) * limit,
        take:  limit,
        select: {
          id:            true,
          orderNumber:   true,
          customerName:  true,
          customerPhone: true,
          customerAddress: true,
          subtotal:      true,
          discount:      true,
          total:         true,
          promoCode:     true,
          paymentMethod: true,
          paymentStatus: true,
          transactionId: true,
          orderStatus:   true,
          notes:         true,
          createdAt:     true,
          updatedAt:     true,
          items: {
            select: {
              id:             true,
              productNameEn:  true,
              productNameBn:  true,
              variantInfo:    true,
              unitPrice:      true,
              quantity:       true,
              total:          true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    // Coerce Decimal fields to numbers for JSON serialisation
    const serialised = orders.map((o) => ({
      ...o,
      subtotal: toNumber(o.subtotal),
      discount: toNumber(o.discount),
      total:    toNumber(o.total),
      items: o.items.map((i) => ({
        ...i,
        unitPrice: toNumber(i.unitPrice),
        total:     toNumber(i.total),
      })),
    }));

    return NextResponse.json({ data: { orders: serialised, total, page, limit } });
  } catch (err) {
    console.error('[GET /api/orders]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/orders — Guest order creation
// ─────────────────────────────────────────────

/**
 * Creates a new order from the guest checkout form.
 * Public endpoint — no authentication required.
 *
 * Validates all inputs, re-fetches product prices from the DB (ignoring
 * client-submitted prices), applies a promo code if provided, decrements
 * stock, and fires a non-blocking SMS confirmation.
 *
 * @returns { data: { orderNumber: string; total: number } } with status 201.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── 1. Parse body ──────────────────────────────────────────────────────────
  let body: OrderCreateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    customerName,
    customerPhone,
    customerAddress,
    paymentMethod,
    transactionId,
    promoCode,
    items,
  } = body;

  // ── 2. Validate inputs ─────────────────────────────────────────────────────
  const validationErrors: string[] = [];

  if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
    validationErrors.push('customerName must be at least 2 characters.');
  }

  if (!customerPhone || typeof customerPhone !== 'string' || !isValidBangladeshiPhone(customerPhone.trim())) {
    validationErrors.push('customerPhone must be a valid Bangladeshi mobile number (01XXXXXXXXX).');
  }

  if (!customerAddress || typeof customerAddress !== 'string' || customerAddress.trim().length < 10) {
    validationErrors.push('customerAddress must be at least 10 characters.');
  }

  if (!paymentMethod || !isValidPaymentMethod(paymentMethod)) {
    validationErrors.push(`paymentMethod must be one of: ${Object.values(PaymentMethod).join(', ')}.`);
  }

  if (
    isValidPaymentMethod(paymentMethod) &&
    paymentMethod !== PaymentMethod.COD &&
    (!transactionId || typeof transactionId !== 'string' || transactionId.trim().length === 0)
  ) {
    validationErrors.push('transactionId is required for mobile banking payments.');
  }

  if (!Array.isArray(items) || items.length === 0) {
    validationErrors.push('items must be a non-empty array.');
  } else {
    items.forEach((item, idx) => {
      if (!item.productId || typeof item.productId !== 'string') {
        validationErrors.push(`items[${idx}].productId is required.`);
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        validationErrors.push(`items[${idx}].quantity must be a positive integer.`);
      }
    });
  }

  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: 'Validation failed', details: validationErrors },
      { status: 400 },
    );
  }

  // ── 3. Transaction: stock check, price computation, order creation ─────────
  let createdOrderNumber: string;
  let createdTotal: number;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 3a. Fetch all products from DB — never trust client-submitted prices
      const productIds = items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id:        true,
          nameEn:    true,
          nameBn:    true,
          basePrice: true,
          salePrice: true,
          stockQty:  true,
          isActive:  true,
        },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      // 3b. Validate each item: product must exist, be active, have sufficient stock
      let subtotal = 0;

      for (const item of items) {
        const product = productMap.get(item.productId);

        if (!product) {
          throw Object.assign(
            new Error(`Product not found: ${item.productId}`),
            { status: 404 },
          );
        }

        if (!product.isActive) {
          throw Object.assign(
            new Error(`Product is no longer available: ${product.nameEn}`),
            { status: 409 },
          );
        }

        if (product.stockQty < item.quantity) {
          throw Object.assign(
            new Error(
              `Insufficient stock for "${product.nameEn}". ` +
              `Requested: ${item.quantity}, available: ${product.stockQty}.`,
            ),
            { status: 409 },
          );
        }

        // Use salePrice when set, otherwise basePrice — from DB only
        const unitPrice = product.salePrice
          ? toNumber(product.salePrice)
          : toNumber(product.basePrice);

        subtotal += unitPrice * item.quantity;
      }

      // 3c. Validate and apply promo code if provided
      let discount = 0;
      let promoCodeValue: string | null = null;

      if (promoCode && typeof promoCode === 'string' && promoCode.trim().length > 0) {
        const code = await tx.promoCode.findUnique({
          where: { code: promoCode.toUpperCase().trim() },
        });

        if (!code) {
          throw Object.assign(
            new Error('Promo code not found.'),
            { status: 400 },
          );
        }

        if (!code.isActive) {
          throw Object.assign(
            new Error('Promo code is no longer active.'),
            { status: 400 },
          );
        }

        if (code.expiresAt && code.expiresAt < new Date()) {
          throw Object.assign(
            new Error('Promo code has expired.'),
            { status: 400 },
          );
        }

        if (code.maxUses !== null && code.usedCount >= code.maxUses) {
          throw Object.assign(
            new Error('Promo code has reached its usage limit.'),
            { status: 400 },
          );
        }

        if (subtotal < toNumber(code.minOrderAmount)) {
          throw Object.assign(
            new Error(
              `Minimum order amount for this promo code is ৳${toNumber(code.minOrderAmount)}.`,
            ),
            { status: 400 },
          );
        }

        discount = applyPromoDiscount(
          subtotal,
          code.type as PromoType,
          toNumber(code.value),
        );
        promoCodeValue = code.code;
      }

      const total = subtotal - discount;
      const orderNumber = generateOrderNumber();

      // 3d. Build order items with DB-sourced price and name snapshots
      const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = items.map((item) => {
        const product = productMap.get(item.productId)!;
        const unitPrice = product.salePrice
          ? toNumber(product.salePrice)
          : toNumber(product.basePrice);

        return {
          productId:      item.productId,
          productNameEn:  product.nameEn,
          productNameBn:  product.nameBn,
          variantInfo:    serialiseVariantInfo(item.selectedVariants),
          unitPrice:      unitPrice,
          quantity:       item.quantity,
          total:          unitPrice * item.quantity,
        };
      });

      // 3e. Create the order with nested order items
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerName:    customerName.trim(),
          customerPhone:   customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          paymentMethod:   paymentMethod as PaymentMethod,
          paymentStatus:   'PENDING',
          transactionId:   transactionId?.trim() ?? null,
          orderStatus:     'PENDING',
          subtotal,
          discount,
          total,
          promoCode:       promoCodeValue,
          items: {
            createMany: { data: orderItemsData },
          },
        },
        select: {
          orderNumber: true,
          total:       true,
        },
      });

      // 3f. Decrement stock for each product
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data:  { stockQty: { decrement: item.quantity } },
        });
      }

      // 3g. Increment promo code usage count
      if (promoCodeValue) {
        await tx.promoCode.update({
          where: { code: promoCodeValue },
          data:  { usedCount: { increment: 1 } },
        });
      }

      return {
        orderNumber: order.orderNumber,
        total:       toNumber(order.total),
      };
    });

    createdOrderNumber = result.orderNumber;
    createdTotal = result.total;
  } catch (err: unknown) {
    // Re-raise errors with explicit status codes set during validation
    if (err instanceof Error && 'status' in err) {
      const status = (err as Error & { status: number }).status;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error('[POST /api/orders]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // ── 4. Fire-and-forget SMS confirmation ────────────────────────────────────
  // Deliberately not awaited — SMS failure must never block the order response.
  sendSms(
    customerPhone.trim(),
    `আপনার অর্ডার ${createdOrderNumber} সফলভাবে প্লেস হয়েছে। ধন্যবাদ!`,
  ).catch((err) => {
    console.error('[POST /api/orders] SMS fire-and-forget failed:', err);
  });

  // ── 5. Return success response ─────────────────────────────────────────────
  return NextResponse.json(
    { data: { orderNumber: createdOrderNumber, total: createdTotal } },
    { status: 201 },
  );
}