// src/components/admin/PaymentSettings.tsx
'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  Smartphone,
  Truck,
  MessageSquare,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import type { SiteConfigMap } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentSettingsProps {
  initialConfig: SiteConfigMap;
}

interface PaymentMethodCardProps {
  logo: React.ReactNode;
  name: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  merchantNumber: string;
  onMerchantChange: (value: string) => void;
  merchantLabel: string;
  merchantPlaceholder: string;
  hasMerchantNumber: boolean;
}

// ─── Sub-component: PaymentMethodCard ────────────────────────────────────────

/**
 * Renders a single payment method card with a toggle and optional merchant number input.
 */
const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  logo,
  name,
  description,
  enabled,
  onToggle,
  merchantNumber,
  onMerchantChange,
  merchantLabel,
  merchantPlaceholder,
  hasMerchantNumber,
}) => {
  const toggleId = `toggle-${name.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div
      className={`rounded-xl border-2 p-5 transition-colors ${
        enabled
          ? 'border-brand-primary bg-brand-primary/5'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Logo / Icon */}
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${
              enabled ? 'bg-brand-primary' : 'bg-gray-400'
            }`}
          >
            {logo}
          </div>

          <div>
            <p className="font-semibold text-brand-text">{name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        </div>

        {/* Toggle switch */}
        <label htmlFor={toggleId} className="relative inline-flex cursor-pointer items-center">
          <input
            id={toggleId}
            type="checkbox"
            className="sr-only"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
          />
          <div
            className={`h-6 w-11 rounded-full transition-colors ${
              enabled ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
          <div
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </label>
      </div>

      {/* Merchant number input — only when enabled and method supports it */}
      {hasMerchantNumber && enabled && (
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-brand-text">
            {merchantLabel}
          </label>
          <input
            type="text"
            value={merchantNumber}
            onChange={(e) => onMerchantChange(e.target.value)}
            placeholder={merchantPlaceholder}
            className="input-base w-full"
            autoComplete="off"
          />
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * Admin form for configuring payment method toggles, merchant numbers, and
 * SMS gateway credentials. PATCHes /api/site-config on save.
 * @param initialConfig - Full SiteConfigMap from the server.
 * @returns The payment and SMS settings form.
 */
export const PaymentSettings: React.FC<PaymentSettingsProps> = ({ initialConfig }) => {
    const { showToast } = useToast();
  const router = useRouter();

  // ── Local state ──────────────────────────────────────────────────────────

  const [bkashEnabled, setBkashEnabled] = useState(
    initialConfig['payment.bkashEnabled'] === 'true',
  );
  const [bkashNumber, setBkashNumber] = useState(
    initialConfig['payment.bkashNumber'] ?? '',
  );

  const [nagadEnabled, setNagadEnabled] = useState(
    initialConfig['payment.nagadEnabled'] === 'true',
  );
  const [nagadNumber, setNagadNumber] = useState(
    initialConfig['payment.nagadNumber'] ?? '',
  );

  const [rocketEnabled, setRocketEnabled] = useState(
    initialConfig['payment.rocketEnabled'] === 'true',
  );
  const [rocketNumber, setRocketNumber] = useState(
    initialConfig['payment.rocketNumber'] ?? '',
  );

  const [codEnabled, setCodEnabled] = useState(
    initialConfig['payment.codEnabled'] === 'true',
  );

  const [smsApiKey, setSmsApiKey] = useState(
    initialConfig['sms.apiKey'] ?? '',
  );
  const [smsBaseUrl, setSmsBaseUrl] = useState(
    initialConfig['sms.baseUrl'] ?? '',
  );
  const [smsSenderId, setSmsSenderId] = useState(
    initialConfig['sms.senderId'] ?? '',
  );

  const [isSaving, setIsSaving] = useState(false);

  // ── Save handler ─────────────────────────────────────────────────────────

  /**
   * PATCHes all payment.* and sms.* keys to /api/site-config.
   * Boolean enabled flags are stringified as 'true' or 'false'.
   */
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: Record<string, string> = {
        'payment.bkashEnabled': bkashEnabled ? 'true' : 'false',
        'payment.bkashNumber': bkashNumber.trim(),
        'payment.nagadEnabled': nagadEnabled ? 'true' : 'false',
        'payment.nagadNumber': nagadNumber.trim(),
        'payment.rocketEnabled': rocketEnabled ? 'true' : 'false',
        'payment.rocketNumber': rocketNumber.trim(),
        'payment.codEnabled': codEnabled ? 'true' : 'false',
        'sms.apiKey': smsApiKey.trim(),
        'sms.baseUrl': smsBaseUrl.trim(),
        'sms.senderId': smsSenderId.trim(),
      };

      const res = await fetch('/api/site-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Deliberately do not log or expose credential values in error messages
        showToast('Failed to save payment settings. Please try again.', 'error');
        return;
      }

      showToast('Payment settings saved successfully.', 'success');
      router.refresh();
    } catch {
      showToast('An unexpected error occurred. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Payment Methods ─────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-brand-primary" />
          <h2 className="text-lg font-semibold text-brand-text">Payment Methods</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* bKash */}
          <PaymentMethodCard
            logo={<Smartphone className="h-5 w-5" />}
            name="bKash"
            description="Bangladesh's leading mobile banking"
            enabled={bkashEnabled}
            onToggle={setBkashEnabled}
            merchantNumber={bkashNumber}
            onMerchantChange={setBkashNumber}
            merchantLabel="bKash Merchant Number"
            merchantPlaceholder="01XXXXXXXXX"
            hasMerchantNumber
          />

          {/* Nagad */}
          <PaymentMethodCard
            logo={<Smartphone className="h-5 w-5" />}
            name="Nagad"
            description="Postal department's mobile financial service"
            enabled={nagadEnabled}
            onToggle={setNagadEnabled}
            merchantNumber={nagadNumber}
            onMerchantChange={setNagadNumber}
            merchantLabel="Nagad Merchant Number"
            merchantPlaceholder="01XXXXXXXXX"
            hasMerchantNumber
          />

          {/* Rocket */}
          <PaymentMethodCard
            logo={<Smartphone className="h-5 w-5" />}
            name="Rocket"
            description="Dutch-Bangla Bank mobile banking"
            enabled={rocketEnabled}
            onToggle={setRocketEnabled}
            merchantNumber={rocketNumber}
            onMerchantChange={setRocketNumber}
            merchantLabel="Rocket Merchant Number"
            merchantPlaceholder="01XXXXXXXXX"
            hasMerchantNumber
          />

          {/* Cash on Delivery */}
          <PaymentMethodCard
            logo={<Truck className="h-5 w-5" />}
            name="Cash on Delivery"
            description="Customer pays at the time of delivery"
            enabled={codEnabled}
            onToggle={setCodEnabled}
            merchantNumber=""
            onMerchantChange={() => undefined}
            merchantLabel=""
            merchantPlaceholder=""
            hasMerchantNumber={false}
          />
        </div>
      </section>

      {/* ── SMS Gateway ─────────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-brand-primary" />
          <h2 className="text-lg font-semibold text-brand-text">SMS Gateway</h2>
        </div>

        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Configure an HTTP SMS gateway for order confirmation messages.
          Compatible with bd-SMS, Twilio-style, and most Bangladeshi providers.
        </p>

        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* API Key */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-brand-text">
                API Key / Token
              </label>
              <input
                type="password"
                value={smsApiKey}
                onChange={(e) => setSmsApiKey(e.target.value)}
                placeholder="Your SMS gateway API key"
                className="input-base w-full"
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-gray-400">
                Stored securely in the database. Never shown in plain text after saving.
              </p>
            </div>

            {/* Base URL */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text">
                Gateway Base URL
              </label>
              <input
                type="url"
                value={smsBaseUrl}
                onChange={(e) => setSmsBaseUrl(e.target.value)}
                placeholder="https://api.smsprovider.com/send"
                className="input-base w-full"
                autoComplete="off"
              />
            </div>

            {/* Sender ID */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text">
                Sender ID
              </label>
              <input
                type="text"
                value={smsSenderId}
                onChange={(e) => setSmsSenderId(e.target.value)}
                placeholder="EidStore"
                className="input-base w-full"
                autoComplete="off"
                maxLength={11}
              />
              <p className="mt-1 text-xs text-gray-400">
                Max 11 characters. Must be pre-approved by your SMS provider.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Save Button ──────────────────────────────────────────────────── */}
      <div className="flex justify-end border-t border-gray-200 pt-6 dark:border-gray-700">
        <Button
          variant="primary"
          size="md"
          isLoading={isSaving}
          onClick={handleSave}
          leftIcon={<Save className="h-4 w-4" />}
        >
          Save Payment Settings
        </Button>
      </div>
    </div>
  );
};