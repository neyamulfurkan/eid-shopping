// src/components/storefront/BlogCard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { formatDate, truncate } from '@/lib/utils';

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface BlogCardProps {
  post: {
    id: string;
    titleEn: string;
    titleBn: string | null;
    slug: string;
    excerptEn: string | null;
    excerptBn: string | null;
    thumbnailUrl: string | null;
    publishedAt: Date | null;
  };
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

/**
 * Displays a blog post preview card with a thumbnail, language-aware title,
 * truncated excerpt, and published date, linking to the full post page.
 *
 * @param post - Blog post data to render.
 */
export const BlogCard: React.FC<BlogCardProps> = ({ post }) => {
  const { lang } = useLanguage();

  const title =
    lang === 'bn' && post.titleBn ? post.titleBn : post.titleEn;

  const rawExcerpt =
    lang === 'bn' && post.excerptBn ? post.excerptBn : (post.excerptEn ?? '');
  const excerpt = rawExcerpt ? truncate(rawExcerpt, 120) : null;

  return (
    <Link href={`/blog/${post.slug}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-2xl">
      <motion.article
        className="rounded-2xl overflow-hidden bg-brand-surface shadow-sm flex flex-col h-full"
        whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video w-full overflow-hidden bg-brand-surface">
          {post.thumbnailUrl ? (
            <Image
              src={post.thumbnailUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand-surface">
              <BookOpen
                className="text-brand-secondary opacity-40"
                size={40}
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-2 p-4 flex-1">
          {/* Title */}
          <h3 className="text-base font-semibold leading-snug text-brand-text line-clamp-2">
            {title}
          </h3>

          {/* Excerpt */}
          {excerpt && (
            <p className="text-sm text-brand-text/70 leading-relaxed flex-1">
              {excerpt}
            </p>
          )}

          {/* Date */}
          {post.publishedAt && (
            <time
              dateTime={
                post.publishedAt instanceof Date
                  ? post.publishedAt.toISOString()
                  : String(post.publishedAt)
              }
              className="text-xs text-brand-text/50 mt-auto pt-2"
            >
              {formatDate(post.publishedAt)}
            </time>
          )}
        </div>
      </motion.article>
    </Link>
  );
};