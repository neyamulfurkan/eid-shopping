// src/components/layout/Footer.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, ExternalLink, Mail, Phone, MapPin } from 'lucide-react';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { useLanguage } from '@/context/LanguageContext';
import { getWhatsAppLink, cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface FooterLink {
  labelEn: string;
  labelBn: string;
  href: string;
}

// ─────────────────────────────────────────────
// WhatsApp SVG Icon
// ─────────────────────────────────────────────

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// ─────────────────────────────────────────────
// Payment Icons
// ─────────────────────────────────────────────

const BkashIcon: React.FC = () => (
  <span className="inline-flex items-center justify-center w-10 h-6 rounded bg-[#E2136E] text-white text-[9px] font-bold tracking-tight">
    bKash
  </span>
);

const NagadIcon: React.FC = () => (
  <span className="inline-flex items-center justify-center w-10 h-6 rounded bg-[#F04E23] text-white text-[9px] font-bold tracking-tight">
    Nagad
  </span>
);

const RocketIcon: React.FC = () => (
  <span className="inline-flex items-center justify-center w-10 h-6 rounded bg-[#8B1FA8] text-white text-[9px] font-bold tracking-tight">
    Rocket
  </span>
);

const CodIcon: React.FC = () => (
  <span className="inline-flex items-center justify-center w-10 h-6 rounded bg-brand-primary text-white text-[9px] font-bold tracking-tight">
    COD
  </span>
);

// ─────────────────────────────────────────────
// Helper: parse JSON footer link arrays safely
// ─────────────────────────────────────────────

/**
 * Parses a JSON string into a FooterLink array.
 * Returns an empty array on any parse error so the footer never crashes.
 * @param raw - Raw JSON string from SiteConfig.
 * @returns Array of FooterLink objects.
 */
function parseLinks(raw: string | undefined): FooterLink[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as FooterLink[];
    return [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
// Sub-component: Footer Nav Column
// ─────────────────────────────────────────────

interface FooterNavColumnProps {
  title: string;
  links: FooterLink[];
  lang: 'en' | 'bn';
}

const FooterNavColumn: React.FC<FooterNavColumnProps> = ({ title, links, lang }) => {
  if (links.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-primary mb-4">
        {title}
      </h3>
      <ul className="space-y-2">
        {links.map((link, idx) => (
          <li key={idx}>
            <Link
              href={link.href}
              className="text-sm text-brand-text/70 hover:text-brand-primary transition-colors duration-200"
            >
              {lang === 'bn' && link.labelBn ? link.labelBn : link.labelEn}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Footer Component
// ─────────────────────────────────────────────

/**
 * Site-wide footer with store branding, configurable navigation columns,
 * contact information, social links, payment icons, and a floating WhatsApp CTA.
 * All content is sourced from SiteConfigContext — no hardcoded strings.
 */
export const Footer: React.FC = () => {
  const config = useSiteConfig();
  const { lang, t } = useLanguage();

  // ── Destructure config values ──────────────────────────────────────────
  const storeName = config['contact.storeName'] || 'Eid Store';
  const logoUrl = config['contact.logo'] || '';
  const description =
    lang === 'bn'
      ? config['contact.descriptionBn'] || config['contact.descriptionEn'] || ''
      : config['contact.descriptionEn'] || '';
  const phone = config['contact.phone'] || '';
  const email = config['contact.email'] || '';
  const address = config['contact.address'] || '';
  const whatsapp = config['contact.whatsapp'] || '';
    const copyright =
    config['contact.copyright'] ||
    `© ${new Date().getFullYear()} ${storeName}. All rights reserved.`;

  const facebookUrl = config['social.facebook'] || '';
  const instagramUrl = config['social.instagram'] || '';
  const tiktokUrl = config['social.tiktok'] || '';

  const col1Links = parseLinks(config['footer.col1Links']);
  const col2Links = parseLinks(config['footer.col2Links']);

  const showBkash = Boolean(
    config['payment.bkashEnabled'] === 'true' && config['payment.bkashNumber'],
  );
  const showNagad = Boolean(
    config['payment.nagadEnabled'] === 'true' && config['payment.nagadNumber'],
  );
  const showRocket = Boolean(
    config['payment.rocketEnabled'] === 'true' && config['payment.rocketNumber'],
  );
  const showCod = config['payment.codEnabled'] === 'true';

  const hasPaymentIcons = showBkash || showNagad || showRocket || showCod;
  const hasSocial = Boolean(facebookUrl || instagramUrl || tiktokUrl);
  const hasContact = Boolean(phone || email || address);

  // ── WhatsApp deep link ─────────────────────────────────────────────────
  const whatsappHref = whatsapp
    ? getWhatsAppLink(whatsapp, t('msg.contactUs'))
    : '';

  // ── Column titles (language-aware) ─────────────────────────────────────
  const col1Title = lang === 'bn' ? 'দ্রুত লিংক' : 'Quick Links';
  const col2Title = lang === 'bn' ? 'তথ্য' : 'Information';
  const contactTitle = lang === 'bn' ? 'যোগাযোগ' : 'Contact';

  return (
    <>
      {/* ── Main Footer ─────────────────────────────────────────────────── */}
      <footer className="bg-brand-surface border-t border-brand-secondary/20 mt-auto">

        {/* Upper section */}
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">

            {/* ── Column 1: Branding + Social ───────────────────────────── */}
            <div className="space-y-4">

              {/* Logo / Store Name */}
              <Link href="/" className="inline-flex items-center gap-3 group">
                {logoUrl ? (
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <Image
                      src={logoUrl}
                      alt={storeName}
                      fill
                      className="object-contain"
                      sizes="40px"
                    />
                  </div>
                ) : null}
                <span className="text-xl font-bold text-brand-primary group-hover:text-brand-accent transition-colors duration-200">
                  {storeName}
                </span>
              </Link>

              {/* Description */}
              {description && (
                <p className="text-sm text-brand-text/70 leading-relaxed max-w-xs">
                  {description}
                </p>
              )}

              {/* Social Icons */}
              {hasSocial && (
                <div className="flex items-center gap-3 pt-1">
                  {facebookUrl && (
                    <a
                      href={facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white transition-all duration-200"
                    >
                      <Facebook size={16} />
                    </a>
                  )}
                  {instagramUrl && (
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white transition-all duration-200"
                    >
                      <Instagram size={16} />
                    </a>
                  )}
                  {tiktokUrl && (
                    <a
                      href={tiktokUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="TikTok"
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white transition-all duration-200"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* ── Column 2: Nav Links ───────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-8">
              {col1Links.length > 0 && (
                <FooterNavColumn
                  title={col1Title}
                  links={col1Links}
                  lang={lang}
                />
              )}
              {col2Links.length > 0 && (
                <FooterNavColumn
                  title={col2Title}
                  links={col2Links}
                  lang={lang}
                />
              )}
            </div>

            {/* ── Column 3: Contact Info ────────────────────────────────── */}
            {hasContact && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-primary mb-4">
                  {contactTitle}
                </h3>
                <ul className="space-y-3">
                  {phone && (
                    <li className="flex items-start gap-2.5">
                      <Phone
                        size={15}
                        className="text-brand-accent mt-0.5 flex-shrink-0"
                      />
                      <a
                        href={`tel:${phone}`}
                        className="text-sm text-brand-text/70 hover:text-brand-primary transition-colors duration-200"
                      >
                        {phone}
                      </a>
                    </li>
                  )}
                  {email && (
                    <li className="flex items-start gap-2.5">
                      <Mail
                        size={15}
                        className="text-brand-accent mt-0.5 flex-shrink-0"
                      />
                      <a
                        href={`mailto:${email}`}
                        className="text-sm text-brand-text/70 hover:text-brand-primary transition-colors duration-200 break-all"
                      >
                        {email}
                      </a>
                    </li>
                  )}
                  {address && (
                    <li className="flex items-start gap-2.5">
                      <MapPin
                        size={15}
                        className="text-brand-accent mt-0.5 flex-shrink-0"
                      />
                      <address className="text-sm text-brand-text/70 not-italic leading-relaxed">
                        {address}
                      </address>
                    </li>
                  )}
                </ul>
              </div>
            )}

          </div>
        </div>

        {/* ── Bottom Bar ────────────────────────────────────────────────── */}
        <div className="border-t border-brand-secondary/20">
          <div
            className={cn(
              'max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-4',
              'flex flex-col sm:flex-row items-center justify-between gap-3',
            )}
          >
            {/* Copyright */}
            <p className="text-xs text-brand-text/50 text-center sm:text-left">
              {copyright}
            </p>

            {/* Payment Method Icons */}
            {hasPaymentIcons && (
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
                {showBkash && <BkashIcon />}
                {showNagad && <NagadIcon />}
                {showRocket && <RocketIcon />}
                {showCod && <CodIcon />}
              </div>
            )}
          </div>
        </div>

      </footer>

      {/* ── Floating WhatsApp Button ─────────────────────────────────────── */}
      {whatsapp && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={
            lang === 'bn'
              ? 'হোয়াটসঅ্যাপে যোগাযোগ করুন'
              : 'Contact via WhatsApp'
          }
          className={cn(
            'fixed bottom-20 right-4 z-50',
            'w-14 h-14 rounded-full',
            'bg-[#25D366] text-white',
            'flex items-center justify-center',
            'shadow-lg hover:shadow-xl',
            'hover:scale-110 active:scale-95',
            'transition-all duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2',
          )}
        >
          <WhatsAppIcon className="w-7 h-7" />
        </a>
      )}
    </>
  );
};

export default Footer;