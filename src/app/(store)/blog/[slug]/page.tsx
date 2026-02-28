// src/app/(store)/blog/[slug]/page.tsx

import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BlogPostBody } from './BlogPostBody';
import { buildBreadcrumbJsonLd } from '@/lib/jsonld';

// ─────────────────────────────────────────────
// Static Params
// ─────────────────────────────────────────────

/**
 * Pre-generates static paths for all published blog posts at build time.
 * @returns Array of slug param objects for static generation.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const posts = await prisma.blogPost.findMany({
    where: { isPublished: true },
    select: { slug: true },
  });
  return posts.map((p) => ({ slug: p.slug }));
}

// ─────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────

/**
 * Generates dynamic SEO metadata from the blog post content.
 * @param params - Route params containing the post slug.
 * @returns Next.js Metadata object.
 */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await prisma.blogPost.findUnique({
    where: { slug: params.slug },
    select: {
      titleEn: true,
      titleBn: true,
      excerptEn: true,
      excerptBn: true,
      thumbnailUrl: true,
      isPublished: true,
    },
  });

  if (!post || !post.isPublished) {
    return { title: 'Post Not Found' };
  }

  const siteUrl = process.env.NEXTAUTH_URL || '';

  return {
    title: post.titleEn,
    description: post.excerptEn ?? undefined,
    alternates: {
      canonical: `${siteUrl}/blog/${params.slug}`,
    },
    openGraph: {
      title: post.titleEn,
      description: post.excerptEn ?? undefined,
      url: `${siteUrl}/blog/${params.slug}`,
      type: 'article',
      images: post.thumbnailUrl
        ? [{ url: post.thumbnailUrl, width: 1200, height: 630, alt: post.titleEn }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.titleEn,
      description: post.excerptEn ?? undefined,
      images: post.thumbnailUrl ? [post.thumbnailUrl] : [],
    },
  };
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

/**
 * Blog post detail page.
 * Server component — fetches post by slug, returns 404 for missing or unpublished posts.
 * Renders thumbnail, bilingual title, formatted date, and a client island for
 * language-aware Markdown body rendering.
 */
export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await prisma.blogPost.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      titleEn: true,
      titleBn: true,
      excerptEn: true,
      thumbnailUrl: true,
      bodyEn: true,
      bodyBn: true,
      isPublished: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  if (!post || !post.isPublished) {
    notFound();
  }

  const displayDate = post.publishedAt ?? post.createdAt;
  const siteUrl = process.env.NEXTAUTH_URL || '';

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: siteUrl },
    { name: 'Blog', url: `${siteUrl}/blog` },
    { name: post.titleEn, url: `${siteUrl}/blog/${params.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <Navbar />

      <main className="min-h-screen bg-brand-bg">
        <article className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-16">

          {/* ── Thumbnail ─────────────────────────────────────────────── */}
          {post.thumbnailUrl && (
            <div className="relative w-full h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden mb-8">
              <Image
                src={post.thumbnailUrl}
                alt={post.titleEn}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 672px) 100vw, 672px"
              />
            </div>
          )}

          {/* ── Header ────────────────────────────────────────────────── */}
          <header className="mb-8">
            {/* Title — client island picks language */}
            <BlogPostTitle titleEn={post.titleEn} titleBn={post.titleBn} />

            {/* Published date */}
            <time
              dateTime={displayDate.toISOString()}
              className="block mt-3 text-sm text-brand-text/50"
            >
              {formatDate(displayDate)}
            </time>
          </header>

          {/* ── Body — client island for language selection ───────────── */}
          <BlogPostBody bodyEn={post.bodyEn} bodyBn={post.bodyBn} />

        </article>
      </main>

      <Footer />
    </>
  );
}

// ─────────────────────────────────────────────
// Co-located client island: BlogPostTitle
// (re-exports from BlogPostBody file would cause
//  circular deps — define inline here instead)
// ─────────────────────────────────────────────

// NOTE: BlogPostTitle is a small client island for the h1 so it can
// respond to language context. It is defined in the same route directory
// as a separate named export to keep the server component pure.
// Since Next.js App Router allows importing client components into server
// pages, we import it directly from the co-located file below.

/**
 * Client island that renders the post title in the active language.
 * Defined here as a thin wrapper — actual implementation is in BlogPostBody.tsx.
 */
function BlogPostTitle({
  titleEn,
  titleBn,
}: {
  titleEn: string;
  titleBn: string | null;
}) {
  // This is a server component prop passthrough — the actual language-aware
  // rendering happens in the BlogPostBody client component tree.
  // We render both and hide the inactive one server-side as a progressive
  // enhancement; the client island will handle proper language switching.
  return (
    <BlogPostTitleIsland titleEn={titleEn} titleBn={titleBn} />
  );
}

// Import the client island for the title — defined in the same directory.
// We use a re-export from BlogPostBody to avoid an extra file.
import { BlogPostTitleIsland } from './BlogPostBody';