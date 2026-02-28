// src/components/admin/ProductForm.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Product, ProductImage, ProductVariant } from '@prisma/client';
import { Plus, X, Printer, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useToast } from '@/context/ToastContext';
import { slugify } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImageEntry {
  url: string;
  cloudinaryId: string;
  isDefault: boolean;
}

interface VariantEntry {
  id?: string;
  value: string;
  stockQty: number;
  priceModifier: number;
}

interface FormErrors {
  nameEn?: string;
  categoryId?: string;
  basePrice?: string;
  stockQty?: string;
  slug?: string;
  flashDealEndsAt?: string;
}

interface ProductFormProps {
  initialData?: Partial<Product & { images: ProductImage[]; variants: ProductVariant[] }>;
  categories: { id: string; nameEn: string }[];
  onSave: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INPUT =
  'w-full rounded-xl border border-brand-secondary/30 bg-brand-surface px-3 py-2 text-sm text-brand-text placeholder:text-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-shadow';

const LABEL = 'block text-sm font-medium text-brand-text mb-1';

const SECTION_HEADING = 'text-base font-semibold text-brand-text mb-3 pb-2 border-b border-brand-secondary/20';

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Full product creation and editing form with multi-image upload,
 * size/color variant management, flash deal controls, and QR code display.
 * POSTs to /api/products (create) or PATCHes /api/products/[id] (update).
 * @param initialData - Existing product data for edit mode; omit for create mode.
 * @param categories - List of categories to populate the category select.
 * @param onSave - Called after a successful save to trigger navigation/refresh.
 * @returns A comprehensive product form.
 */
export const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  categories,
  onSave,
}) => {
  const { showToast } = useToast();
  const isEditMode = Boolean(initialData?.id);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [nameEn, setNameEn] = useState(initialData?.nameEn ?? '');
  const [nameBn, setNameBn] = useState(initialData?.nameBn ?? '');
  const [slug, setSlug] = useState(initialData?.slug ?? '');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEditMode);
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? '');
  const [descriptionEn, setDescriptionEn] = useState(initialData?.descriptionEn ?? '');
  const [descriptionBn, setDescriptionBn] = useState(initialData?.descriptionBn ?? '');
  const [basePrice, setBasePrice] = useState(
    initialData?.basePrice != null ? String(initialData.basePrice) : '',
  );
  const [salePrice, setSalePrice] = useState(
    initialData?.salePrice != null ? String(initialData.salePrice) : '',
  );
  const [costPrice, setCostPrice] = useState(
    initialData?.costPrice != null ? String(initialData.costPrice) : '',
  );
  const [stockQty, setStockQty] = useState(
    initialData?.stockQty != null ? String(initialData.stockQty) : '0',
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(
    initialData?.lowStockThreshold != null ? String(initialData.lowStockThreshold) : '5',
  );
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured ?? false);
  const [isFlashDeal, setIsFlashDeal] = useState(initialData?.isFlashDeal ?? false);
  const [flashDealEndsAt, setFlashDealEndsAt] = useState(
    initialData?.flashDealEndsAt
      ? new Date(initialData.flashDealEndsAt).toISOString().slice(0, 16)
      : '',
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  // ── Image state ─────────────────────────────────────────────────────────────
  const [images, setImages] = useState<ImageEntry[]>(
    initialData?.images?.map((img) => ({
      url: img.url,
      cloudinaryId: img.cloudinaryId,
      isDefault: img.isDefault,
    })) ?? [],
  );

  // ── Variant state ───────────────────────────────────────────────────────────
  const [sizeVariants, setSizeVariants] = useState<VariantEntry[]>(
    initialData?.variants
      ?.filter((v) => v.type === 'size')
      .map((v) => ({
        id: v.id,
        value: v.value,
        stockQty: v.stockQty,
        priceModifier: Number(v.priceModifier),
      })) ?? [],
  );
  const [colorVariants, setColorVariants] = useState<VariantEntry[]>(
    initialData?.variants
      ?.filter((v) => v.type === 'color')
      .map((v) => ({
        id: v.id,
        value: v.value,
        stockQty: v.stockQty,
        priceModifier: Number(v.priceModifier),
      })) ?? [],
  );
  const [newSizeValue, setNewSizeValue] = useState('');
  const [newColorValue, setNewColorValue] = useState('');

  // ── UI state ────────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // ── Slug auto-generation ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!slugManuallyEdited && nameEn) {
      setSlug(slugify(nameEn));
    }
  }, [nameEn, slugManuallyEdited]);

  // ── Image handlers ───────────────────────────────────────────────────────────
  const handleImageUpload = useCallback((url: string, cloudinaryId: string) => {
    if (!url) return;
    setImages((prev) => [
      ...prev,
      { url, cloudinaryId, isDefault: prev.length === 0 },
    ]);
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // If we removed the default image, promote the first remaining one
      if (prev[index]?.isDefault && next.length > 0) {
        next[0].isDefault = true;
      }
      return next;
    });
  }, []);

  const handleSetDefault = useCallback((index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({ ...img, isDefault: i === index })),
    );
  }, []);

  // ── Variant handlers ─────────────────────────────────────────────────────────
  const addSizeVariant = useCallback(() => {
    const trimmed = newSizeValue.trim();
    if (!trimmed) return;
    if (sizeVariants.some((v) => v.value.toLowerCase() === trimmed.toLowerCase())) {
      showToast('This size already exists.', 'error');
      return;
    }
    setSizeVariants((prev) => [...prev, { value: trimmed, stockQty: 0, priceModifier: 0 }]);
    setNewSizeValue('');
  }, [newSizeValue, sizeVariants, showToast]);

  const addColorVariant = useCallback(() => {
    const trimmed = newColorValue.trim();
    if (!trimmed) return;
    if (colorVariants.some((v) => v.value.toLowerCase() === trimmed.toLowerCase())) {
      showToast('This color already exists.', 'error');
      return;
    }
    setColorVariants((prev) => [...prev, { value: trimmed, stockQty: 0, priceModifier: 0 }]);
    setNewColorValue('');
  }, [newColorValue, colorVariants, showToast]);

  const updateSizeVariant = useCallback(
    (index: number, field: keyof Omit<VariantEntry, 'id' | 'value'>, raw: string) => {
      setSizeVariants((prev) =>
        prev.map((v, i) => (i === index ? { ...v, [field]: raw === '' ? 0 : Number(raw) } : v)),
      );
    },
    [],
  );

  const updateColorVariant = useCallback(
    (index: number, field: keyof Omit<VariantEntry, 'id' | 'value'>, raw: string) => {
      setColorVariants((prev) =>
        prev.map((v, i) => (i === index ? { ...v, [field]: raw === '' ? 0 : Number(raw) } : v)),
      );
    },
    [],
  );

  const removeSizeVariant = useCallback((index: number) => {
    setSizeVariants((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeColorVariant = useCallback((index: number) => {
    setColorVariants((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const next: FormErrors = {};
    if (!nameEn.trim()) next.nameEn = 'Product name (English) is required.';
    if (!categoryId) next.categoryId = 'Please select a category.';
    if (!slug.trim()) next.slug = 'Slug is required.';
    const bp = parseFloat(basePrice);
    if (isNaN(bp) || bp <= 0) next.basePrice = 'Base price must be greater than 0.';
        const sq = parseInt(stockQty, 10);
    if (isNaN(sq) || sq < 0) next.stockQty = 'Stock quantity cannot be negative.';
    if (isFlashDeal && flashDealEndsAt && new Date(flashDealEndsAt) <= new Date()) {
      next.flashDealEndsAt = 'Flash deal end time must be in the future.';
    }
    if (isFlashDeal && !flashDealEndsAt) {
      next.flashDealEndsAt = 'Flash deal end time is required when flash deal is enabled.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [nameEn, categoryId, slug, basePrice, stockQty]);

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setIsSubmitting(true);

      const allVariants = [
        ...sizeVariants.map((v) => ({ ...v, type: 'size' })),
        ...colorVariants.map((v) => ({ ...v, type: 'color' })),
      ];

      const payload = {
        nameEn: nameEn.trim(),
        nameBn: nameBn.trim(),
        slug: slug.trim(),
        categoryId,
        descriptionEn: descriptionEn.trim() || null,
        descriptionBn: descriptionBn.trim() || null,
        basePrice: parseFloat(basePrice),
        salePrice: salePrice.trim() ? parseFloat(salePrice) : null,
        costPrice: costPrice.trim() ? parseFloat(costPrice) : null,
        stockQty: parseInt(stockQty, 10),
        lowStockThreshold: parseInt(lowStockThreshold, 10),
        isFeatured,
        isFlashDeal,
        flashDealEndsAt: isFlashDeal && flashDealEndsAt ? new Date(flashDealEndsAt).toISOString() : null,
        isActive,
        images,
        variants: allVariants,
      };

      try {
        const url = isEditMode
          ? `/api/products/${initialData!.id}`
          : '/api/products';
        const method = isEditMode ? 'PATCH' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json() as { error?: string };

        if (!res.ok) {
          if (res.status === 409) {
            setErrors((prev) => ({ ...prev, slug: 'This slug is already taken.' }));
            showToast('Slug already in use — please choose a different one.', 'error');
          } else {
            showToast(json.error ?? 'Failed to save product.', 'error');
          }
          return;
        }

        showToast(
          isEditMode ? 'Product updated successfully.' : 'Product created successfully.',
          'success',
        );
        onSave();
      } catch {
        showToast('An unexpected error occurred.', 'error');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      validate, nameEn, nameBn, slug, categoryId, descriptionEn, descriptionBn,
      basePrice, salePrice, costPrice, stockQty, lowStockThreshold, isFeatured,
      isFlashDeal, flashDealEndsAt, isActive, images, sizeVariants, colorVariants,
      isEditMode, initialData, showToast, onSave,
    ],
  );

  // ── Print QR ─────────────────────────────────────────────────────────────────
  const handlePrintQR = useCallback(() => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>QR Code — ${nameEn}</title></head>
      <body style="display:flex;flex-direction:column;align-items:center;padding:32px;font-family:sans-serif;">
        <h2>${nameEn}</h2>
        <img src="/api/qrcode/${initialData!.id}" width="300" height="300" alt="QR Code" />
        <p style="margin-top:12px;font-size:12px;color:#555;">${window.location.origin}/products/${slug}</p>
        <script>window.onload=()=>{window.print();}<\/script>
      </body></html>
    `);
    win.document.close();
  }, [initialData, nameEn, slug]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8 max-w-4xl">

      {/* ── Basic Info ── */}
      <section>
        <h3 className={SECTION_HEADING}>Basic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Name EN */}
          <div>
            <label htmlFor="nameEn" className={LABEL}>
              Product Name (English) <span className="text-red-500">*</span>
            </label>
            <input
              id="nameEn"
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Silk Georgette Saree"
              className={INPUT}
            />
            {errors.nameEn && <p className="mt-1 text-xs text-red-500">{errors.nameEn}</p>}
          </div>

          {/* Name BN */}
          <div>
            <label htmlFor="nameBn" className={LABEL}>
              Product Name (Bengali)
            </label>
            <input
              id="nameBn"
              type="text"
              value={nameBn}
              onChange={(e) => setNameBn(e.target.value)}
              placeholder="যেমন: সিল্ক জর্জেট শাড়ি"
              className={INPUT}
            />
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className={LABEL}>
              URL Slug <span className="text-red-500">*</span>
            </label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugManuallyEdited(true);
                setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
              }}
              placeholder="silk-georgette-saree"
              className={INPUT}
            />
            {errors.slug && <p className="mt-1 text-xs text-red-500">{errors.slug}</p>}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="categoryId" className={LABEL}>
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="categoryId"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={INPUT}
            >
              <option value="">Select a category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nameEn}</option>
              ))}
            </select>
            {errors.categoryId && <p className="mt-1 text-xs text-red-500">{errors.categoryId}</p>}
          </div>
        </div>
      </section>

      {/* ── Descriptions ── */}
      <section>
        <h3 className={SECTION_HEADING}>Descriptions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="descriptionEn" className={LABEL}>Description (English)</label>
            <textarea
              id="descriptionEn"
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              rows={4}
              placeholder="Describe the product in English…"
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="descriptionBn" className={LABEL}>Description (Bengali)</label>
            <textarea
              id="descriptionBn"
              value={descriptionBn}
              onChange={(e) => setDescriptionBn(e.target.value)}
              rows={4}
              placeholder="পণ্যের বিবরণ লিখুন…"
              className={INPUT}
            />
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section>
        <h3 className={SECTION_HEADING}>Pricing</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="basePrice" className={LABEL}>
              Base Price (BDT) <span className="text-red-500">*</span>
            </label>
            <input
              id="basePrice"
              type="number"
              min="0"
              step="0.01"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="0.00"
              className={INPUT}
            />
            {errors.basePrice && <p className="mt-1 text-xs text-red-500">{errors.basePrice}</p>}
          </div>
          <div>
            <label htmlFor="salePrice" className={LABEL}>Sale Price (BDT)</label>
            <input
              id="salePrice"
              type="number"
              min="0"
              step="0.01"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="Optional"
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="costPrice" className={LABEL}>Cost Price (BDT)</label>
            <input
              id="costPrice"
              type="number"
              min="0"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="Optional"
              className={INPUT}
            />
          </div>
        </div>
      </section>

      {/* ── Inventory ── */}
      <section>
        <h3 className={SECTION_HEADING}>Inventory</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="stockQty" className={LABEL}>
              Stock Quantity <span className="text-red-500">*</span>
            </label>
            <input
              id="stockQty"
              type="number"
              min="0"
              step="1"
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
              className={INPUT}
            />
            {errors.stockQty && <p className="mt-1 text-xs text-red-500">{errors.stockQty}</p>}
          </div>
          <div>
            <label htmlFor="lowStockThreshold" className={LABEL}>Low Stock Alert Threshold</label>
            <input
              id="lowStockThreshold"
              type="number"
              min="0"
              step="1"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              className={INPUT}
            />
          </div>
        </div>
      </section>

      {/* ── Flags ── */}
      <section>
        <h3 className={SECTION_HEADING}>Product Flags</h3>
        <div className="flex flex-wrap gap-6">
          {(
            [
              { id: 'isActive', label: 'Active (visible on storefront)', value: isActive, setter: setIsActive },
              { id: 'isFeatured', label: 'Featured product', value: isFeatured, setter: setIsFeatured },
              { id: 'isFlashDeal', label: 'Flash deal', value: isFlashDeal, setter: setIsFlashDeal },
            ] as const
          ).map(({ id, label, value, setter }) => (
            <label key={id} htmlFor={id} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id={id}
                type="checkbox"
                checked={value}
                onChange={(e) => (setter as React.Dispatch<React.SetStateAction<boolean>>)(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-primary"
              />
              <span className="text-sm text-brand-text">{label}</span>
            </label>
          ))}
        </div>

                {isFlashDeal && (
          <div className="mt-4 max-w-xs">
            <label htmlFor="flashDealEndsAt" className={LABEL}>Flash Deal Ends At</label>
            <input
              id="flashDealEndsAt"
              type="datetime-local"
              value={flashDealEndsAt}
              onChange={(e) => setFlashDealEndsAt(e.target.value)}
              className={INPUT}
            />
            {errors.flashDealEndsAt && (
              <p className="mt-1 text-xs text-red-500">{errors.flashDealEndsAt}</p>
            )}
          </div>
        )}
      </section>

      {/* ── Images ── */}
      <section>
        <h3 className={SECTION_HEADING}>Product Images</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          {images.map((img, index) => (
            <div key={img.cloudinaryId + index} className="relative group">
              {/* Render via ImageUpload in preview mode */}
              <ImageUpload
                folder="products"
                currentUrl={img.url}
                onUpload={(url) => {
                  if (!url) handleRemoveImage(index);
                }}
              />
              {img.isDefault && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-brand-primary text-white px-1.5 py-0.5 rounded-full">
                  Default
                </span>
              )}
              {!img.isDefault && (
                <button
                  type="button"
                  onClick={() => handleSetDefault(index)}
                  className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Set default
                </button>
              )}
            </div>
          ))}

          <ImageUpload
            folder="products"
            onUpload={handleImageUpload}
            className="w-32"
          />
        </div>
        <p className="text-xs text-brand-text/50">
          First image is the default. Hover an image and click "Set default" to change. Max 5 MB per image.
        </p>
      </section>

      {/* ── Size Variants ── */}
      <section>
        <h3 className={SECTION_HEADING}>Size Variants</h3>

        {sizeVariants.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="grid grid-cols-[1fr_100px_120px_32px] gap-2 text-xs font-medium text-brand-text/60 px-1">
              <span>Size</span>
              <span>Stock</span>
              <span>Price Modifier (BDT)</span>
              <span />
            </div>
            {sizeVariants.map((variant, index) => (
              <div key={index} className="grid grid-cols-[1fr_100px_120px_32px] gap-2 items-center">
                <span className="text-sm font-medium text-brand-text px-3 py-2 bg-brand-bg rounded-xl">
                  {variant.value}
                </span>
                <input
                  type="number"
                  min="0"
                  value={variant.stockQty}
                  onChange={(e) => updateSizeVariant(index, 'stockQty', e.target.value)}
                  className={INPUT}
                />
                <input
                  type="number"
                  step="0.01"
                  value={variant.priceModifier}
                  onChange={(e) => updateSizeVariant(index, 'priceModifier', e.target.value)}
                  placeholder="+0.00"
                  className={INPUT}
                />
                <button
                  type="button"
                  onClick={() => removeSizeVariant(index)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  aria-label={`Remove size ${variant.value}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 max-w-xs">
          <input
            type="text"
            value={newSizeValue}
            onChange={(e) => setNewSizeValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSizeVariant())}
            placeholder="e.g. S, M, L, XL"
            className={INPUT}
          />
          <Button type="button" variant="secondary" size="sm" onClick={addSizeVariant} leftIcon={<Plus size={14} />}>
            Add
          </Button>
        </div>
      </section>

      {/* ── Color Variants ── */}
      <section>
        <h3 className={SECTION_HEADING}>Color Variants</h3>

        {colorVariants.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="grid grid-cols-[1fr_100px_120px_32px] gap-2 text-xs font-medium text-brand-text/60 px-1">
              <span>Color</span>
              <span>Stock</span>
              <span>Price Modifier (BDT)</span>
              <span />
            </div>
            {colorVariants.map((variant, index) => (
              <div key={index} className="grid grid-cols-[1fr_100px_120px_32px] gap-2 items-center">
                <div className="flex items-center gap-2 px-3 py-2 bg-brand-bg rounded-xl">
                  <span
                    className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: variant.value }}
                  />
                  <span className="text-sm font-medium text-brand-text">{variant.value}</span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={variant.stockQty}
                  onChange={(e) => updateColorVariant(index, 'stockQty', e.target.value)}
                  className={INPUT}
                />
                <input
                  type="number"
                  step="0.01"
                  value={variant.priceModifier}
                  onChange={(e) => updateColorVariant(index, 'priceModifier', e.target.value)}
                  placeholder="+0.00"
                  className={INPUT}
                />
                <button
                  type="button"
                  onClick={() => removeColorVariant(index)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  aria-label={`Remove color ${variant.value}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 max-w-xs">
          <input
            type="text"
            value={newColorValue}
            onChange={(e) => setNewColorValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColorVariant())}
            placeholder="e.g. Red, #1B5E20, Navy"
            className={INPUT}
          />
          <Button type="button" variant="secondary" size="sm" onClick={addColorVariant} leftIcon={<Plus size={14} />}>
            Add
          </Button>
        </div>
      </section>

      {/* ── QR Code (edit mode only) ── */}
      {isEditMode && initialData?.id && (
        <section>
          <h3 className={SECTION_HEADING}>QR Code</h3>
          <div className="flex items-start gap-6">
            <div className="p-3 bg-white border border-brand-secondary/20 rounded-xl inline-block qr-print-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qrcode/${initialData.id}`}
                alt="Product QR Code"
                width={128}
                height={128}
                className="block print-target"
              />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm text-brand-text/70">
                Scan to open this product on the storefront. Print and attach to physical packaging or display.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handlePrintQR}
                leftIcon={<Printer size={14} />}
              >
                Print QR Code
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ── Submit ── */}
      <div className="flex items-center gap-3 pt-2 border-t border-brand-secondary/20">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          leftIcon={!isSubmitting ? <QrCode size={16} /> : undefined}
        >
          {isEditMode ? 'Save Changes' : 'Create Product'}
        </Button>
        <p className="text-xs text-brand-text/50">
          <span className="text-red-500">*</span> Required fields
        </p>
      </div>

    </form>
  );
};