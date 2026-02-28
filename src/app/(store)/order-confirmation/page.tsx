// src/app/(store)/order-confirmation/page.tsx
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, MessageCircle, ShoppingBag } from 'lucide-react';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { useLanguage } from '@/context/LanguageContext';
import { getWhatsAppLink } from '@/lib/utils';

// ─────────────────────────────────────────────
// Animation Variants
// ─────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut' },
  },
};

const checkmarkVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 18,
      delay: 0.05,
    },
  },
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

/**
 * Order confirmation page shown after a successful checkout.
 * Reads the order number from the `order` search param, displays a staggered
 * success animation, and provides a WhatsApp contact link and a continue-shopping button.
 */
import { Suspense } from 'react';

function OrderConfirmationContent(): React.ReactElement {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const config       = useSiteConfig();
  const { lang }     = useLanguage();

  const orderNumber    = searchParams.get('order');
  const whatsappNumber = config['contact.whatsapp'] || '';

  // ── Guard: redirect to home if no order number ───────────────────────
  useEffect(() => {
    if (!orderNumber) {
      router.replace('/');
    }
  }, [orderNumber, router]);

  // While redirecting, render nothing to avoid flash
  if (!orderNumber) return <></>;

  // ── WhatsApp contact link ─────────────────────────────────────────────
  const whatsappMessage =
    lang === 'bn'
      ? `হ্যালো! আমি অর্ডার #${orderNumber} দিয়েছি। অনুগ্রহ করে কনফার্ম করুন।`
      : `Hi! I just placed order #${orderNumber}. Please confirm.`;

  const whatsappHref = whatsappNumber
    ? getWhatsAppLink(whatsappNumber, whatsappMessage)
    : '';

  // ── Labels ────────────────────────────────────────────────────────────
  const headingText =
    lang === 'bn' ? 'অর্ডার সফলভাবে সম্পন্ন হয়েছে!' : 'Order Placed Successfully!';

  const orderLabel =
    lang === 'bn' ? 'অর্ডার নম্বর' : 'Order Number';

  const processingText =
    lang === 'bn'
      ? 'আপনার অর্ডারটি প্রক্রিয়া করা হচ্ছে। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।'
      : 'Your order is being processed. We will contact you shortly to confirm.';

  const whatsappLabel =
    lang === 'bn' ? 'হোয়াটসঅ্যাপে যোগাযোগ করুন' : 'Contact via WhatsApp';

  const continueLabel =
    lang === 'bn' ? 'কেনাকাটা চালিয়ে যান' : 'Continue Shopping';

  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          className="w-full max-w-md bg-brand-surface rounded-3xl shadow-xl p-8 sm:p-10 flex flex-col items-center text-center gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >

          {/* ── 1. Animated Checkmark ─────────────────────────────────── */}
          <motion.div
            variants={checkmarkVariants}
            className="flex items-center justify-center w-24 h-24 rounded-full bg-brand-primary/10"
          >
            <CheckCircle
              size={56}
              strokeWidth={1.5}
              className="text-brand-primary"
              aria-hidden="true"
            />
          </motion.div>

          {/* ── 2. Heading ───────────────────────────────────────────── */}
          <motion.h1
            variants={itemVariants}
            className="text-2xl sm:text-3xl font-bold text-brand-text leading-snug"
          >
            {headingText}
          </motion.h1>

          {/* ── 3. Order Number Box ───────────────────────────────────── */}
          <motion.div
            variants={itemVariants}
            className="w-full rounded-2xl bg-brand-primary/10 border border-brand-primary/20 px-6 py-4"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-primary/70 mb-1">
              {orderLabel}
            </p>
            <p
              className="text-2xl font-bold text-brand-primary tracking-wide"
              aria-label={`${orderLabel}: ${orderNumber}`}
            >
              {orderNumber}
            </p>
          </motion.div>

          {/* ── 4. Processing Text ────────────────────────────────────── */}
          <motion.p
            variants={itemVariants}
            className="text-sm text-brand-text/60 leading-relaxed"
          >
            {processingText}
          </motion.p>

          {/* ── 5. WhatsApp Link Button ───────────────────────────────── */}
          {whatsappHref && (
            <motion.div variants={itemVariants} className="w-full">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#18a852] text-white font-semibold text-sm py-3.5 px-6 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
                aria-label={whatsappLabel}
              >
                <MessageCircle size={18} aria-hidden="true" />
                {whatsappLabel}
              </a>
            </motion.div>
          )}

          {/* ── 6. Continue Shopping Button ───────────────────────────── */}
          <motion.div variants={itemVariants} className="w-full">
            <Link
              href="/"
              className="flex items-center justify-center gap-2.5 w-full rounded-xl border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white font-semibold text-sm py-3.5 px-6 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            >
              <ShoppingBag size={18} aria-hidden="true" />
              {continueLabel}
            </Link>
          </motion.div>

        </motion.div>
      </main>

      <Footer />
</div>
  );
}

export default function OrderConfirmationPage(): React.ReactElement {
  return (
    <Suspense>
      <OrderConfirmationContent />
    </Suspense>
  );
}