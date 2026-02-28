// src/lib/qrcode.ts

import QRCode from 'qrcode';

/** Shared QR code generation options */
const QR_OPTIONS: QRCode.QRCodeToDataURLOptions = {
  errorCorrectionLevel: 'M',
  margin: 2,
  width: 300,
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
};

/**
 * Generates a QR code as a base64 data URL string.
 * @param text - The text or URL to encode in the QR code.
 * @returns A Promise that resolves to a data URL string (e.g. "data:image/png;base64,...").
 */
export async function generateQRCodeDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, QR_OPTIONS);
}

/**
 * Generates a QR code as a raw PNG Buffer.
 * @param text - The text or URL to encode in the QR code.
 * @returns A Promise that resolves to a Buffer containing the PNG image bytes.
 */
export async function generateQRCodeBuffer(text: string): Promise<Buffer> {
  return QRCode.toBuffer(text, QR_OPTIONS as QRCode.QRCodeToBufferOptions);
}