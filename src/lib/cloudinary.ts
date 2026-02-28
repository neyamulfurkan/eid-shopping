// src/lib/cloudinary.ts
// Server-only — never import this file from a Client Component.

import { v2 as cloudinary } from 'cloudinary';

// ---------------------------------------------------------------------------
// Environment validation — fail fast at module load if any required var is absent
// ---------------------------------------------------------------------------

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUD_NAME) {
  throw new Error(
    '[cloudinary.ts] Missing environment variable: CLOUDINARY_CLOUD_NAME. ' +
      'Add it to your .env file (see .env.example).'
  );
}
if (!API_KEY) {
  throw new Error(
    '[cloudinary.ts] Missing environment variable: CLOUDINARY_API_KEY. ' +
      'Add it to your .env file (see .env.example).'
  );
}
if (!API_SECRET) {
  throw new Error(
    '[cloudinary.ts] Missing environment variable: CLOUDINARY_API_SECRET. ' +
      'Add it to your .env file (see .env.example).'
  );
}

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true,
});

// ---------------------------------------------------------------------------
// uploadImage
// ---------------------------------------------------------------------------

/**
 * Uploads an image Buffer to Cloudinary.
 *
 * @param file     - Raw image data as a Node.js Buffer.
 * @param folder   - Cloudinary folder path to store the asset under (e.g. "products").
 * @param publicId - Optional explicit public ID. If omitted, Cloudinary auto-generates one.
 * @returns        An object containing the canonical secure `url` and the `publicId` string.
 */
export async function uploadImage(
  file: Buffer,
  folder: string,
  publicId?: string
): Promise<{ url: string; publicId: string }> {
  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
      const uploadOptions: Record<string, unknown> = {
      folder,
      resource_type: 'image',
      ...(publicId ? { public_id: publicId } : {}),
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error || !result) {
        reject(
          new Error(
            `[cloudinary.ts] uploadImage failed: ${error?.message ?? 'No result returned from Cloudinary.'}`
          )
        );
        return;
      }
      resolve({
        url: result.secure_url,
        publicId: result.public_id,
      });
    });

    stream.end(file);
  });
}

// ---------------------------------------------------------------------------
// deleteImage
// ---------------------------------------------------------------------------

/**
 * Permanently deletes an image asset from Cloudinary by its public ID.
 *
 * @param publicId - The Cloudinary public ID of the asset to delete.
 * @returns        Resolves when the deletion is confirmed; rejects on failure.
 */
export async function deleteImage(publicId: string): Promise<void> {
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
  });

  // result.result is 'ok' on success and 'not found' when the asset does not exist.
  // We treat 'not found' as a no-op (idempotent delete) rather than an error.
  if (result.result !== 'ok' && result.result !== 'not found') {
    throw new Error(
      `[cloudinary.ts] deleteImage failed for publicId "${publicId}": ${result.result}`
    );
  }
}

// ---------------------------------------------------------------------------
// getOptimizedUrl
// ---------------------------------------------------------------------------

/**
 * Constructs a Cloudinary delivery URL with automatic format, automatic quality,
 * and optional width, height, and crop-mode transformations.
 *
 * @param publicId - The Cloudinary public ID of the asset.
 * @param width    - Desired output width in pixels.
 * @param height   - Optional desired output height in pixels.
 * @param crop     - Optional Cloudinary crop mode (e.g. "fill", "fit", "thumb"). Defaults to "fill".
 * @returns        A fully-formed HTTPS Cloudinary delivery URL string.
 */
export function getOptimizedUrl(
  publicId: string,
  width: number,
  height?: number,
  crop: string = 'fill'
): string {
  // Build the transformation string progressively so optional parts are only
  // included when the corresponding argument is supplied.
  const transformationParts: string[] = [
    'f_auto',
    'q_auto',
    `w_${width}`,
    ...(height !== undefined ? [`h_${height}`] : []),
    ...(height !== undefined ? [`c_${crop}`] : []),
  ];

  const transformation = transformationParts.join(',');

  // Construct the URL manually to avoid the Cloudinary SDK's URL builder
  // adding unexpected parameters and to keep this function synchronous and
  // dependency-free beyond the already-loaded SDK cloud name.
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformation}/${publicId}`;
}