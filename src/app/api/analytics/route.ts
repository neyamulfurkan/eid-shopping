// src/app/api/analytics/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { AnalyticsData, DailyRevenuePoint, TopProductEntry } from '@/lib/types';

/**
 * Fills in missing dates in the daily revenue array with zero-revenue entries.
 * Ensures the returned array always contains exactly 30 consecutive days.
 * @param rows - Raw query results with date strings and revenue values.
 * @returns A complete 30-day array ordered ASC with gaps filled with 0.
 */
function fillDailyRevenue(
  rows: { date: string; revenue: number | string }[],
): DailyRevenuePoint[] {
  const revenueMap = new Map<string, number>();
  for (const row of rows) {
    revenueMap.set(row.date, Number(row.revenue));
  }

  const result: DailyRevenuePoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    result.push({ date: dateStr, revenue: revenueMap.get(dateStr) ?? 0 });
  }

  return result;
}

/**
 * GET /api/analytics
 * Returns aggregated analytics data for the admin dashboard.
 * Requires ADMIN session.
 * @returns AnalyticsData including today's revenue, order counts, low-stock count,
 *          30-day daily revenue series, and top 5 products by revenue.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Date boundaries for "today" in UTC
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);

    const [
      todayRevenueAgg,
      totalOrders,
      pendingOrders,
      lowStockResult,
      dailyRevenueRows,
      topProductRows,
    ] = await Promise.all([
      // 1. Today's revenue (non-cancelled orders)
      prisma.order.aggregate({
        _sum: { total: true },
        where: {
          createdAt: { gte: startOfToday, lt: startOfTomorrow },
          orderStatus: { not: 'CANCELLED' },
        },
      }),

      // 2. Total orders (all time)
      prisma.order.count(),

      // 3. Pending orders
      prisma.order.count({ where: { orderStatus: 'PENDING' } }),

      // 4. Low-stock active products (field comparison via $queryRaw)
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) AS count
        FROM products
        WHERE "stockQty" <= "lowStockThreshold"
          AND "isActive" = true
      `,

      // 5. 30-day daily revenue grouped by UTC date
      prisma.$queryRaw<{ date: string; revenue: number }[]>`
        SELECT
          TO_CHAR(DATE("createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
          COALESCE(SUM(total), 0) AS revenue
        FROM orders
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
          AND "orderStatus" != 'CANCELLED'
        GROUP BY DATE("createdAt" AT TIME ZONE 'UTC')
        ORDER BY date ASC
      `,

      // 6. Top 5 products by revenue
      prisma.$queryRaw<{ name: string; sales: bigint; revenue: number }[]>`
        SELECT
          p."nameEn"       AS name,
          SUM(oi.quantity) AS sales,
          SUM(oi.total)    AS revenue
        FROM order_items oi
        JOIN products p ON oi."productId" = p.id
        GROUP BY p.id, p."nameEn"
        ORDER BY revenue DESC
        LIMIT 5
      `,
    ]);

    // Serialise BigInt and Decimal values to plain numbers before JSON response
    const todayRevenue = Number(todayRevenueAgg._sum.total ?? 0);
    const lowStockCount = Number(lowStockResult[0]?.count ?? 0);

    const dailyRevenue: DailyRevenuePoint[] = fillDailyRevenue(dailyRevenueRows);

    const topProducts: TopProductEntry[] = topProductRows.map((row) => ({
      name: row.name,
      sales: Number(row.sales),
      revenue: Number(row.revenue),
    }));

    const data: AnalyticsData = {
      todayRevenue,
      totalOrders,
      pendingOrders,
      lowStockCount,
      dailyRevenue,
      topProducts,
    };

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/analytics]', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : undefined },
      { status: 500 },
    );
  }
}