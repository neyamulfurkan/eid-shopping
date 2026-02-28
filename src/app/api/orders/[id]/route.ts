// src/app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { sendSms } from '@/lib/sms';
import { OrderStatus, PaymentStatus } from '@prisma/client';

/**
 * Asserts the requester has an active ADMIN session.
 * @returns The session if valid, otherwise a 401/403 NextResponse.
 */
async function requireAdmin(): Promise<
  | { session: { user: { role: string } }; error: null }
  | { session: null; error: NextResponse }
> {
  const session = await auth();

  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Unauthenticated' }, { status: 401 }),
    };
  }

  if (session.user?.role !== 'ADMIN') {
    return {
      session: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { session, error: null };
}

/**
 * GET /api/orders/[id]
 * Admin only. Returns a single order with all its items.
 *
 * @param _req  - Incoming request (unused).
 * @param params - Route params containing the order `id`.
 * @returns { data: order } or 401/403/404/500.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ data: order });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[GET /api/orders/[id]]', message);
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}

/**
 * PATCH /api/orders/[id]
 * Admin only. Updates order status, payment status, and/or notes.
 * Fires non-blocking SMS notifications when orderStatus transitions to
 * CONFIRMED or SHIPPED.
 *
 * @param req    - Request body: { orderStatus?, paymentStatus?, notes? }.
 * @param params - Route params containing the order `id`.
 * @returns { data: updatedOrder } or 400/401/403/404/500.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: {
    orderStatus?: string;
    paymentStatus?: string;
    notes?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { orderStatus, paymentStatus, notes } = body;

  // Validate orderStatus if provided
  if (orderStatus !== undefined) {
    const validStatuses = Object.values(OrderStatus) as string[];
    if (!validStatuses.includes(orderStatus)) {
      return NextResponse.json(
        {
          error: 'Invalid orderStatus',
          details: `Must be one of: ${validStatuses.join(', ')}`,
        },
        { status: 400 },
      );
    }
  }

  // Validate paymentStatus if provided
  if (paymentStatus !== undefined) {
    const validPaymentStatuses = Object.values(PaymentStatus) as string[];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return NextResponse.json(
        {
          error: 'Invalid paymentStatus',
          details: `Must be one of: ${validPaymentStatuses.join(', ')}`,
        },
        { status: 400 },
      );
    }
  }

  try {
    // Fetch the current order to capture the previous status for SMS triggering
    const currentOrder = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        orderStatus: true,
        customerPhone: true,
        orderNumber: true,
      },
    });

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Build the update payload with only provided fields
    const updateData: {
      orderStatus?: OrderStatus;
      paymentStatus?: PaymentStatus;
      notes?: string;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (orderStatus !== undefined) {
      updateData.orderStatus = orderStatus as OrderStatus;
    }
    if (paymentStatus !== undefined) {
      updateData.paymentStatus = paymentStatus as PaymentStatus;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
      include: { items: true },
    });

    // Fire-and-forget SMS notifications on status transitions
    const previousStatus = currentOrder.orderStatus;
    const newStatus = orderStatus as OrderStatus | undefined;

    if (newStatus && newStatus !== previousStatus) {
      if (newStatus === OrderStatus.CONFIRMED) {
        // Non-blocking — intentionally not awaited
        void sendSms(
          currentOrder.customerPhone,
          `আপনার অর্ডার ${currentOrder.orderNumber} কনফার্ম হয়েছে।`,
        );
      } else if (newStatus === OrderStatus.SHIPPED) {
        // Non-blocking — intentionally not awaited
        void sendSms(
          currentOrder.customerPhone,
          `আপনার অর্ডার ${currentOrder.orderNumber} শিপ করা হয়েছে।`,
        );
      }
    }

    return NextResponse.json({ data: updatedOrder });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[PATCH /api/orders/[id]]', message);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 },
    );
  }
}