// src/components/storefront/CheckoutForm.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { PaymentMethod } from '@/lib/types';
import type { CartItem } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { formatPrice } from '@/lib/utils';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface PromoResult {
  valid: boolean;
  discountAmount: number;
  reason?: string;
}

interface FormErrors {
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  paymentMethod?: string;
  transactionId?: string;
}

interface PaymentMethodConfig {
  method: PaymentMethod;
  labelKey: string;
  fallbackLabel: string;
  enabledKey: string;
  numberKey: string;
  icon: React.ReactNode;
}

interface CheckoutFormProps {
  onOrderSuccess: (orderNumber: string) => void;
}

// ─────────────────────────────────────────────
// Payment Method Icon SVGs
// ─────────────────────────────────────────────

const BkashIcon: React.FC = () => (
  <svg viewBox="0 0 40 40" className="w-8 h-8" aria-hidden="true">
    <rect width="40" height="40" rx="8" fill="#E2136E" />
    <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">bKash</text>
  </svg>
);

const NagadIcon: React.FC = () => (
  <svg viewBox="0 0 40 40" className="w-8 h-8" aria-hidden="true">
    <rect width="40" height="40" rx="8" fill="#F05A28" />
    <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">Nagad</text>
  </svg>
);

const RocketIcon: React.FC = () => (
  <svg viewBox="0 0 40 40" className="w-8 h-8" aria-hidden="true">
    <rect width="40" height="40" rx="8" fill="#8B1FA8" />
    <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Rocket</text>
  </svg>
);

const CodIcon: React.FC = () => (
  <svg viewBox="0 0 40 40" className="w-8 h-8" aria-hidden="true">
    <rect width="40" height="40" rx="8" fill="#2E7D32" />
    <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">COD</text>
  </svg>
);

// ─────────────────────────────────────────────
// Payment Method Definitions
// ─────────────────────────────────────────────

const PAYMENT_METHOD_CONFIGS: PaymentMethodConfig[] = [
  {
    method: PaymentMethod.BKASH,
    labelKey: 'payment.bkash',
    fallbackLabel: 'bKash',
    enabledKey: 'payment.bkashEnabled',
    numberKey: 'payment.bkashNumber',
    icon: <BkashIcon />,
  },
  {
    method: PaymentMethod.NAGAD,
    labelKey: 'payment.nagad',
    fallbackLabel: 'Nagad',
    enabledKey: 'payment.nagadEnabled',
    numberKey: 'payment.nagadNumber',
    icon: <NagadIcon />,
  },
  {
    method: PaymentMethod.ROCKET,
    labelKey: 'payment.rocket',
    fallbackLabel: 'Rocket',
    enabledKey: 'payment.rocketEnabled',
    numberKey: 'payment.rocketNumber',
    icon: <RocketIcon />,
  },
  {
    method: PaymentMethod.COD,
    labelKey: 'payment.cod',
    fallbackLabel: 'Cash on Delivery',
    enabledKey: 'payment.codEnabled',
    numberKey: '',
    icon: <CodIcon />,
  },
];

const MOBILE_BANKING_METHODS = new Set<PaymentMethod>([
  PaymentMethod.BKASH,
  PaymentMethod.NAGAD,
  PaymentMethod.ROCKET,
]);

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────

const PHONE_REGEX = /^01[3-9]\d{8}$/;

/**
 * Validates all checkout form fields and returns an error map.
 * @param customerName - Full name of the customer.
 * @param customerPhone - BD mobile number.
 * @param customerAddress - Delivery address.
 * @param paymentMethod - Selected payment method or null.
 * @param transactionId - Transaction ID for mobile banking methods.
 * @returns Record of field name → error message. Empty when all valid.
 */
function validateForm(
  customerName: string,
  customerPhone: string,
  customerAddress: string,
  paymentMethod: PaymentMethod | null,
  transactionId: string,
): FormErrors {
  const errors: FormErrors = {};

  if (customerName.trim().length < 2) {
    errors.customerName = 'নাম কমপক্ষে ২ অক্ষরের হতে হবে / Name must be at least 2 characters';
  }
  if (!PHONE_REGEX.test(customerPhone.trim())) {
    errors.customerPhone = 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01XXXXXXXXX) / Enter a valid BD mobile number';
  }
  if (customerAddress.trim().length < 10) {
    errors.customerAddress = 'ঠিকানা কমপক্ষে ১০ অক্ষরের হতে হবে / Address must be at least 10 characters';
  }
  if (!paymentMethod) {
    errors.paymentMethod = 'পেমেন্ট পদ্ধতি নির্বাচন করুন / Please select a payment method';
  }
  if (paymentMethod && MOBILE_BANKING_METHODS.has(paymentMethod) && !transactionId.trim()) {
    errors.transactionId = 'ট্রানজেকশন আইডি দিন / Transaction ID is required';
  }

  return errors;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

