// src/components/storefront/WhatsAppButton.tsx
'use client';

import React from 'react';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { useLanguage } from '@/context/LanguageContext';
import { getWhatsAppLink } from '@/lib/utils';

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface WhatsAppButtonProps {
  productNameEn: string;
  productNameBn: string;
  selectedVariants: Record<string, string>;
}

// ─────────────────────────────────────────────
// WhatsApp SVG Icon
// ─────────────────────────────────────────────

const WhatsAppIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    width="20"
    height="20"
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.117 1.535 5.845L.057 23.522a.75.75 0 0 0 .921.921l5.677-1.478A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.695-.51-5.231-1.399l-.374-.22-3.873 1.009 1.009-3.873-.22-.374A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
  </svg>
);

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

/**
 * Renders a WhatsApp order button that opens a pre-filled chat with the store.
 * The message is composed in the active language and includes the product name,
 * selected size and colour variants, and a blank location placeholder.
 * Returns null if no WhatsApp number is configured in SiteConfig.
 *
 * @param productNameEn - English product name inserted into the English message template.
 * @param productNameBn - Bengali product name inserted into the Bengali message template.
 * @param selectedVariants - Map of variant type → selected value (e.g. { size: 'M', color: 'Red' }).
 */
export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  productNameEn,
  productNameBn,
  selectedVariants,
}) => {
  const config = useSiteConfig();
  const { lang } = useLanguage();

  const whatsappNumber = config['contact.whatsapp'];

  // Do not render if no WhatsApp number is configured.
  if (!whatsappNumber) return null;

  const size = selectedVariants['size'] || (lang === 'bn' ? 'প্রযোজ্য নয়' : 'N/A');
  const color = selectedVariants['color'] || (lang === 'bn' ? 'প্রযোজ্য নয়' : 'N/A');

  const message =
    lang === 'bn'
      ? `হ্যালো! আমি অর্ডার করতে চাই: ${productNameBn}, সাইজ: ${size}, কালার: ${color}, আমার ঠিকানা: __________`
      : `Hi! I want to order: ${productNameEn}, Size: ${size}, Color: ${color}, My location: __________`;

  const handleClick = (): void => {
    window.open(getWhatsAppLink(whatsappNumber, message), '_blank', 'noopener,noreferrer');
  };

  const label = lang === 'bn' ? 'হোয়াটসঅ্যাপে অর্ডার করুন' : 'Order via WhatsApp';

  return (
    <button
      type="button"
      onClick={handleClick}
      className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-xl px-4 py-3 flex items-center gap-2 w-full justify-center font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
      aria-label={label}
    >
      <WhatsAppIcon />
      <span>{label}</span>
    </button>
  );
};