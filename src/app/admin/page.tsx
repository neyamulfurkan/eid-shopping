// FILE 097: src/app/admin/page.tsx

import dynamic from 'next/dynamic';
import { TrendingUp, ShoppingBag, Clock, AlertTriangle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import type { AnalyticsData, DailyRevenuePoint, TopProductEntry } from '@/lib/types';

// ─────────────────────────────────────────────
// Dynamic Import
// ─────────────────────────────────────────────

/**
 * Recharts-based analytics chart loaded client-side only to avoid SSR issues
 * with the Recharts library and to keep the admin dashboard server render fast.
 */
const AnalyticsChart = dynamic(
  () => import('@/components/admin/AnalyticsChart').then((m) => m.AnalyticsChart),
  { ssr: false },
);

// ─────────────────────────────────────────────
// Raw Query Result Types
// ─────────────────────────────────────────────

interface DailyRevenueRaw {
  date: string;
  revenue: bigint | number;
}

interface TopProductRaw {
  name: string;
  sales: bigint | number;
  revenue: bigint | number | string;
}

// ─────────────────────────────────────────────
// Analytics Data Fetcher
// ─────────────────────────────────────────────

/**
 * Fetches all analytics data directly from Prisma for the admin dashboard.
 * Mirrors the logic in FILE 083 (GET /api/analytics) but avoids the internal
 * HTTP round-trip by querying the database in the server component body.
 * @returns A fully populated AnalyticsData object ready for the chart component.
 */
async function fetchAnalyticsData(): Promise<AnalyticsData> {
  const now = new Date();

  // Start of today in UTC
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  // Date 30 days ago at UTC midnight
  const thirtyDaysAgo = new Date(todayStart);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

  const [
    todayRevenueResult,
    totalOrdersResult,
    pendingOrdersResult,
    lowStockResult,
    dailyRevenueRaw,
    topProductsRaw,
  ] = await Promise.all([
    // Today's revenue — sum of non-cancelled orders created today
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        createdAt: { gte: todayStart },
        orderStatus: { not: 'CANCELLED' },
      },
    }),

    // Total orders count (all time, all statuses)
    prisma.order.count(),

    // Pending orders count
    prisma.order.count({
      where: { orderStatus: 'PENDING' },
    }),

    // Low-stock products: stockQty at or below the configured threshold
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count
      FROM products
      WHERE "stockQty" <= "lowStockThreshold"
        AND "isActive" = true
    `,

    // Daily revenue for the last 30 days, grouped by UTC date
    prisma.$queryRaw<DailyRevenueRaw[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
        COALESCE(SUM(total), 0)::float8 AS revenue
      FROM orders
      WHERE "createdAt" >= ${thirtyDaysAgo}
        AND "orderStatus" != 'CANCELLED'
      GROUP BY DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC')
      ORDER BY DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC') ASC
    `,

    // Top 5 products by total revenue from order items
    prisma.$queryRaw<TopProductRaw[]>`
      SELECT
        oi."productNameEn" AS name,
        SUM(oi.quantity)::bigint AS sales,
        SUM(oi.total)::float8 AS revenue
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi."orderId"
      WHERE o."orderStatus" != 'CANCELLED'
      GROUP BY oi."productNameEn"
      ORDER BY SUM(oi.total) DESC
      LIMIT 5
    `,
  ]);

  // ── Serialise today's revenue ──
  const todayRevenue = Number(todayRevenueResult._sum.total ?? 0);

  // ── Serialise low-stock count (BigInt → number) ──
  const lowStockCount = Number(lowStockResult[0]?.count ?? 0);

  // ── Build the 30-day date range and fill missing dates with zero ──
  const revenueByDate = new Map<string, number>();
  for (const row of dailyRevenueRaw) {
    revenueByDate.set(row.date, Number(row.revenue));
  }

  const dailyRevenue: DailyRevenuePoint[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    dailyRevenue.push({
      date: dateStr,
      revenue: revenueByDate.get(dateStr) ?? 0,
    });
  }

  // ── Serialise top products (BigInt / Decimal → number) ──
  const topProducts: TopProductEntry[] = topProductsRaw.map((row) => ({
    name: row.name,
    sales: Number(row.sales),
    revenue: Number(row.revenue),
  }));

  return {
    todayRevenue,
    totalOrders: totalOrdersResult,
    pendingOrders: pendingOrdersResult,
    lowStockCount,
    dailyRevenue,
    topProducts,
  };
}

// ─────────────────────────────────────────────
// Stats Card Sub-Component
// ─────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  /** When true, renders value and icon in an alert colour (orange or red). */
  alert?: 'orange' | 'red' | false;
}

/**
 * Individual stat card displayed in the 4-column grid at the top of the dashboard.
 * @param label - Human-readable metric name.
 * @param value - Formatted metric value string.
 * @param icon - Lucide icon element.
 * @param alert - Optional alert colour applied when the metric warrants attention.
 * @returns A styled stat card div.
 */
const StatCard: React.FC<StatCardProps> = ({ label, value, icon, alert }) => {
  const valueColour =
    alert === 'red'
      ? 'text-red-600'
      : alert === 'orange'
        ? 'text-orange-500'
        : 'text-gray-900';

  const iconBg =
    alert === 'red'
      ? 'bg-red-50 text-red-500'
      : alert === 'orange'
        ? 'bg-orange-50 text-orange-500'
        : 'bg-brand-primary/10 text-brand-primary';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
          {label}
        </p>
        <p className={`text-xl font-bold mt-0.5 truncate ${valueColour}`}>
          {value}
        </p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────

/**
 * Admin dashboard server component.
 * Fetches real-time analytics data directly via Prisma and renders stats cards,
 * a dynamically loaded revenue chart, and a top-products table.
 * @returns The complete admin dashboard page.
 */
export default async function AdminDashboard(): Promise<React.ReactElement> {
  // Double-check auth (middleware is the primary guard; this is the fallback)
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/signin');
  }

  const analyticsData = await fetchAnalyticsData();
  const { todayRevenue, totalOrders, pendingOrders, lowStockCount, topProducts } =
    analyticsData;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">

      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back. Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Revenue"
          value={formatPrice(todayRevenue)}
          icon={<TrendingUp className="w-5 h-5" />}
        />

        <StatCard
          label="Total Orders"
          value={totalOrders.toLocaleString('en-BD')}
          icon={<ShoppingBag className="w-5 h-5" />}
        />

        <StatCard
          label="Pending Orders"
          value={pendingOrders.toLocaleString('en-BD')}
          icon={<Clock className="w-5 h-5" />}
          alert={pendingOrders > 0 ? 'orange' : false}
        />

        <StatCard
          label="Low Stock Products"
          value={lowStockCount.toLocaleString('en-BD')}
          icon={<AlertTriangle className="w-5 h-5" />}
          alert={lowStockCount > 0 ? 'red' : false}
        />
      </div>

      {/* ── Analytics Chart (client-side, Recharts) ── */}
      <AnalyticsChart data={analyticsData} />

      {/* ── Top Products Table ── */}
      {topProducts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Top Products — All Time
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 w-8">
                    Rank
                  </th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">
                    Product
                  </th>
                  <th className="text-right py-2 px-4 font-medium text-gray-500">
                    Units Sold
                  </th>
                  <th className="text-right py-2 pl-4 font-medium text-gray-500">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr
                    key={`${product.name}-${index}`}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <span
                        className="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: '#1B5E20' }}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-800 font-medium">
                      {product.name}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {product.sales.toLocaleString('en-BD')}
                    </td>
                    <td className="py-3 pl-4 text-right font-semibold text-gray-800">
                      {formatPrice(product.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}