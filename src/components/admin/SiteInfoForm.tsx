// src/components/admin/SiteInfoForm.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Facebook,
  Instagram,
  Video,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useToast } from '@/context/ToastContext';
import type { SiteConfigMap } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SiteInfoFormProps {
  initialConfig: SiteConfigMap;
}

interface FormState {
  storeName: string;
  logo: string;
  logoPublicId: string;
  favicon: string;
  faviconPublicId: string;
  descriptionEn: string;
  descriptionBn: string;
  email: string;
  whatsapp: string;
  phone: string;
  address: string;
  facebook: string;
  instagram: string;
  tiktok: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WHATSAPP_REGEX = /^01[3-9]\d{8}$/;

/**
 * Extracts all SiteInfoForm-relevant keys from a SiteConfigMap into a
 * strongly-typed FormState, falling back to empty strings for missing keys.
 */
function configToFormState(config: SiteConfigMap): FormState {
  return {
    storeName:      config['contact.storeName']     ?? '',
    logo:           config['contact.logo']          ?? '',
    logoPublicId:   config['contact.logoPublicId']  ?? '',
    favicon:        config['contact.favicon']       ?? '',
    faviconPublicId:config['contact.faviconPublicId'] ?? '',
    descriptionEn:  config['contact.descriptionEn'] ?? '',
    descriptionBn:  config['contact.descriptionBn'] ?? '',
    email:          config['contact.email']         ?? '',
    whatsapp:       config['contact.whatsapp']      ?? '',
    phone:          config['contact.phone']         ?? '',
    address:        config['contact.address']       ?? '',
    facebook:       config['social.facebook']       ?? '',
    instagram:      config['social.instagram']      ?? '',
    tiktok:         config['social.tiktok']         ?? '',
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, htmlFor, hint, error, required, children }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={htmlFor} className="text-sm font-medium text-brand-text">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && !error && (
      <p className="text-xs text-brand-text/50">{hint}</p>
    )}
    {error && (
      <p role="alert" className="text-xs text-red-500">{error}</p>
    )}
  </div>
);

interface SectionHeadingProps {
  icon: React.ReactNode;
  title: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ icon, title }) => (
  <div className="flex items-center gap-2 pb-2 border-b border-brand-secondary/20 mb-4">
    <span className="text-brand-primary">{icon}</span>
    <h3 className="text-base font-semibold text-brand-text">{title}</h3>
  </div>
);

const inputClass =
  'w-full rounded-lg border border-brand-secondary/30 bg-brand-surface px-3 py-2 text-sm text-brand-text ' +
  'placeholder:text-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 ' +
  'focus:border-brand-primary transition-colors';

const textareaClass =
  inputClass + ' resize-y min-h-[80px]';

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * Admin form for editing store identity, contact details, and social media links.
 * Reads initial values from SiteConfigMap and PATCHes /api/site-config on save.
 * @param initialConfig - Full SiteConfigMap from the server.
 * @returns A controlled form with sections for branding, contact, and social links.
 */
