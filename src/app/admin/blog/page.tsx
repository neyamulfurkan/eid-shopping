// src/app/admin/blog/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ClientBlogManager } from './ClientBlogManager';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BlogPostListItem {
  id: string;
  titleEn: string;
  slug: string;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
}

// ─── Server Component ─────────────────────────────────────────────────────────

/**
 * Admin blog management page. Fetches all blog posts and delegates rendering
 * to the ClientBlogManager client island.
 * @returns The admin blog page with header and post management UI.
 */
export default async function AdminBlogPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session || session.user?.role !== 'ADMIN') {
    redirect('/auth/signin');
  }

  const posts: BlogPostListItem[] = await prisma.blogPost.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      titleEn: true,
      slug: true,
      isPublished: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-text">Blog Posts</h1>
        <p className="mt-1 text-sm text-brand-text/60">
          Create and manage blog content for your storefront.
        </p>
      </div>

      {/* Client island handles all interactivity */}
      <ClientBlogManager initialPosts={posts} />
    </div>
  );
}