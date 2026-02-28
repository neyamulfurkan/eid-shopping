// src/components/admin/BannerManager.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2, Eye, EyeOff, ImageOff } from 'lucide-react';
import type { Banner } from '@prisma/client';

import { ImageUpload } from '@/components/ui/ImageUpload';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/** Form state for the create/edit modal. */
interface BannerFormState {
  imageUrl: string;
  imagePublicId: string;
  titleEn: string;
  titleBn: string;
  subtitleEn: string;
  subtitleBn: string;
  ctaTextEn: string;
  ctaTextBn: string;
  ctaLink: string;
  displayOrder: number;
  isActive: boolean;
}

const EMPTY_FORM: BannerFormState = {
  imageUrl: '',
  imagePublicId: '',
  titleEn: '',
  titleBn: '',
  subtitleEn: '',
  subtitleBn: '',
  ctaTextEn: '',
  ctaTextBn: '',
  ctaLink: '',
  displayOrder: 0,
  isActive: true,
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Sends a POST to /api/site-config with an action-discriminated body.
 * Returns the parsed response JSON or throws on non-ok status.
 * @param body - Request body including the action discriminator field.
 * @returns Parsed JSON response data.
 */
async function bannerAction(body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch('/api/site-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { data?: unknown; error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? `Request failed with status ${res.status}`);
  }
  return json.data;
}

// ─────────────────────────────────────────────
// Sub-component — BannerRow
// ─────────────────────────────────────────────

interface BannerRowProps {
  banner: Banner;
  onEdit: (banner: Banner) => void;
  onDelete: (id: string) => void;
  onToggle: (banner: Banner) => void;
  isActioning: boolean;
}

/**
 * Renders a single banner row in the manager table.
 * @param banner - The banner data to display.
 * @param onEdit - Callback to open the edit modal.
 * @param onDelete - Callback to delete the banner.
 * @param onToggle - Callback to toggle isActive.
 * @param isActioning - Disables all row actions while a mutation is in flight.
 * @returns A table row with thumbnail, metadata, and action buttons.
 */
const BannerRow: React.FC<BannerRowProps> = ({
  banner,
  onEdit,
  onDelete,
  onToggle,
  isActioning,
}) => (
  <div className="flex items-center gap-4 p-4 rounded-xl bg-brand-surface border border-brand-secondary/20 hover:border-brand-secondary/40 transition-colors">
    {/* Thumbnail */}
    <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-brand-bg shrink-0 border border-brand-secondary/20">
      {banner.imageUrl ? (
        <Image
          src={banner.imageUrl}
          alt={banner.titleEn ?? 'Banner'}
          fill
          className="object-cover"
          sizes="80px"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full text-brand-text/30">
          <ImageOff size={20} />
        </div>
      )}
    </div>

    {/* Metadata */}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-brand-text truncate">
        {banner.titleEn || <span className="text-brand-text/40 italic">Untitled</span>}
      </p>
      {banner.titleBn && (
        <p className="text-xs text-brand-text/60 truncate">{banner.titleBn}</p>
      )}
      <div className="flex items-center gap-3 mt-1">
        <span className="text-xs text-brand-text/50">Order: {banner.displayOrder}</span>
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            banner.isActive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {banner.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>

    {/* Actions */}
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={() => onToggle(banner)}
        disabled={isActioning}
        aria-label={banner.isActive ? 'Deactivate banner' : 'Activate banner'}
        className="p-2 rounded-lg text-brand-text/50 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {banner.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
      <button
        type="button"
        onClick={() => onEdit(banner)}
        disabled={isActioning}
        aria-label="Edit banner"
        className="p-2 rounded-lg text-brand-text/50 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(banner.id)}
        disabled={isActioning}
        aria-label="Delete banner"
        className="p-2 rounded-lg text-brand-text/50 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Trash2 size={16} />
      </button>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Sub-component — BannerForm (inside Modal)
// ─────────────────────────────────────────────

interface BannerFormProps {
  form: BannerFormState;
  onChange: (patch: Partial<BannerFormState>) => void;
  onImageUpload: (url: string, publicId: string) => void;
}

/**
 * Renders the banner creation/editing form fields.
 * Separated from the modal wrapper to keep concerns clear.
 * @param form - Current form state.
 * @param onChange - Callback to patch form state.
 * @param onImageUpload - Callback wired to the ImageUpload component.
 * @returns A fieldset of labelled inputs for all banner properties.
 */
const BannerFormFields: React.FC<BannerFormProps> = ({ form, onChange, onImageUpload }) => {
  const inputClass =
    'w-full rounded-xl border border-brand-secondary/30 bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-colors';
  const labelClass = 'block text-xs font-semibold text-brand-text/70 mb-1';

  return (
    <div className="flex flex-col gap-5">
      {/* Image upload */}
      <div>
        <label className={labelClass}>Banner Image *</label>
        <ImageUpload
          folder="banners"
          currentUrl={form.imageUrl || undefined}
          onUpload={onImageUpload}
          className="w-full"
        />
      </div>

      {/* Title row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Title (English)</label>
          <input
            type="text"
            value={form.titleEn}
            onChange={(e) => onChange({ titleEn: e.target.value })}
            placeholder="e.g. Eid Sale 2025"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Title (বাংলা)</label>
          <input
            type="text"
            value={form.titleBn}
            onChange={(e) => onChange({ titleBn: e.target.value })}
            placeholder="যেমন: ঈদ সেল ২০২৫"
            className={inputClass}
          />
        </div>
      </div>

      {/* Subtitle row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Subtitle (English)</label>
          <input
            type="text"
            value={form.subtitleEn}
            onChange={(e) => onChange({ subtitleEn: e.target.value })}
            placeholder="e.g. Up to 50% off"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Subtitle (বাংলা)</label>
          <input
            type="text"
            value={form.subtitleBn}
            onChange={(e) => onChange({ subtitleBn: e.target.value })}
            placeholder="যেমন: ৫০% পর্যন্ত ছাড়"
            className={inputClass}
          />
        </div>
      </div>

      {/* CTA text row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>CTA Button Text (English)</label>
          <input
            type="text"
            value={form.ctaTextEn}
            onChange={(e) => onChange({ ctaTextEn: e.target.value })}
            placeholder="e.g. Shop Now"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>CTA Button Text (বাংলা)</label>
          <input
            type="text"
            value={form.ctaTextBn}
            onChange={(e) => onChange({ ctaTextBn: e.target.value })}
            placeholder="যেমন: এখনই কিনুন"
            className={inputClass}
          />
        </div>
      </div>

      {/* CTA link + display order */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>CTA Link</label>
          <input
            type="text"
            value={form.ctaLink}
            onChange={(e) => onChange({ ctaLink: e.target.value })}
            placeholder="e.g. /products?category=eid"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Display Order</label>
          <input
            type="number"
            min={0}
            value={form.displayOrder}
            onChange={(e) => onChange({ displayOrder: parseInt(e.target.value, 10) || 0 })}
            className={inputClass}
          />
        </div>
      </div>

      {/* Active toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div className="relative">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => onChange({ isActive: e.target.checked })}
            className="sr-only"
          />
          <div
            className={`w-10 h-6 rounded-full transition-colors ${
              form.isActive ? 'bg-brand-primary' : 'bg-brand-secondary/40'
            }`}
          />
          <div
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              form.isActive ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </div>
        <span className="text-sm font-medium text-brand-text">
          {form.isActive ? 'Active — visible on storefront' : 'Inactive — hidden from storefront'}
        </span>
      </label>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Component — BannerManager
// ─────────────────────────────────────────────

/**
 * Admin banner CRUD manager.
 * Fetches banners from GET /api/site-config?section=banners and provides
 * a full create / edit / delete / toggle-active workflow via Modal forms
 * backed by POST /api/site-config with action-discriminated request bodies.
 * @returns The banner management UI including the list and modal form.
 */
export const BannerManager: React.FC = () => {
  const { showToast } = useToast();

  // ── State ──────────────────────────────────────────────────────────────────
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActioning, setIsActioning] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // ── Fetch banners ──────────────────────────────────────────────────────────

  /**
   * Loads all banners (active and inactive) from the API.
   * Uses section=banners query param which the API resolves via the Banner table.
   */
  const fetchBanners = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/site-config?section=banners');
      const json = (await res.json()) as { data?: Banner[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed to load banners');
      setBanners(json.data ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load banners';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void fetchBanners();
  }, [fetchBanners]);

  // ── Modal helpers ──────────────────────────────────────────────────────────

  /** Opens the modal pre-populated with the given banner's data for editing. */
  const openEdit = useCallback((banner: Banner) => {
    setEditingBanner(banner);
    setForm({
      imageUrl: banner.imageUrl ?? '',
      imagePublicId: banner.cloudinaryId ?? '',
      titleEn: banner.titleEn ?? '',
      titleBn: banner.titleBn ?? '',
      subtitleEn: banner.subtitleEn ?? '',
      subtitleBn: banner.subtitleBn ?? '',
      ctaTextEn: banner.ctaTextEn ?? '',
      ctaTextBn: banner.ctaTextBn ?? '',
      ctaLink: banner.ctaLink ?? '',
      displayOrder: banner.displayOrder,
      isActive: banner.isActive,
    });
    setIsModalOpen(true);
  }, []);

  /** Opens the modal with a blank form for creating a new banner. */
  const openCreate = useCallback(() => {
    setEditingBanner(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  }, []);

  /** Closes the modal and resets transient state. */
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingBanner(null);
    setForm(EMPTY_FORM);
  }, []);

  /** Patches a subset of the form state. */
  const handleFormChange = useCallback((patch: Partial<BannerFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  /** Handles the ImageUpload callback, writing both url and publicId to form state. */
  const handleImageUpload = useCallback((url: string, publicId: string) => {
    setForm((prev) => ({ ...prev, imageUrl: url, imagePublicId: publicId }));
  }, []);

  // ── CRUD operations ────────────────────────────────────────────────────────

  /**
   * Saves the current form as either a create or update banner action.
   * Validates that an image URL is present before submitting.
   */
  const handleSave = useCallback(async () => {
    if (!form.imageUrl) {
      showToast('Please upload a banner image before saving.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        imageUrl: form.imageUrl,
        cloudinaryId: form.imagePublicId,
        titleEn: form.titleEn || null,
        titleBn: form.titleBn || null,
        subtitleEn: form.subtitleEn || null,
        subtitleBn: form.subtitleBn || null,
        ctaTextEn: form.ctaTextEn || null,
        ctaTextBn: form.ctaTextBn || null,
        ctaLink: form.ctaLink || null,
        displayOrder: form.displayOrder,
        isActive: form.isActive,
      };

      if (editingBanner) {
        await bannerAction({ action: 'update_banner', id: editingBanner.id, ...payload });
        showToast('Banner updated successfully.', 'success');
      } else {
        await bannerAction({ action: 'create_banner', ...payload });
        showToast('Banner created successfully.', 'success');
      }

      closeModal();
      await fetchBanners();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save banner';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [form, editingBanner, closeModal, fetchBanners, showToast]);

  /**
   * Deletes a banner by id after an inline confirmation.
   * @param id - The banner id to delete.
   */
  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('Delete this banner? This action cannot be undone.')) return;

      setIsActioning(true);
      try {
        await bannerAction({ action: 'delete_banner', id });
        showToast('Banner deleted.', 'success');
        await fetchBanners();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to delete banner';
        showToast(msg, 'error');
      } finally {
        setIsActioning(false);
      }
    },
    [fetchBanners, showToast],
  );

  /**
   * Toggles the isActive flag of a banner.
   * @param banner - The banner whose active state should be toggled.
   */
  const handleToggle = useCallback(
    async (banner: Banner) => {
      setIsActioning(true);
      try {
        await bannerAction({
          action: 'toggle_banner',
          id: banner.id,
          isActive: !banner.isActive,
        });
        showToast(
          `Banner ${!banner.isActive ? 'activated' : 'deactivated'}.`,
          'success',
        );
        await fetchBanners();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update banner';
        showToast(msg, 'error');
      } finally {
        setIsActioning(false);
      }
    },
    [fetchBanners, showToast],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-brand-text">Hero Banners</h2>
          <p className="text-sm text-brand-text/50 mt-0.5">
            Manage the hero slider images shown on the homepage.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus size={16} />}
          onClick={openCreate}
          disabled={isActioning}
        >
          Add Banner
        </Button>
      </div>

      {/* Banner list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" className="text-brand-primary" />
        </div>
      ) : banners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-brand-text/40">
          <ImageOff size={40} strokeWidth={1.2} />
          <p className="text-sm font-medium">No banners yet. Add your first banner above.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {banners.map((banner) => (
            <BannerRow
              key={banner.id}
              banner={banner}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
              isActioning={isActioning}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingBanner ? 'Edit Banner' : 'New Banner'}
        size="lg"
      >
        <div className="flex flex-col gap-6">
          <BannerFormFields
            form={form}
            onChange={handleFormChange}
            onImageUpload={handleImageUpload}
          />

          {/* Modal footer actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-brand-secondary/20">
            <Button variant="ghost" size="md" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              isLoading={isSaving}
              disabled={isSaving}
            >
              {editingBanner ? 'Save Changes' : 'Create Banner'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};