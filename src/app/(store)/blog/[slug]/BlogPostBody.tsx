// src/app/(store)/blog/[slug]/BlogPostBody.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

// ─────────────────────────────────────────────
// Markdown renderer (dynamic import of marked)
// ─────────────────────────────────────────────

/**
 * Renders a Markdown string as sanitised HTML using the marked library.
 * Falls back to the raw text if marked fails to load.
 * @param markdown - Raw Markdown string to render.
 * @returns HTML string.
 */
async function renderMarkdown(markdown: string): Promise<string> {
  try {
    const { marked } = await import('marked');
    const result = marked(markdown);
    // marked can return string | Promise<string> depending on configuration
    return typeof result === 'string' ? result : await result;
  } catch {
    // If marked is unavailable, return escaped plain text
    return markdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

// ─────────────────────────────────────────────
// BlogPostTitleIsland
// ─────────────────────────────────────────────

interface BlogPostTitleIslandProps {
  titleEn: string;
  titleBn: string | null;
}

/**
 * Client island that renders the blog post h1 title in the currently active language.
 * Falls back to titleEn when titleBn is unavailable or when language is English.
 *
 * @param titleEn - English title (always present).
 * @param titleBn - Bengali title (optional).
 */
export const BlogPostTitleIsland: React.FC<BlogPostTitleIslandProps> = ({
  titleEn,
  titleBn,
}) => {
  const { lang } = useLanguage();

  const displayTitle =
    lang === 'bn' && titleBn ? titleBn : titleEn;

  return (
    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-text leading-tight">
      {displayTitle}
    </h1>
  );
};

// ─────────────────────────────────────────────
// BlogPostBody
// ─────────────────────────────────────────────

interface BlogPostBodyProps {
  /** English body in Markdown format — always present. */
  bodyEn: string;
  /** Bengali body in Markdown format — optional. */
  bodyBn: string | null;
}

/**
 * Client island that renders the blog post body in the currently active language.
 * Uses the marked library to convert Markdown to HTML, rendered via
 * dangerouslySetInnerHTML inside a Tailwind Typography prose container.
 * Falls back to English body when Bengali body is absent or language is English.
 *
 * @param bodyEn - English Markdown body.
 * @param bodyBn - Bengali Markdown body (optional).
 */
export const BlogPostBody: React.FC<BlogPostBodyProps> = ({ bodyEn, bodyBn }) => {
  const { lang } = useLanguage();

  const rawBody = lang === 'bn' && bodyBn ? bodyBn : bodyEn;

  const [html, setHtml] = useState<string>('');
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsRendering(true);

    renderMarkdown(rawBody).then((rendered) => {
      if (!cancelled) {
        setHtml(rendered);
        setIsRendering(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [rawBody]);

  if (isRendering) {
    return (
      <div className="space-y-3 animate-pulse" aria-busy="true" aria-label="Loading content">
        {[100, 90, 95, 80, 88].map((w, i) => (
          <div
            key={i}
            className="h-4 bg-brand-secondary/20 rounded"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="prose prose-lg max-w-none
        prose-headings:text-brand-text
        prose-headings:font-bold
        prose-p:text-brand-text/80
        prose-p:leading-relaxed
        prose-a:text-brand-primary
        prose-a:no-underline
        hover:prose-a:underline
        prose-strong:text-brand-text
        prose-blockquote:border-brand-primary
        prose-blockquote:text-brand-text/70
        prose-code:text-brand-accent
        prose-code:bg-brand-surface
        prose-code:px-1
        prose-code:rounded
        prose-img:rounded-xl
        prose-hr:border-brand-secondary/30"
      // Admin authors all blog content — dangerouslySetInnerHTML is acceptable here.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};