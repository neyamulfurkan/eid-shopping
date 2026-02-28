// src/app/api/upload/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';

/**
 * POST /api/upload
 *
 * Admin-only endpoint that accepts a multipart FormData payload, validates the
 * uploaded file, and stores it in Cloudinary under the requested folder.
 *
 * @param request - Incoming Next.js request with FormData body containing
 *                  `file` (File/Blob) and optional `folder` (string).
 * @returns JSON { data: { url: string; publicId: string } } on success, or
 *          { error: string; details?: string } with the appropriate HTTP status.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // -------------------------------------------------------------------------
  // Authentication — admin only
  // -------------------------------------------------------------------------
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // -------------------------------------------------------------------------
  // Parse FormData
  // -------------------------------------------------------------------------
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body. Expected multipart/form-data.' },
      { status: 400 }
    );
  }

  const file = formData.get('file');
  const folder =
    typeof formData.get('folder') === 'string'
      ? (formData.get('folder') as string).trim() || 'uploads'
      : 'uploads';

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: 'Missing required field: file' },
      { status: 400 }
    );
  }

  // -------------------------------------------------------------------------
  // MIME type validation — images only
  // -------------------------------------------------------------------------
  if (!file.type.startsWith('image/')) {
    return NextResponse.json(
      {
        error: 'Invalid file type. Only image files are accepted.',
      },
      { status: 400 }
    );
  }

  // -------------------------------------------------------------------------
  // File size validation — max 5 MB
  // -------------------------------------------------------------------------
  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'File too large. Maximum allowed size is 5 MB.' },
      { status: 413 }
    );
  }

  // -------------------------------------------------------------------------
  // Convert Blob → Buffer and upload to Cloudinary
  // -------------------------------------------------------------------------
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { url, publicId } = await uploadImage(buffer, folder);

    return NextResponse.json({ data: { url, publicId } }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Upload failed', details: message },
      { status: 500 }
    );
  }
}