// src/app/api/qrcode/[productId]/route.ts

import { prisma } from '@/lib/prisma';
import { generateQRCodeBuffer } from '@/lib/qrcode';

/**
 * GET /api/qrcode/[productId]
 * Returns a PNG QR code image for the given product's storefront URL.
 * @param _request - Incoming request (unused)
 * @param params - Route params containing productId
 * @returns PNG image Response or error JSON
 */
export async function GET(
  _request: Request,
  { params }: { params: { productId: string } }
): Promise<Response> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.productId },
      select: { slug: true },
    });

    if (!product) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    const siteUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const productUrl = `${siteUrl}/products/${product.slug}`;

    let buffer: Buffer;
    try {
      buffer = await generateQRCodeBuffer(productUrl);
    } catch (qrError) {
      console.error('[qrcode] Failed to generate QR code:', qrError);
      return Response.json({ error: 'Failed to generate QR code' }, { status: 500 });
    }

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    console.error('[qrcode] Unexpected error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}