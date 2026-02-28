// src/components/admin/PromoCodeManager.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { PromoCode } from '@prisma/client';
import { PlusCircle, Pencil, Trash2, ToggleLeft, ToggleRight, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { PromoType } from '@/lib/types';
import { formatPrice, formatDate } from '@/lib/utils';

// ─────────────────────────────────────────────
// Local Types
// ─────────────────────────────────────────────

interface PromoFormState {
  code: string;
  type: PromoType;
  value: string;
  minOrderAmount: string;
  maxUses: string;
  expiresAt: string;
  isActive: boolean;
}

const EMPTY_FORM: PromoFormState = {
  code: '',
  type: PromoType.PERCENTAGE,
  value: '',
  minOrderAmount: '0',
  maxUses: '',
  expiresAt: '',
  isActive: true,
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Formats a promo value for display in the table (e.g. '10%' or '৳50').
 * @param type - PromoType.PERCENTAGE or PromoType.FIXED
 * @param value - Numeric value (Decimal serialised to string or number)
 * @returns Human-readable discount string.
 */
function formatPromoValue(type: PromoType, value: number | string): string {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (type === PromoType.PERCENTAGE) return `${n}%`;
  return formatPrice(n);
}

/**
 * Converts a PromoCode from the API into the form state shape for editing.
 * @param code - The PromoCode object returned by the API.
 * @returns A PromoFormState pre-populated with the code's values.
 */
function promoToForm(code: PromoCode): PromoFormState {
  return {
    code: code.code,
    type: code.type,
    value: String(code.value),
    minOrderAmount: String(code.minOrderAmount),
    maxUses: code.maxUses != null ? String(code.maxUses) : '',
    expiresAt: code.expiresAt
      ? new Date(code.expiresAt).toISOString().slice(0, 10)
      : '',
    isActive: code.isActive,
  };
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

interface StatusBadgeProps {
  active: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ active }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
      active
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    }`}
  >
    {active ? 'Active' : 'Inactive'}
  </span>
);

interface TypeBadgeProps {
  type: PromoType;
}

const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
      type === PromoType.PERCENTAGE
        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
    }`}
  >
    {type === PromoType.PERCENTAGE ? 'Percentage' : 'Fixed'}
  </span>
);

// ─────────────────────────────────────────────
// PromoCodeManager
// ─────────────────────────────────────────────

/**
 * Admin component for managing promo codes.
 * Fetches all codes on mount, supports create/edit via Modal form,
 * toggle active state, and deletion with inline confirmation.
 */
