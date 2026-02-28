// src/components/admin/OrderTable.tsx
'use client';

import React, { useState } from 'react';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { Eye } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatPrice, formatDate } from '@/lib/utils';
import type { AdminOrderListItem } from '@/lib/types';

// ─────────────────────────────────────────────
// Badge Helpers
// ─────────────────────────────────────────────

/**
 * Returns Tailwind classes for an order status badge.
 * @param status - The OrderStatus enum value.
 * @returns A string of Tailwind utility classes.
 */
function orderStatusClasses(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.PENDING:   return 'bg-yellow-100 text-yellow-800';
    case OrderStatus.CONFIRMED: return 'bg-blue-100 text-blue-800';
    case OrderStatus.SHIPPED:   return 'bg-orange-100 text-orange-800';
    case OrderStatus.DELIVERED: return 'bg-green-100 text-green-800';
    case OrderStatus.CANCELLED: return 'bg-red-100 text-red-800';
    default:                    return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Returns Tailwind classes for a payment status badge.
 * @param status - The PaymentStatus enum value.
 * @returns A string of Tailwind utility classes.
 */
function paymentStatusClasses(status: PaymentStatus): string {
  switch (status) {
    case PaymentStatus.PAID:    return 'bg-green-100 text-green-800';
    case PaymentStatus.PENDING: return 'bg-yellow-100 text-yellow-800';
    case PaymentStatus.FAILED:  return 'bg-red-100 text-red-800';
    default:                    return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Returns a human-readable label for a PaymentMethod enum value.
 * @param method - The PaymentMethod enum value.
 * @returns A display string.
 */
function paymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case PaymentMethod.BKASH:  return 'bKash';
    case PaymentMethod.NAGAD:  return 'Nagad';
    case PaymentMethod.ROCKET: return 'Rocket';
    case PaymentMethod.COD:    return 'Cash on Delivery';
    default:                   return method;
  }
}

// ─────────────────────────────────────────────
// Badge Component
// ─────────────────────────────────────────────

interface BadgeProps {
  label: string;
  className: string;
}

const Badge: React.FC<BadgeProps> = ({ label, className }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {label}
  </span>
);

// ─────────────────────────────────────────────
// Order Detail Modal Content
// ─────────────────────────────────────────────

interface OrderDetailProps {
  order: AdminOrderListItem;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onClose: () => void;
}

/**
 * Renders the full order detail inside the Modal, including customer info,
 * items table, payment section, and a status update select.
 */
const OrderDetail: React.FC<OrderDetailProps> = ({ order, onStatusChange, onClose }) => {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(order.orderStatus);

  const handleStatusSave = () => {
    if (selectedStatus !== order.orderStatus) {
      onStatusChange(order.id, selectedStatus);
    }
    onClose();
  };

  return (
    <div className="space-y-6">
      {/* Customer Information */}
      <section>
        <h3 className="text-sm font-semibold text-brand-text/60 uppercase tracking-wider mb-3">
          Customer Information
        </h3>
        <div className="bg-brand-bg rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-brand-text/60">Name</span>
            <span className="font-medium text-brand-text">{order.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-brand-text/60">Phone</span>
            <span className="font-medium text-brand-text font-mono">{order.customerPhone}</span>
          </div>
          {'customerAddress' in order && (order as AdminOrderListItem & { customerAddress?: string }).customerAddress && (
            <div className="flex justify-between gap-4">
              <span className="text-brand-text/60 shrink-0">Address</span>
              <span className="font-medium text-brand-text text-right">
                {(order as AdminOrderListItem & { customerAddress?: string }).customerAddress}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Order Items */}
      <section>
        <h3 className="text-sm font-semibold text-brand-text/60 uppercase tracking-wider mb-3">
          Order Items
        </h3>
        <div className="border border-brand-secondary/20 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-bg border-b border-brand-secondary/20">
                <th className="text-left px-4 py-2.5 font-medium text-brand-text/60">Product</th>
                <th className="text-center px-4 py-2.5 font-medium text-brand-text/60">Qty</th>
                <th className="text-right px-4 py-2.5 font-medium text-brand-text/60">Unit Price</th>
                <th className="text-right px-4 py-2.5 font-medium text-brand-text/60">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-secondary/10">
              {order.items.map((item, idx) => (
                <tr key={idx} className="bg-brand-surface">
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-text">{item.productNameEn}</p>
                    {item.variantInfo && (
                      <p className="text-xs text-brand-text/50 mt-0.5">{item.variantInfo}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-brand-text">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-brand-text">{formatPrice(item.unitPrice)}</td>
                  <td className="px-4 py-3 text-right font-medium text-brand-text">{formatPrice(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-brand-bg border-t border-brand-secondary/20">
                <td colSpan={3} className="px-4 py-3 text-right font-semibold text-brand-text">
                  Order Total
                </td>
                <td className="px-4 py-3 text-right font-bold text-brand-primary">
                  {formatPrice(order.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Payment Information */}
      <section>
        <h3 className="text-sm font-semibold text-brand-text/60 uppercase tracking-wider mb-3">
          Payment
        </h3>
        <div className="bg-brand-bg rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-brand-text/60">Method</span>
            <span className="font-medium text-brand-text">{paymentMethodLabel(order.paymentMethod)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-brand-text/60">Status</span>
            <Badge
              label={order.paymentStatus}
              className={paymentStatusClasses(order.paymentStatus)}
            />
          </div>
          {'transactionId' in order && (order as AdminOrderListItem & { transactionId?: string }).transactionId && (
            <div className="flex justify-between gap-4">
              <span className="text-brand-text/60 shrink-0">Transaction ID</span>
              <span className="font-mono text-xs text-brand-text break-all text-right">
                {(order as AdminOrderListItem & { transactionId?: string }).transactionId}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Notes (if any) */}
      {'notes' in order && (order as AdminOrderListItem & { notes?: string }).notes && (
        <section>
          <h3 className="text-sm font-semibold text-brand-text/60 uppercase tracking-wider mb-3">
            Notes
          </h3>
          <p className="text-sm text-brand-text bg-brand-bg rounded-xl p-4">
            {(order as AdminOrderListItem & { notes?: string }).notes}
          </p>
        </section>
      )}

      {/* Status Update */}
      <section>
        <h3 className="text-sm font-semibold text-brand-text/60 uppercase tracking-wider mb-3">
          Update Order Status
        </h3>
        <div className="flex gap-3 items-center">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
            className="flex-1 input-base text-sm rounded-xl border border-brand-secondary/30 bg-brand-surface px-3 py-2 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          >
            {Object.values(OrderStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <Button variant="primary" size="sm" onClick={handleStatusSave}>
            Save
          </Button>
        </div>
      </section>
    </div>
  );
};

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface OrderTableProps {
  orders: AdminOrderListItem[];
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

/**
 * Admin order table with status badges, detail modal, and status update functionality.
 * Renders a scrollable table of orders with a View button per row that opens a
 * Modal showing full order details and a status select to update the order pipeline.
 * @param orders - Array of AdminOrderListItem objects to display.
 * @param onStatusChange - Callback invoked with orderId and new OrderStatus on save.
 * @returns A table with per-row modals for order management.
 */
export const OrderTable: React.FC<OrderTableProps> = ({ orders, onStatusChange }) => {
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderListItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleView = (order: AdminOrderListItem) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    // Keep selectedOrder until animation completes (AnimatePresence needs it)
    setTimeout(() => setSelectedOrder(null), 300);
  };

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    onStatusChange(orderId, status);
    handleClose();
  };

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-brand-text/40">
        <p className="text-sm">No orders found.</p>
      </div>
    );
  }

  return (
    <>
      {/* Table — horizontally scrollable on mobile */}
      <div className="overflow-x-auto rounded-2xl border border-brand-secondary/20">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="bg-brand-bg border-b border-brand-secondary/20">
              <th className="text-left px-4 py-3 font-semibold text-brand-text/60">Order #</th>
              <th className="text-left px-4 py-3 font-semibold text-brand-text/60">Customer</th>
              <th className="text-left px-4 py-3 font-semibold text-brand-text/60">Phone</th>
              <th className="text-right px-4 py-3 font-semibold text-brand-text/60">Total</th>
              <th className="text-center px-4 py-3 font-semibold text-brand-text/60">Payment</th>
              <th className="text-center px-4 py-3 font-semibold text-brand-text/60">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-brand-text/60">Date</th>
              <th className="text-center px-4 py-3 font-semibold text-brand-text/60">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-secondary/10">
            {orders.map((order) => (
              <tr
                key={order.id}
                className="bg-brand-surface hover:bg-brand-bg transition-colors"
              >
                {/* Order Number */}
                <td className="px-4 py-3">
                  <span className="font-mono text-brand-primary font-semibold text-xs">
                    {order.orderNumber}
                  </span>
                </td>

                {/* Customer Name */}
                <td className="px-4 py-3">
                  <span className="font-medium text-brand-text">{order.customerName}</span>
                </td>

                {/* Phone */}
                <td className="px-4 py-3">
                  <span className="font-mono text-brand-text/70 text-xs">{order.customerPhone}</span>
                </td>

                {/* Total */}
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold text-brand-text">{formatPrice(order.total)}</span>
                </td>

                {/* Payment Method + Status */}
                <td className="px-4 py-3">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-brand-text/60">{paymentMethodLabel(order.paymentMethod)}</span>
                    <Badge
                      label={order.paymentStatus}
                      className={paymentStatusClasses(order.paymentStatus)}
                    />
                  </div>
                </td>

                {/* Order Status */}
                <td className="px-4 py-3 text-center">
                  <Badge
                    label={order.orderStatus}
                    className={orderStatusClasses(order.orderStatus)}
                  />
                </td>

                {/* Date */}
                <td className="px-4 py-3">
                  <span className="text-brand-text/60 text-xs">{formatDate(order.createdAt)}</span>
                </td>

                {/* View Action */}
                <td className="px-4 py-3 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Eye size={14} />}
                    onClick={() => handleView(order)}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title={selectedOrder ? `Order ${selectedOrder.orderNumber}` : ''}
        size="lg"
      >
        {selectedOrder && (
          <OrderDetail
            order={selectedOrder}
            onStatusChange={handleStatusChange}
            onClose={handleClose}
          />
        )}
      </Modal>
    </>
  );
};