/**
 * Guest checkout form for the Eid E-Commerce storefront.
 * Collects customer info, handles payment method selection with merchant
 * number display, validates and applies promo codes, and submits the order.
 * @param onOrderSuccess - Called with the order number after a successful order.
 */
export const CheckoutForm: React.FC<CheckoutFormProps> = ({ onOrderSuccess }) => {
  const { items, subtotal, clearCart } = useCart();
  const config = useSiteConfig();
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  // ── Form state ───────────────────────────

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // ── Derived values ───────────────────────

  const discountAmount = promoResult?.valid ? promoResult.discountAmount : 0;
  const total = Math.max(0, subtotal - discountAmount);

  // ── Available payment methods ────────────

  const availablePaymentMethods = PAYMENT_METHOD_CONFIGS.filter((cfg) => {
    const enabled = config[cfg.enabledKey] === 'true';
    if (cfg.method === PaymentMethod.COD) return enabled;
    const hasNumber = !!config[cfg.numberKey]?.trim();
    return enabled && hasNumber;
  });

  // ── Merchant number for selected method ──

  const selectedMethodConfig = PAYMENT_METHOD_CONFIGS.find(
    (cfg) => cfg.method === paymentMethod,
  );
  const merchantNumber =
    selectedMethodConfig?.numberKey ? config[selectedMethodConfig.numberKey] ?? '' : '';

  // ── Promo code application ───────────────

  /**
   * Sends the promo code and current subtotal to the public validation endpoint.
   * Updates promoResult state with the server response.
   */
  const handleApplyPromo = useCallback(async () => {
    if (!promoCode.trim()) return;

    setIsApplyingPromo(true);
    setPromoResult(null);

    try {
      const res = await fetch('/api/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim().toUpperCase(), subtotal }),
      });

      const json = await res.json() as { data?: { valid: boolean; discountAmount?: number; reason?: string }; error?: string };

      if (!res.ok) {
        setPromoResult({ valid: false, discountAmount: 0, reason: json.error ?? 'কোড যাচাই করা যায়নি / Could not validate code' });
        return;
      }

      const data = json.data;
      if (data?.valid) {
        setPromoResult({ valid: true, discountAmount: data.discountAmount ?? 0 });
        showToast(
          lang === 'bn' ? 'প্রমো কোড সফলভাবে প্রয়োগ হয়েছে!' : 'Promo code applied successfully!',
          'success',
        );
      } else {
        setPromoResult({ valid: false, discountAmount: 0, reason: data?.reason ?? 'অবৈধ কোড / Invalid code' });
      }
    } catch {
      setPromoResult({ valid: false, discountAmount: 0, reason: 'নেটওয়ার্ক সমস্যা / Network error' });
    } finally {
      setIsApplyingPromo(false);
    }
  }, [promoCode, subtotal, showToast, lang]);

  // ── Payment method selection ─────────────

  const handleSelectPaymentMethod = useCallback((method: PaymentMethod) => {
    setPaymentMethod(method);
    setTransactionId('');
    setErrors((prev) => ({ ...prev, paymentMethod: undefined, transactionId: undefined }));
  }, []);

  // ── Form submission ──────────────────────

  /**
   * Validates the form and submits the order to POST /api/orders.
   * On success, clears the cart and calls onOrderSuccess.
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(
      customerName,
      customerPhone,
      customerAddress,
      paymentMethod,
      transactionId,
    );

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (items.length === 0) {
      showToast(
        lang === 'bn' ? 'কার্ট খালি / Cart is empty' : 'Cart is empty',
        'error',
      );
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    const payload = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      paymentMethod: paymentMethod!,
      transactionId: transactionId.trim() || undefined,
      promoCode: promoResult?.valid && promoCode.trim() ? promoCode.trim().toUpperCase() : undefined,
      items: items as CartItem[],
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json() as { data?: { orderNumber: string; total: number }; error?: string };

      if (!res.ok) {
        showToast(json.error ?? (lang === 'bn' ? 'অর্ডার দেওয়া যায়নি / Order failed' : 'Order failed'), 'error');
        return;
      }

      const orderNumber = json.data?.orderNumber ?? '';
      clearCart();
      onOrderSuccess(orderNumber);
    } catch {
      showToast(
        lang === 'bn' ? 'নেটওয়ার্ক সমস্যা, আবার চেষ্টা করুন / Network error, please try again' : 'Network error, please try again',
        'error',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    customerName, customerPhone, customerAddress,
    paymentMethod, transactionId, promoCode, promoResult,
    items, clearCart, onOrderSuccess, showToast, lang,
  ]);

  // ── Inline field error helper ────────────

  const FieldError: React.FC<{ message?: string }> = ({ message }) =>
    message ? <p className="mt-1 text-sm text-red-500">{message}</p> : null;

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">

      {/* ── Customer Information ──────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-brand-text mb-4">
          {t('checkout.customerInfo') || (lang === 'bn' ? 'আপনার তথ্য' : 'Your Information')}
        </h2>

        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium text-brand-text mb-1">
              {t('checkout.name') || (lang === 'bn' ? 'পূর্ণ নাম' : 'Full Name')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              id="customerName"
              type="text"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (errors.customerName) setErrors((prev) => ({ ...prev, customerName: undefined }));
              }}
              className="input-base w-full"
              placeholder={lang === 'bn' ? 'আপনার পূর্ণ নাম লিখুন' : 'Enter your full name'}
              autoComplete="name"
            />
            <FieldError message={errors.customerName} />
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="customerPhone" className="block text-sm font-medium text-brand-text mb-1">
              {t('checkout.phone') || (lang === 'bn' ? 'মোবাইল নম্বর' : 'Mobile Number')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              id="customerPhone"
              type="tel"
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value);
                if (errors.customerPhone) setErrors((prev) => ({ ...prev, customerPhone: undefined }));
              }}
              className="input-base w-full"
              placeholder="01XXXXXXXXX"
              autoComplete="tel"
              maxLength={11}
              inputMode="numeric"
            />
            <FieldError message={errors.customerPhone} />
          </div>

          {/* Delivery Address */}
          <div>
            <label htmlFor="customerAddress" className="block text-sm font-medium text-brand-text mb-1">
              {t('checkout.address') || (lang === 'bn' ? 'ডেলিভারি ঠিকানা' : 'Delivery Address')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              id="customerAddress"
              value={customerAddress}
              onChange={(e) => {
                setCustomerAddress(e.target.value);
                if (errors.customerAddress) setErrors((prev) => ({ ...prev, customerAddress: undefined }));
              }}
              className="input-base w-full resize-none"
              rows={3}
              placeholder={lang === 'bn' ? 'বাড়ি নং, রাস্তা, এলাকা, জেলা লিখুন' : 'House no., road, area, district'}
              autoComplete="street-address"
            />
            <FieldError message={errors.customerAddress} />
          </div>
        </div>
      </section>

      {/* ── Payment Method ────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-brand-text mb-4">
          {t('checkout.paymentMethod') || (lang === 'bn' ? 'পেমেন্ট পদ্ধতি' : 'Payment Method')}
          <span className="text-red-500 ml-1">*</span>
        </h2>

        {availablePaymentMethods.length === 0 ? (
          <p className="text-sm text-brand-text/60">
            {lang === 'bn' ? 'কোনো পেমেন্ট পদ্ধতি কনফিগার করা হয়নি।' : 'No payment methods configured.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {availablePaymentMethods.map((cfg) => {
              const isSelected = paymentMethod === cfg.method;
              return (
                <button
                  key={cfg.method}
                  type="button"
                  onClick={() => handleSelectPaymentMethod(cfg.method)}
                  className={[
                    'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                    isSelected
                      ? 'border-brand-primary bg-brand-primary/5'
                      : 'border-brand-secondary/30 bg-brand-surface hover:border-brand-primary/50',
                  ].join(' ')}
                  aria-pressed={isSelected}
                >
                  <span className="shrink-0">{cfg.icon}</span>
                  <span className="text-sm font-medium text-brand-text">
                    {t(cfg.labelKey) || cfg.fallbackLabel}
                  </span>
                  {isSelected && (
                    <span className="ml-auto shrink-0 w-4 h-4 rounded-full bg-brand-primary flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12" aria-hidden="true">
                        <path d="M10 3L5 8.5 2 5.5l-1 1L5 10.5l6-6.5-1-1z" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <FieldError message={errors.paymentMethod} />

        {/* Mobile Banking Instructions */}
        {paymentMethod && MOBILE_BANKING_METHODS.has(paymentMethod) && merchantNumber && (
          <div className="mt-4 p-4 rounded-xl bg-brand-secondary/10 border border-brand-secondary/30 space-y-3">
            <p className="text-sm text-brand-text">
              {t('checkout.sendTo')} {formatPrice(total)} {t('checkout.to')}:
            </p>
            <p className="text-xl font-bold text-brand-primary tracking-wider">{merchantNumber}</p>
            <p className="text-sm text-brand-text/80">
              {t('checkout.enterTxId')}
            </p>

            <div>
              <label htmlFor="transactionId" className="block text-sm font-medium text-brand-text mb-1">
                {t('checkout.transactionId')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                id="transactionId"
                type="text"
                value={transactionId}
                onChange={(e) => {
                  setTransactionId(e.target.value);
                  if (errors.transactionId) setErrors((prev) => ({ ...prev, transactionId: undefined }));
                }}
                className="input-base w-full"
                placeholder={t('checkout.transactionIdHint')}
              />
              <FieldError message={errors.transactionId} />
            </div>
          </div>
        )}
      </section>

      {/* ── Promo Code ────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-brand-text mb-3">
          {t('label.promoCode') || (lang === 'bn' ? 'প্রমো কোড' : 'Promo Code')}
        </h2>

        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => {
              setPromoCode(e.target.value.toUpperCase());
              if (promoResult) setPromoResult(null);
            }}
            className="input-base flex-1"
            placeholder={lang === 'bn' ? 'কোড লিখুন' : 'Enter code'}
            disabled={promoResult?.valid}
          />
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleApplyPromo}
            isLoading={isApplyingPromo}
            disabled={!promoCode.trim() || promoResult?.valid}
          >
            {promoResult?.valid
              ? (lang === 'bn' ? 'প্রযোজ্য' : 'Applied')
              : (lang === 'bn' ? 'প্রয়োগ করুন' : 'Apply')}
          </Button>
        </div>

        {promoResult && !promoResult.valid && (
          <p className="mt-2 text-sm text-red-500">{promoResult.reason}</p>
        )}
        {promoResult?.valid && (
          <p className="mt-2 text-sm text-green-600 font-medium">
            {lang === 'bn'
              ? `${formatPrice(promoResult.discountAmount)} ছাড় পেয়েছেন!`
              : `Discount applied: ${formatPrice(promoResult.discountAmount)}`}
          </p>
        )}
      </section>

      {/* ── Order Summary ─────────────────────────── */}
      <section className="rounded-xl bg-brand-surface border border-brand-secondary/20 p-4 space-y-2">
        <div className="flex justify-between text-sm text-brand-text/80">
          <span>{t('label.subtotal') || (lang === 'bn' ? 'সাবটোটাল' : 'Subtotal')}</span>
          <span>{formatPrice(subtotal)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>{lang === 'bn' ? 'ছাড়' : 'Discount'}</span>
            <span>- {formatPrice(discountAmount)}</span>
          </div>
        )}

        <div className="flex justify-between text-base font-bold text-brand-text border-t border-brand-secondary/20 pt-2 mt-1">
          <span>{t('label.total') || (lang === 'bn' ? 'মোট' : 'Total')}</span>
          <span className="text-brand-primary">{formatPrice(total)}</span>
        </div>
      </section>

      {/* ── Submit ────────────────────────────────── */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isSubmitting}
        className="w-full"
        disabled={items.length === 0}
      >
        {isSubmitting
          ? (lang === 'bn' ? 'অর্ডার দেওয়া হচ্ছে...' : 'Placing order...')
          : (lang === 'bn' ? 'অর্ডার দিন' : 'Place Order')}
      </Button>

    </form>
  );
};