export const PromoCodeManager: React.FC = () => {
  const { showToast } = useToast();

  // ── State ──────────────────────────────────
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [form, setForm] = useState<PromoFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────

  /**
   * Fetches all promo codes from GET /api/promo-codes.
   */
  const fetchCodes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/promo-codes');
      if (!res.ok) throw new Error('Failed to load promo codes');
      const json = await res.json();
      setCodes(json.data ?? []);
    } catch (err) {
      showToast('Failed to load promo codes', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  // ── Modal helpers ──────────────────────────

  const openCreateModal = () => {
    setEditingCode(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (code: PromoCode) => {
    setEditingCode(code);
    setForm(promoToForm(code));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCode(null);
    setForm(EMPTY_FORM);
  };

  // ── Form field handlers ────────────────────

  const handleFieldChange = (
    field: keyof PromoFormState,
    value: string | boolean | PromoType,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Submit (create / update) ───────────────

  /**
   * Validates and submits the promo form to POST or PATCH /api/promo-codes.
   */
  const handleSubmit = async () => {
    // Basic validation
    if (!form.code.trim()) {
      showToast('Promo code is required', 'error');
      return;
    }
    const numericValue = parseFloat(form.value);
    if (isNaN(numericValue) || numericValue <= 0) {
      showToast('Value must be a positive number', 'error');
      return;
    }
    if (form.type === PromoType.PERCENTAGE && numericValue > 100) {
      showToast('Percentage cannot exceed 100', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        code: form.code.toUpperCase(),
        type: form.type,
        value: numericValue,
        minOrderAmount: parseFloat(form.minOrderAmount) || 0,
        maxUses: form.maxUses !== '' ? parseInt(form.maxUses, 10) : null,
        expiresAt: form.expiresAt !== '' ? new Date(form.expiresAt).toISOString() : null,
        isActive: form.isActive,
      };

      let res: Response;
      if (editingCode) {
        res = await fetch('/api/promo-codes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingCode.id, ...payload }),
        });
      } else {
        res = await fetch('/api/promo-codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Save failed');
      }

      showToast(
        editingCode ? 'Promo code updated' : 'Promo code created',
        'success',
      );
      closeModal();
      await fetchCodes();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Toggle active ──────────────────────────

  /**
   * Toggles the isActive flag for a promo code via PATCH /api/promo-codes.
   * @param code - The PromoCode to toggle.
   */
  const handleToggle = async (code: PromoCode) => {
    setTogglingId(code.id);
    try {
      const res = await fetch('/api/promo-codes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: code.id, isActive: !code.isActive }),
      });
      if (!res.ok) throw new Error('Toggle failed');
      showToast(
        `Code ${code.code} ${!code.isActive ? 'activated' : 'deactivated'}`,
        'success',
      );
      await fetchCodes();
    } catch {
      showToast('Failed to toggle promo code', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // ── Delete ─────────────────────────────────

  /**
   * Deletes a promo code after inline confirmation via DELETE /api/promo-codes.
   * @param code - The PromoCode to delete.
   */
  const handleDelete = async (code: PromoCode) => {
    if (!window.confirm(`Delete promo code "${code.code}"? This cannot be undone.`)) {
      return;
    }
    setDeletingId(code.id);
    try {
      const res = await fetch('/api/promo-codes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: code.id }),
      });
      if (!res.ok) throw new Error('Delete failed');
      showToast(`Code ${code.code} deleted`, 'success');
      await fetchCodes();
    } catch {
      showToast('Failed to delete promo code', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ─────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="text-brand-primary" size={22} />
          <h2 className="text-xl font-semibold text-brand-text">Promo Codes</h2>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<PlusCircle size={16} />}
          onClick={openCreateModal}
        >
          Add New Code
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-brand-secondary/20 overflow-hidden bg-brand-surface">
        {isLoading ? (
          <div className="p-10 text-center text-brand-text/50 text-sm">
            Loading promo codes…
          </div>
        ) : codes.length === 0 ? (
          <div className="p-10 text-center text-brand-text/50 text-sm">
            No promo codes yet. Create your first one!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-sm">
              <thead>
                <tr className="bg-brand-secondary/10 text-brand-text/70 text-left">
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Value</th>
                  <th className="px-4 py-3 font-semibold">Min Order</th>
                  <th className="px-4 py-3 font-semibold">Used / Max</th>
                  <th className="px-4 py-3 font-semibold">Expires</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-secondary/10">
                {codes.map((code) => (
                  <tr
                    key={code.id}
                    className="hover:bg-brand-secondary/5 transition-colors"
                  >
                    {/* Code */}
                    <td className="px-4 py-3 font-mono font-bold text-brand-primary tracking-wide">
                      {code.code}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <TypeBadge type={code.type} />
                    </td>

                    {/* Value */}
                    <td className="px-4 py-3 font-medium text-brand-text">
                      {formatPromoValue(code.type, code.value as unknown as number)}
                    </td>

                    {/* Min Order */}
                    <td className="px-4 py-3 text-brand-text/70">
                      {parseFloat(String(code.minOrderAmount)) > 0
                        ? formatPrice(parseFloat(String(code.minOrderAmount)))
                        : '—'}
                    </td>

                    {/* Used / Max */}
                    <td className="px-4 py-3 text-brand-text/70">
                      {code.usedCount} / {code.maxUses != null ? code.maxUses : '∞'}
                    </td>

                    {/* Expires */}
                    <td className="px-4 py-3 text-brand-text/70">
                      {code.expiresAt ? formatDate(code.expiresAt) : 'Never'}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge active={code.isActive} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit */}
                        <button
                          onClick={() => openEditModal(code)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-brand-text/50 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>

                        {/* Toggle */}
                        <button
                          onClick={() => handleToggle(code)}
                          disabled={togglingId === code.id}
                          title={code.isActive ? 'Deactivate' : 'Activate'}
                          className="p-1.5 rounded-lg text-brand-text/50 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors disabled:opacity-40"
                        >
                          {code.isActive ? (
                            <ToggleRight size={15} className="text-green-600" />
                          ) : (
                            <ToggleLeft size={15} />
                          )}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(code)}
                          disabled={deletingId === code.id}
                          title="Delete"
                          className="p-1.5 rounded-lg text-brand-text/50 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCode ? `Edit: ${editingCode.code}` : 'New Promo Code'}
        size="md"
      >
        <div className="space-y-5">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">
              Promo Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => handleFieldChange('code', e.target.value.toUpperCase())}
              placeholder="e.g. EID2026"
              className="input-base w-full font-mono tracking-widest"
              disabled={!!editingCode}
              maxLength={30}
            />
            {editingCode && (
              <p className="mt-1 text-xs text-brand-text/50">Code cannot be changed after creation.</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Discount Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              {([PromoType.PERCENTAGE, PromoType.FIXED] as PromoType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleFieldChange('type', t)}
                  className={`flex-1 py-2 px-4 rounded-xl border-2 text-sm font-medium transition-colors ${
                    form.type === t
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : 'border-brand-secondary/30 text-brand-text hover:border-brand-primary'
                  }`}
                >
                  {t === PromoType.PERCENTAGE ? 'Percentage (%)' : 'Fixed Amount (৳)'}
                </button>
              ))}
            </div>
          </div>

          {/* Value */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">
              {form.type === PromoType.PERCENTAGE ? 'Discount %' : 'Discount Amount (BDT)'}
              <span className="text-red-500"> *</span>
            </label>
            <input
              type="number"
              value={form.value}
              onChange={(e) => handleFieldChange('value', e.target.value)}
              placeholder={form.type === PromoType.PERCENTAGE ? 'e.g. 10' : 'e.g. 50'}
              min={0}
              max={form.type === PromoType.PERCENTAGE ? 100 : undefined}
              step="0.01"
              className="input-base w-full"
            />
          </div>

          {/* Min Order Amount */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">
              Minimum Order Amount (BDT)
            </label>
            <input
              type="number"
              value={form.minOrderAmount}
              onChange={(e) => handleFieldChange('minOrderAmount', e.target.value)}
              placeholder="0"
              min={0}
              step="0.01"
              className="input-base w-full"
            />
          </div>

          {/* Max Uses + Expires row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Max Uses
              </label>
              <input
                type="number"
                value={form.maxUses}
                onChange={(e) => handleFieldChange('maxUses', e.target.value)}
                placeholder="Unlimited"
                min={1}
                step={1}
                className="input-base w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Expires On
              </label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => handleFieldChange('expiresAt', e.target.value)}
                className="input-base w-full"
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-2 px-3 bg-brand-secondary/10 rounded-xl">
            <span className="text-sm font-medium text-brand-text">Active</span>
            <button
              type="button"
              role="switch"
              aria-checked={form.isActive}
              onClick={() => handleFieldChange('isActive', !form.isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.isActive ? 'bg-brand-primary' : 'bg-brand-secondary/30'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="md" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" size="md" isLoading={isSaving} onClick={handleSubmit}>
              {editingCode ? 'Save Changes' : 'Create Code'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};