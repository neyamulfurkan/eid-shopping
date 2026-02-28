// src/lib/sms.ts

import { getCachedSiteConfig } from '@/lib/siteConfig';

/**
 * Sends an SMS message via the configured HTTP gateway.
 *
 * Reads `sms.apiKey`, `sms.baseUrl`, and `sms.senderId` from SiteConfig.
 * If any value is missing the function returns early without throwing.
 * All network and parsing errors are caught and returned as `{ success: false }`.
 * This function must never throw — callers must not await it in the critical path.
 *
 * @param to      - Recipient mobile number (e.g. 01XXXXXXXXX).
 * @param message - Plain-text message body (max 160 chars recommended).
 * @returns       Object with `success` boolean and an optional `error` string.
 */
export async function sendSms(
  to: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getCachedSiteConfig();

    const apiKey = config['sms.apiKey']?.trim();
    const baseUrl = config['sms.baseUrl']?.trim();
    const senderId = config['sms.senderId']?.trim();

    if (!apiKey || !baseUrl || !senderId) {
      console.warn(
        '[sms] SMS gateway not configured — missing one or more of: sms.apiKey, sms.baseUrl, sms.senderId',
      );
      return { success: false, error: 'SMS not configured' };
    }

    // Normalise the recipient number: strip all non-digit characters.
    const normalisedTo = to.replace(/\D/g, '');

    // Build the request URL with query parameters.
    // This format is compatible with most Bangladeshi HTTP SMS gateways
    // (e.g. bd-SMS, muthofun, smsq) that accept GET requests with these params.
    const url = new URL(baseUrl);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('senderid', senderId);
    url.searchParams.set('number', normalisedTo);
    url.searchParams.set('message', message);
    url.searchParams.set('type', 'text');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      // Abort the request after 10 seconds to avoid blocking the caller.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const errMsg = `Gateway responded with HTTP ${response.status}: ${body}`.slice(0, 200);
      console.error(`[sms] Delivery failed — ${errMsg}`);
      return { success: false, error: errMsg };
    }

    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unknown error during SMS send';
    console.error(`[sms] Unexpected error — ${message}`);
    return { success: false, error: message };
  }
}