export const SiteInfoForm: React.FC<SiteInfoFormProps> = ({ initialConfig }) => {
    const { showToast } = useToast();
  const router = useRouter();

  const [form, setForm] = useState<FormState>(() => configToFormState(initialConfig));
  const [whatsappError, setWhatsappError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // ── Field updater ────────────────────────────────────────────────────────────

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setField(name as keyof FormState, value);
      if (name === 'whatsapp') {
        setWhatsappError('');
      }
    },
    [setField],
  );

  // ── Image upload callbacks ────────────────────────────────────────────────────

  const handleLogoUpload = useCallback(
    (url: string, publicId: string) => {
      setField('logo', url);
      setField('logoPublicId', publicId);
    },
    [setField],
  );

  const handleFaviconUpload = useCallback(
    (url: string, publicId: string) => {
      setField('favicon', url);
      setField('faviconPublicId', publicId);
    },
    [setField],
  );

  // ── Validation ───────────────────────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    if (form.whatsapp && !WHATSAPP_REGEX.test(form.whatsapp)) {
      setWhatsappError('Must be 11 digits starting with 013–019 (e.g. 01712345678).');
      return false;
    }
    return true;
  }, [form.whatsapp]);

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const payload: Record<string, string> = {
        'contact.storeName':      form.storeName,
        'contact.logo':           form.logo,
        'contact.logoPublicId':   form.logoPublicId,
        'contact.favicon':        form.favicon,
        'contact.faviconPublicId':form.faviconPublicId,
        'contact.descriptionEn':  form.descriptionEn,
        'contact.descriptionBn':  form.descriptionBn,
        'contact.email':          form.email,
        'contact.whatsapp':       form.whatsapp,
        'contact.phone':          form.phone,
        'contact.address':        form.address,
        'social.facebook':        form.facebook,
        'social.instagram':       form.instagram,
        'social.tiktok':          form.tiktok,
      };

      const res = await fetch('/api/site-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? `Server error ${res.status}`);
      }

            showToast('Settings saved', 'success');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings.';
      showToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [form, validate, showToast]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-8 max-w-2xl">

      {/* ── Branding ──────────────────────────────────────────────────────────── */}
      <section>
        <SectionHeading icon={<Store size={18} />} title="Store Branding" />

        <div className="flex flex-col gap-5">

          {/* Store Name */}
          <Field label="Store Name" htmlFor="storeName" required>
            <input
              id="storeName"
              name="storeName"
              type="text"
              value={form.storeName}
              onChange={handleChange}
              placeholder="My Eid Store"
              className={inputClass}
            />
          </Field>

          {/* Logo */}
          <Field
            label="Store Logo"
            htmlFor="logo"
            hint="Recommended: square PNG or SVG, at least 256 × 256 px."
          >
            <div className="flex items-start gap-4">
              <ImageUpload
                folder="logos"
                currentUrl={form.logo || undefined}
                onUpload={handleLogoUpload}
                className="flex-shrink-0"
              />
              {!form.logo && (
                <div className="flex items-center justify-center w-32 h-32 rounded-xl border-2 border-dashed border-brand-secondary/30 bg-brand-surface text-brand-text/30">
                  <ImageIcon size={32} strokeWidth={1.5} />
                </div>
              )}
            </div>
          </Field>

          {/* Favicon */}
          <Field
            label="Favicon"
            htmlFor="favicon"
            hint="Recommended: square PNG, 32 × 32 px or 64 × 64 px."
          >
            <ImageUpload
              folder="favicons"
              currentUrl={form.favicon || undefined}
              onUpload={handleFaviconUpload}
            />
          </Field>

          {/* Description (EN) */}
          <Field label="Store Description (English)" htmlFor="descriptionEn">
            <textarea
              id="descriptionEn"
              name="descriptionEn"
              value={form.descriptionEn}
              onChange={handleChange}
              placeholder="A short description of your store…"
              className={textareaClass}
            />
          </Field>

          {/* Description (BN) */}
          <Field label="স্টোরের বিবরণ (বাংলা)" htmlFor="descriptionBn">
            <textarea
              id="descriptionBn"
              name="descriptionBn"
              value={form.descriptionBn}
              onChange={handleChange}
              placeholder="আপনার স্টোরের সংক্ষিপ্ত বিবরণ…"
              className={textareaClass}
            />
          </Field>
        </div>
      </section>

      {/* ── Contact ───────────────────────────────────────────────────────────── */}
      <section>
        <SectionHeading icon={<Phone size={18} />} title="Contact Details" />

        <div className="flex flex-col gap-5">

          {/* Email */}
          <Field label="Contact Email" htmlFor="email">
            <div className="relative">
              <Mail
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/40 pointer-events-none"
              />
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="hello@mystore.com"
                className={inputClass + ' pl-9'}
              />
            </div>
          </Field>

          {/* WhatsApp */}
          <Field
            label="WhatsApp Number"
            htmlFor="whatsapp"
            hint="e.g. 01712345678 — used for the floating WhatsApp button."
            error={whatsappError}
          >
            <div className="relative">
              <MessageCircle
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/40 pointer-events-none"
              />
              <input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                value={form.whatsapp}
                onChange={handleChange}
                onBlur={() => {
                  if (form.whatsapp && !WHATSAPP_REGEX.test(form.whatsapp)) {
                    setWhatsappError('Must be 11 digits starting with 013–019 (e.g. 01712345678).');
                  }
                }}
                placeholder="01712345678"
                maxLength={11}
                className={
                  inputClass +
                  ' pl-9' +
                  (whatsappError ? ' border-red-400 focus:ring-red-400/50' : '')
                }
              />
            </div>
          </Field>

          {/* Phone */}
          <Field label="Phone Number" htmlFor="phone">
            <div className="relative">
              <Phone
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/40 pointer-events-none"
              />
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="01812345678"
                className={inputClass + ' pl-9'}
              />
            </div>
          </Field>

          {/* Address */}
          <Field label="Store Address" htmlFor="address">
            <div className="relative">
              <MapPin
                size={15}
                className="absolute left-3 top-3 text-brand-text/40 pointer-events-none"
              />
              <textarea
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="123 Example Road, Dhaka 1200"
                className={textareaClass + ' pl-9'}
                rows={3}
              />
            </div>
          </Field>
        </div>
      </section>

      {/* ── Social Media ──────────────────────────────────────────────────────── */}
      <section>
        <SectionHeading icon={<Facebook size={18} />} title="Social Media" />

        <div className="flex flex-col gap-5">

          {/* Facebook */}
          <Field label="Facebook Page URL" htmlFor="facebook">
            <div className="relative">
              <Facebook
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/40 pointer-events-none"
              />
              <input
                id="facebook"
                name="facebook"
                type="url"
                value={form.facebook}
                onChange={handleChange}
                placeholder="https://facebook.com/yourpage"
                className={inputClass + ' pl-9'}
              />
            </div>
          </Field>

          {/* Instagram */}
          <Field label="Instagram Profile URL" htmlFor="instagram">
            <div className="relative">
              <Instagram
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/40 pointer-events-none"
              />
              <input
                id="instagram"
                name="instagram"
                type="url"
                value={form.instagram}
                onChange={handleChange}
                placeholder="https://instagram.com/yourhandle"
                className={inputClass + ' pl-9'}
              />
            </div>
          </Field>

          {/* TikTok */}
          <Field label="TikTok Profile URL" htmlFor="tiktok">
            <div className="relative">
              <Video
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/40 pointer-events-none"
              />
              <input
                id="tiktok"
                name="tiktok"
                type="url"
                value={form.tiktok}
                onChange={handleChange}
                placeholder="https://tiktok.com/@yourhandle"
                className={inputClass + ' pl-9'}
              />
            </div>
          </Field>
        </div>
      </section>

      {/* ── Save Button ───────────────────────────────────────────────────────── */}
      <div className="flex justify-end pt-2 border-t border-brand-secondary/20">
        <Button
          variant="primary"
          size="md"
          isLoading={isSaving}
          onClick={handleSave}
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
};