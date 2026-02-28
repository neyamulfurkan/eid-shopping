// src/app/(store)/blog/page.tsx
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { BlogCard } from '@/components/storefront/BlogCard';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const POSTS_PER_PAGE = 10;

// ─────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────

/**
 * Generates static metadata for the blog listing page.
 * @returns Next.js Metadata object with title and description.
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Blog',
    description: 'Read our latest articles, tips, and updates.',
  };
}

// ─────────────────────────────────────────────
// Page Props
// ─────────────────────────────────────────────

interface BlogPageProps {
  searchParams: {
    page?: string;
  };
}

// ─────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────

/**
 * Server-rendered blog listing page.
 * Fetches published posts from the DB, renders a responsive grid of BlogCard
 * components, and provides prev/next pagination via URL searchParams.
 *
 * @param searchParams - URL search parameters; reads `page` (default 1).
 */
export default async function BlogPage({ searchParams }: BlogPageProps) {
  // ── Pagination ──────────────────────────────────────────────────────────
  const rawPage = parseInt(searchParams.page ?? '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const skip = (page - 1) * POSTS_PER_PAGE;

  // ── Data Fetching ───────────────────────────────────────────────────────
  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      skip,
      take: POSTS_PER_PAGE,
      select: {
        id: true,
        titleEn: true,
        titleBn: true,
        slug: true,
        excerptEn: true,
        excerptBn: true,
        thumbnailUrl: true,
        publishedAt: true,
      },
    }),
    prisma.blogPost.count({ where: { isPublished: true } }),
  ]);

  const totalPages = Math.ceil(total / POSTS_PER_PAGE);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-brand-bg">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

          {/* ── Page Header ─────────────────────────────────────────────── */}
          <div className="mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-brand-text tracking-tight">
              Blog
            </h1>
            {total > 0 && (
              <p className="mt-2 text-sm text-brand-text/60">
                {total} {total === 1 ? 'post' : 'posts'}
              </p>
            )}
          </div>

          {/* ── Post Grid ───────────────────────────────────────────────── */}
          {posts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <BlogCard
                  key={post.id}
                  post={{
                    ...post,
                    // Ensure Date objects are passed (Prisma returns Date for DateTime fields)
                    publishedAt: post.publishedAt,
                  }}
                />
              ))}
            </div>
          ) : (
            /* ── Empty State ────────────────────────────────────────────── */
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-brand-surface flex items-center justify-center">
                <ChevronRight className="text-brand-secondary/40" size={32} aria-hidden="true" />
              </div>
              <p className="text-brand-text/60 text-lg font-medium">No posts yet.</p>
              <p className="text-brand-text/40 text-sm">Check back soon for new articles.</p>
            </div>
          )}

          {/* ── Pagination ──────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <nav
              className="mt-12 flex items-center justify-center gap-3"
              aria-label="Blog pagination"
            >
              {/* Previous */}
              {hasPrev ? (
                <Link
                  href={`/blog?page=${page - 1}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-brand-surface border border-brand-secondary/30 text-brand-text hover:border-brand-primary hover:text-brand-primary transition-colors duration-200"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Previous
                </Link>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-brand-surface border border-brand-secondary/20 text-brand-text/30 cursor-not-allowed select-none"
                  aria-disabled="true"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Previous
                </span>
              )}

              {/* Page indicator */}
              <span className="text-sm text-brand-text/60 select-none">
                {page} / {totalPages}
              </span>

              {/* Next */}
              {hasNext ? (
                <Link
                  href={`/blog?page=${page + 1}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-brand-surface border border-brand-secondary/30 text-brand-text hover:border-brand-primary hover:text-brand-primary transition-colors duration-200"
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-brand-surface border border-brand-secondary/20 text-brand-text/30 cursor-not-allowed select-none"
                  aria-disabled="true"
                >
                  Next
                  <ChevronRight size={16} aria-hidden="true" />
                </span>
              )}
            </nav>
          )}

        </div>
      </main>

      <Footer />
    </>
  );
}