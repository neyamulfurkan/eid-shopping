'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  nameEn: string;
  nameBn: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  _count: { products: number };
}

interface FormState {
  nameEn: string;
  nameBn: string;
  slug: string;
  displayOrder: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  nameEn: '',
  nameBn: '',
  slug: '',
  displayOrder: '0',
  isActive: true,
};

const INPUT =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-brand-text placeholder:text-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-shadow';

const LABEL = 'block text-sm font-medium text-brand-text mb-1';

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Admin categories management page.
 * Allows creating, editing, and deleting product categories.
 */
export default function AdminCategoriesPage() {
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugManual, setSlugManual] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      const json = await res.json() as { data: Category[] };
      setCategories(json.data ?? []);
    } catch {
      showToast('Failed to load categories.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  // ── Slug auto-generation ───────────────────────────────────────────────────

  useEffect(() => {
    if (!slugManual && form.nameEn) {
      const auto = form.nameEn
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      setForm((prev) => ({ ...prev, slug: auto }));
    }
  }, [form.nameEn, slugManual]);

  // ── Open form ──────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSlugManual(false);
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      nameEn: cat.nameEn,
      nameBn: cat.nameBn,
      slug: cat.slug,
      displayOrder: String(cat.displayOrder),
      isActive: cat.isActive,
    });
    setSlugManual(true);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSlugManual(false);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nameEn.trim()) {
      showToast('Category name (English) is required.', 'error');
      return;
    }
    if (!form.slug.trim()) {
      showToast('Slug is required.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        nameEn: form.nameEn.trim(),
        nameBn: form.nameBn.trim(),
        slug: form.slug.trim(),
        displayOrder: parseInt(form.displayOrder, 10) || 0,
        isActive: form.isActive,
      };

      const res = await fetch('/api/categories', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json() as { error?: string };

      if (!res.ok) {
        showToast(json.error ?? 'Failed to save category.', 'error');
        return;
      }

      showToast(
        editingId ? 'Category updated.' : 'Category created.',
        'success',
      );
      closeForm();
      void fetchCategories();
    } catch {
      showToast('An unexpected error occurred.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (cat: Category) => {
    if (cat._count.products > 0) {
      showToast(
        `Cannot delete "${cat.nameEn}" — it has ${cat._count.products} product(s).`,
        'error',
      );
      return;
    }
    if (!window.confirm(`Delete category "${cat.nameEn}"? This cannot be undone.`)) return;

    setDeletingId(cat.id);
    try {
      const res = await fetch('/api/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cat.id }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        showToast(json.error ?? 'Failed to delete category.', 'error');
        return;
      }
      showToast('Category deleted.', 'success');
      void fetchCategories();
    } catch {
      showToast('An unexpected error occurred.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Categories</h1>
          <p className="mt-1 text-sm text-brand-text/60">
            Manage product categories. Categories must exist before adding products.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={openCreate} leftIcon={<Plus size={16} />}>
          New Category
        </Button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="mb-6 rounded-2xl border border-brand-secondary/30 bg-brand-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-brand-text">
              {editingId ? 'Edit Category' : 'New Category'}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div>
              <label className={LABEL}>
                Name (English) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nameEn}
                onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))}
                placeholder="e.g. Sarees"
                className={INPUT}
              />
            </div>

            <div>
              <label className={LABEL}>Name (Bengali)</label>
              <input
                type="text"
                value={form.nameBn}
                onChange={(e) => setForm((p) => ({ ...p, nameBn: e.target.value }))}
                placeholder="যেমন: শাড়ি"
                className={INPUT}
              />
            </div>

            <div>
              <label className={LABEL}>
                URL Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => {
                  setSlugManual(true);
                  setForm((p) => ({
                    ...p,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                  }));
                }}
                placeholder="e.g. sarees"
                className={INPUT}
              />
            </div>

            <div>
              <label className={LABEL}>Display Order</label>
              <input
                type="number"
                min="0"
                value={form.displayOrder}
                onChange={(e) => setForm((p) => ({ ...p, displayOrder: e.target.value }))}
                className={INPUT}
              />
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                className="h-4 w-4 rounded accent-brand-primary"
              />
              <label htmlFor="isActive" className="text-sm text-brand-text cursor-pointer">
                Active (visible on storefront)
              </label>
            </div>

            <div className="flex gap-3 sm:col-span-2">
              <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
                {editingId ? 'Save Changes' : 'Create Category'}
              </Button>
              <Button type="button" variant="ghost" size="md" onClick={closeForm}>
                Cancel
              </Button>
            </div>

          </form>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <Tag className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No categories yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Create your first category to start adding products.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Slug</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Products</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Order</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-text">{cat.nameEn}</p>
                    {cat.nameBn && (
                      <p className="text-xs text-brand-text/50">{cat.nameBn}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{cat.slug}</td>
                  <td className="px-4 py-3 text-gray-600">{cat._count.products}</td>
                  <td className="px-4 py-3 text-gray-600">{cat.displayOrder}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        cat.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500',
                      )}
                    >
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(cat)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-primary transition-colors"
                        aria-label={`Edit ${cat.nameEn}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        disabled={deletingId === cat.id}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                        aria-label={`Delete ${cat.nameEn}`}
                      >
                        <Trash2 size={14} />
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
  );
}