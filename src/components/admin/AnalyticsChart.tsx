// src/components/admin/AnalyticsChart.tsx
'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipProps,
} from 'recharts';
import { formatPrice } from '@/lib/utils';
import type { AnalyticsData, DailyRevenuePoint, TopProductEntry } from '@/lib/types';

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface AnalyticsChartProps {
  data: AnalyticsData;
}

// ─────────────────────────────────────────────
// Custom Tooltip
// ─────────────────────────────────────────────

interface CustomTooltipProps extends TooltipProps<number, string> {}

/**
 * Custom Recharts tooltip that formats the revenue value as BDT currency.
 * @param active - Whether the tooltip is currently visible.
 * @param payload - The data payload from Recharts.
 * @param label - The XAxis label for the hovered point.
 * @returns A styled tooltip card or null when not active.
 */
const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  const value = payload[0]?.value;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="font-semibold text-gray-900">
        {value !== undefined ? formatPrice(value) : '—'}
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────
// X-Axis Tick Formatter
// ─────────────────────────────────────────────

/**
 * Abbreviates an ISO date string (YYYY-MM-DD) to the last 5 characters (MM-DD)
 * for compact display on the XAxis of the revenue chart.
 * @param dateStr - ISO date string from the DailyRevenuePoint.
 * @returns The abbreviated date label, e.g. '02-27'.
 */
function formatXAxisDate(dateStr: string): string {
  if (!dateStr || dateStr.length < 5) return dateStr;
  return dateStr.slice(-5); // 'MM-DD'
}

// ─────────────────────────────────────────────
// Y-Axis Tick Formatter
// ─────────────────────────────────────────────

/**
 * Formats a raw revenue number for the YAxis tick labels.
 * Abbreviates large values (e.g. 10000 → ৳10K) to keep the axis readable.
 * @param value - The raw revenue number from Recharts.
 * @returns A compact BDT-prefixed string.
 */
function formatYAxisTick(value: number): string {
  if (value >= 100_000) return `৳${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `৳${(value / 1_000).toFixed(0)}K`;
  return `৳${value}`;
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

/**
 * Recharts-based analytics dashboard component.
 * Renders a 30-day revenue line chart and a top-5 products table.
 * Loaded with next/dynamic ssr:false from the admin dashboard page.
 * @param data - The AnalyticsData object containing dailyRevenue and topProducts arrays.
 * @returns The analytics chart and products table UI.
 */
export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ data }) => {
  const { dailyRevenue, topProducts } = data;

  return (
    <div className="space-y-8">
      {/* ── Revenue Line Chart ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Revenue — Last 30 Days
        </h3>

        {dailyRevenue.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
            No revenue data available yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={dailyRevenue}
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />

              <XAxis
                dataKey="date"
                tickFormatter={formatXAxisDate}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
                interval="preserveStartEnd"
              />

              <YAxis
                tickFormatter={formatYAxisTick}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
                width={60}
              />

              <Tooltip content={<CustomTooltip />} />

              {/*
               * Chart line color is hardcoded as '#1B5E20' (Green-Gold Eid Classic primary).
               * CSS custom properties (var(--color-primary)) cannot be used in Recharts
               * stroke props because Recharts resolves them at render time outside the DOM.
               */}
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#1B5E20"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#1B5E20', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Top Products Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Top 5 Products by Revenue
        </h3>

        {topProducts.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No sales data available yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 w-1/2">
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
                {topProducts.map((product: TopProductEntry, index: number) => (
                  <tr
                    key={`${product.name}-${index}`}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 pr-4 text-gray-800 font-medium truncate max-w-[200px]">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: '#1B5E20' }}
                        >
                          {index + 1}
                        </span>
                        {product.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {product.sales.toLocaleString('bn-BD')}
                    </td>
                    <td className="py-3 pl-4 text-right font-semibold text-gray-800">
                      {formatPrice(product.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};