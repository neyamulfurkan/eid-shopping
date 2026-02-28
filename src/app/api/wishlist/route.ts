// src/app/api/wishlist/route.ts

import { NextResponse } from 'next/server';

/**
 * GET /api/wishlist
 * Placeholder endpoint acknowledging the client-side localStorage wishlist implementation.
 * No auth required. No DB operations.
 *
 * @returns A JSON response indicating wishlist is managed client-side.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      data: {
        message:
          'Wishlist is client-side only. Future versions may support server-side persistence.',
      },
    },
    { status: 200 },
  );
}