// src/components/admin/BlogPostForm.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import type { BlogPost } from '@prisma/client';
import { FileText, Globe, AlignLeft, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useToast } from '@/context/ToastContext';
import { slugify, cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BlogPostFormProps {
  /** Existing post data for edit mode; omit for create mode. */
  initialData?: BlogPost;
  /** Called after a successful save so the parent can close a modal or refresh. */
  onSave: () => void;
}

interface FormState {
  titleEn: string;
  titleBn: string;
  slug: string;
  excerptEn: string;
  excerptBn: string;
  bodyEn: string;
  bodyBn: string;
  thumbnailUrl: string;
  thumbnailCloudinaryId: string;
  isPublished: boolean;
}

interface FormErrors {
  titleEn?: string;
  slug?: string;
  bodyEn?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Builds the initial form state, falling back to empty strings for create mode.
 * @param initialData - Existing BlogPost row from Prisma, or undefined for create.
 * @returns A fully-populated FormState object.
 */
function buildInitialState(initialData?: BlogPost): FormState {
  return {
    titleEn: initialData?.titleEn ?? '',
    titleBn: initialData?.titleBn ?? '',
    slug: initialData?.slug ?? '',
    excerptEn: initialData?.excerptEn ?? '',
    excerptBn: initialData?.excerptBn ?? '',
    bodyEn: initialData?.bodyEn ?? '',
    bodyBn: initialData?.bodyBn ?? '',
    thumbnailUrl: initialData?.thumbnailUrl ?? '',
    thumbnailCloudinaryId: initialData?.cloudinaryId ?? '',
    isPublished: initialData?.isPublished ?? false,
  };
}

/**
 * Validates the form state and returns an error map.
 * @param form - Current form state.
 * @returns An object containing field-level error messages (empty if valid).
 */
function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.titleEn.trim()) {
    errors.titleEn = 'English title is required.';
  }
  if (!form.slug.trim()) {
    errors.slug = 'Slug is required.';
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
    errors.slug = 'Slug may only contain lowercase letters, numbers, and hyphens.';
  }
  if (!form.bodyEn.trim() || form.bodyEn.trim().length < 10) {
    errors.bodyEn = 'English body must be at least 10 characters.';
  }
  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Admin blog post creation and editing form with bilingual content fields,
 * auto-generated slugs, thumbnail upload, and a publish toggle.
 * POSTs to /api/blog on create or PATCHes /api/blog/[slug] on update.
 * @param initialData - Existing BlogPost for edit mode; omit for create mode.
 * @param onSave - Callback invoked after a successful API save.
 * @returns The complete blog post form UI.
 */
export const BlogPostForm: React.FC<BlogPostFormProps> = ({ initialData, onSave }) => {
  const { showToast } = useToast();
  const isEditMode = Boolean(initialData?.id);

  const [form, setForm] = useState<FormState>(() => buildInitialState(initialData));
  const [errors, setErrors] = useState<FormErrors>({});
  const [slugManuallyEdited, setSlugManuallyEdited] = useState<boolean>(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeLang, setActiveLang] = useState<'en' | 'bn'>('en');

  // Sync form if initialData changes (e.g. modal re-opened with different post)
  useEffect(() => {
    setForm(buildInitialState(initialData));
    setSlugManuallyEdited(Boolean(initialData?.id));
    setErrors({});
  }, [initialData]);

  // ── Field Handlers ───────────────────────────────────────────────────────

  const handleTitleEnChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm((prev) => ({
        ...prev,
        titleEn: value,
        // Auto-update slug only if the user has not manually edited it
        slug: slugManuallyEdited ? prev.slug : slugify(value),
      }));
      if (errors.titleEn) setErrors((prev) => ({ ...prev, titleEn: undefined }));
    },
    [slugManuallyEdited, errors.titleEn],
  );

  const handleSlugChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSlugManuallyEdited(true);
      setForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }));
      if (errors.slug) setErrors((prev) => ({ ...prev, slug: undefined }));
    },
    [errors.slug],
  );

  const handleSlugBlur = useCallback(() => {
    // Normalise slug on blur to strip invalid chars
    setForm((prev) => ({ ...prev, slug: slugify(prev.slug) || slugify(prev.titleEn) }));
  }, []);

  const handleChange = useCallback(
    <K extends keyof FormState>(field: K) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value =
          e.target.type === 'checkbox'
            ? (e.target as HTMLInputElement).checked
            : e.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
        if (field === 'bodyEn' && errors.bodyEn) {
          setErrors((prev) => ({ ...prev, bodyEn: undefined }));
        }
      },
    [errors.bodyEn],
  );

  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, isPublished: e.target.checked }));
    },
    [],
  );

  const handleThumbnailUpload = useCallback((url: string, publicId: string) => {
    setForm((prev) => ({
      ...prev,
      thumbnailUrl: url,
      thumbnailCloudinaryId: publicId,
    }));
  }, []);

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const validationErrors = validate(form);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setIsSubmitting(true);
      try {
        const payload = {
          titleEn: form.titleEn.trim(),
          titleBn: form.titleBn.trim() || null,
          slug: form.slug.trim(),
          excerptEn: form.excerptEn.trim() || null,
          excerptBn: form.excerptBn.trim() || null,
          bodyEn: form.bodyEn.trim(),
          bodyBn: form.bodyBn.trim() || null,
          thumbnailUrl: form.thumbnailUrl || null,
          cloudinaryId: form.thumbnailCloudinaryId || null,
          isPublished: form.isPublished,
        };

        const url = isEditMode
          ? `/api/blog/${initialData!.slug}`
          : '/api/blog';

        const response = await fetch(url, {
          method: isEditMode ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const json = (await response.json()) as { error?: string };
          throw new Error(json.error ?? `Request failed with status ${response.status}`);
        }

        showToast(
          isEditMode ? 'Blog post updated successfully.' : 'Blog post created successfully.',
          'success',
        );
        onSave();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred.';
        showToast(message, 'error');
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, isEditMode, initialData, showToast, onSave],
  );

  // ── Section Label Helper ─────────────────────────────────────────────────

  const SectionLabel: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-brand-primary">{icon}</span>
      <h3 className="text-sm font-semibold text-brand-text uppercase tracking-wide">{text}</h3>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">

      {/* ── Language Tab Switcher ── */}
      <div className="flex gap-1 p-1 bg-brand-bg rounded-xl w-fit">
        {(['en', 'bn'] as const).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setActiveLang(lang)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeLang === lang
                ? 'bg-brand-surface text-brand-primary shadow-sm'
                : 'text-brand-text/60 hover:text-brand-text',
            )}
          >
            {lang === 'en' ? 'English' : 'বাংলা'}
          </button>
        ))}
      </div>

      {/* ── Title Fields ── */}
      <div className="space-y-4">
        <SectionLabel icon={<FileText size={16} />} text="Title" />

        {/* English title — always shown */}
        <div>
          <label htmlFor="titleEn" className="block text-sm font-medium text-brand-text mb-1">
            Title (English) <span className="text-red-500">*</span>
          </label>
          <input
            id="titleEn"
            type="text"
            value={form.titleEn}
            onChange={handleTitleEnChange}
            placeholder="Enter blog post title in English"
            className={cn(
              'input-base w-full',
              errors.titleEn && 'border-red-500 focus:ring-red-500',
            )}
          />
          {errors.titleEn && (
            <p role="alert" className="mt-1 text-xs text-red-500">{errors.titleEn}</p>
          )}
        </div>

        {/* Bengali title — shown when bn tab active */}
        {activeLang === 'bn' && (
          <div>
            <label htmlFor="titleBn" className="block text-sm font-medium text-brand-text mb-1">
              শিরোনাম (বাংলা)
              <span className="ml-1 text-xs text-brand-text/40 font-normal">(optional)</span>
            </label>
            <input
              id="titleBn"
              type="text"
              value={form.titleBn}
              onChange={handleChange('titleBn')}
              placeholder="বাংলায় শিরোনাম লিখুন"
              className="input-base w-full"
              dir="auto"
            />
          </div>
        )}
      </div>

      {/* ── Slug ── */}
      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-brand-text mb-1">
          URL Slug <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-brand-text/40 shrink-0">/blog/</span>
          <input
            id="slug"
            type="text"
            value={form.slug}
            onChange={handleSlugChange}
            onBlur={handleSlugBlur}
            placeholder="my-blog-post-slug"
            className={cn(
              'input-base flex-1',
              errors.slug && 'border-red-500 focus:ring-red-500',
            )}
          />
        </div>
        {errors.slug ? (
          <p role="alert" className="mt-1 text-xs text-red-500">{errors.slug}</p>
        ) : (
          <p className="mt-1 text-xs text-brand-text/40">
            Auto-generated from title. Edit to customise.
          </p>
        )}
      </div>

      {/* ── Excerpt ── */}
      <div className="space-y-4">
        <SectionLabel icon={<AlignLeft size={16} />} text="Excerpt" />

        {activeLang === 'en' && (
          <div>
            <label htmlFor="excerptEn" className="block text-sm font-medium text-brand-text mb-1">
              Excerpt (English)
              <span className="ml-1 text-xs text-brand-text/40 font-normal">(optional)</span>
            </label>
            <textarea
              id="excerptEn"
              value={form.excerptEn}
              onChange={handleChange('excerptEn')}
              rows={2}
              placeholder="A brief summary shown on the blog listing page…"
              className="input-base w-full resize-y"
            />
          </div>
        )}

        {activeLang === 'bn' && (
          <div>
            <label htmlFor="excerptBn" className="block text-sm font-medium text-brand-text mb-1">
              সারসংক্ষেপ (বাংলা)
              <span className="ml-1 text-xs text-brand-text/40 font-normal">(optional)</span>
            </label>
            <textarea
              id="excerptBn"
              value={form.excerptBn}
              onChange={handleChange('excerptBn')}
              rows={2}
              placeholder="বাংলায় সংক্ষিপ্ত বিবরণ লিখুন…"
              className="input-base w-full resize-y"
              dir="auto"
            />
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="space-y-4">
        <SectionLabel icon={<Globe size={16} />} text="Body Content" />

        {activeLang === 'en' && (
          <div>
            <label htmlFor="bodyEn" className="block text-sm font-medium text-brand-text mb-1">
              Body (English) <span className="text-red-500">*</span>
            </label>
            <textarea
              id="bodyEn"
              value={form.bodyEn}
              onChange={handleChange('bodyEn')}
              rows={12}
              placeholder="Write your blog post content here…"
              className={cn(
                'input-base w-full resize-y font-mono text-sm',
                errors.bodyEn && 'border-red-500 focus:ring-red-500',
              )}
            />
            {errors.bodyEn ? (
              <p role="alert" className="mt-1 text-xs text-red-500">{errors.bodyEn}</p>
            ) : (
              <p className="mt-1 text-xs text-brand-text/40">
                Supports Markdown: <code className="bg-brand-bg px-1 rounded">**bold**</code>,{' '}
                <code className="bg-brand-bg px-1 rounded">*italic*</code>,{' '}
                <code className="bg-brand-bg px-1 rounded">## heading</code>,{' '}
                <code className="bg-brand-bg px-1 rounded">- list</code>
              </p>
            )}
          </div>
        )}

        {activeLang === 'bn' && (
          <div>
            <label htmlFor="bodyBn" className="block text-sm font-medium text-brand-text mb-1">
              মূল বিষয়বস্তু (বাংলা)
              <span className="ml-1 text-xs text-brand-text/40 font-normal">(optional)</span>
            </label>
            <textarea
              id="bodyBn"
              value={form.bodyBn}
              onChange={handleChange('bodyBn')}
              rows={12}
              placeholder="বাংলায় পোস্টের মূল বিষয়বস্তু লিখুন…"
              className="input-base w-full resize-y font-mono text-sm"
              dir="auto"
            />
            <p className="mt-1 text-xs text-brand-text/40">
              Supports Markdown: <code className="bg-brand-bg px-1 rounded">**bold**</code>,{' '}
              <code className="bg-brand-bg px-1 rounded">*italic*</code>,{' '}
              <code className="bg-brand-bg px-1 rounded">## heading</code>,{' '}
              <code className="bg-brand-bg px-1 rounded">- list</code>
            </p>
          </div>
        )}
      </div>

      {/* ── Thumbnail ── */}
      <div>
        <SectionLabel icon={<ImageIcon size={16} />} text="Thumbnail Image" />
        <ImageUpload
          folder="blog-thumbnails"
          currentUrl={form.thumbnailUrl || undefined}
          onUpload={handleThumbnailUpload}
          className="max-w-xs"
        />
        <p className="mt-1 text-xs text-brand-text/40">
          Recommended: 1200 × 630 px. Max 5 MB.
        </p>
      </div>

      {/* ── Publish Toggle ── */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-brand-secondary/20 bg-brand-bg">
        <label
          htmlFor="isPublished"
          className="flex items-center gap-3 cursor-pointer select-none flex-1"
        >
          <div className="relative">
            <input
              id="isPublished"
              type="checkbox"
              checked={form.isPublished}
              onChange={handleCheckboxChange}
              className="sr-only peer"
            />
            {/* Custom toggle track */}
            <div
              className={cn(
                'w-11 h-6 rounded-full transition-colors duration-200',
                form.isPublished ? 'bg-brand-primary' : 'bg-brand-secondary/30',
              )}
            />
            {/* Toggle thumb */}
            <div
              className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm',
                'transition-transform duration-200',
                form.isPublished ? 'translate-x-5' : 'translate-x-0',
              )}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-brand-text">
              Published (visible on storefront)
            </p>
            <p className="text-xs text-brand-text/40">
              {form.isPublished
                ? 'This post will appear on the blog listing page.'
                : 'This post is a draft and not visible to visitors.'}
            </p>
          </div>
        </label>
        {form.isPublished ? (
          <Eye size={18} className="text-brand-primary shrink-0" />
        ) : (
          <EyeOff size={18} className="text-brand-text/30 shrink-0" />
        )}
      </div>

      {/* ── Submit ── */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-brand-secondary/20">
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {isEditMode ? 'Save Changes' : 'Create Post'}
        </Button>
      </div>
    </form>
  );
};