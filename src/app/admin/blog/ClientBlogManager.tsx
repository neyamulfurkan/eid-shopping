// src/app/admin/blog/ClientBlogManager.tsx
'use client';

import React, { useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PenLine, Plus, Trash2, Eye, EyeOff, BookOpen } from 'lucide-react';
import type { BlogPost } from '@prisma/client';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { BlogPostForm } from '@/components/admin/BlogPostForm';
import { useToast } from '@/context/ToastContext';
import { formatDate, cn } from '@/lib/utils';
import type { BlogPostListItem } from './page';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClientBlogManagerProps {
  /** Blog post list items fetched server-side. */
  initialPosts: BlogPostListItem[];
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Client island for blog post management: table with edit/delete actions,
 * and a Modal containing BlogPostForm for create/edit operations.
 * @param initialPosts - Server-fetched blog post list items.
 * @returns The interactive blog management UI.
 */
export const ClientBlogManager: React.FC<ClientBlogManagerProps> = ({ initialPosts }) => {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  // ── Handlers ─────────────────────────────────────────────────────────────

  /** Opens modal in create mode. */
  const handleNewPost = useCallback(() => {
    setEditingPost(null);
    setIsModalOpen(true);
  }, []);

  /**
   * Opens modal in edit mode for the given post.
   * Fetches the full BlogPost object from the API before opening,
   * so BlogPostForm receives all fields including bodyEn/bodyBn.
   * @param slug - The slug of the post to edit.
   */
  const handleEditPost = useCallback(
    async (slug: string) => {
      try {
        const response = await fetch(`/api/blog/${slug}`);
        if (!response.ok) throw new Error('Failed to fetch post details.');
        const json = (await response.json()) as { data: BlogPost };
        setEditingPost(json.data);
        setIsModalOpen(true);
      } catch {
        showToast('Could not load post for editing.', 'error');
      }
    },
    [showToast],
  );

  /** Closes the modal and resets editing state. */
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    // Slight delay so the exit animation completes before clearing post data
    setTimeout(() => setEditingPost(null), 300);
  }, []);

  /**
   * Called by BlogPostForm on successful save. Closes modal and refreshes
   * the server component data via router.refresh().
   */
  const handleSaveSuccess = useCallback(() => {
    handleCloseModal();
    startTransition(() => {
      router.refresh();
    });
  }, [handleCloseModal, router]);

  /**
   * Deletes a blog post after window.confirm prompt.
   * @param slug - The slug of the post to delete.
   * @param titleEn - The English title used in the confirm prompt.
   */
  const handleDeletePost = useCallback(
    async (slug: string, titleEn: string) => {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${titleEn}"? This action cannot be undone.`,
      );
      if (!confirmed) return;

      setDeletingSlug(slug);
      try {
        const response = await fetch(`/api/blog/${slug}`, { method: 'DELETE' });
        if (!response.ok) {
          const json = (await response.json()) as { error?: string };
          throw new Error(json.error ?? 'Delete failed.');
        }
        showToast('Blog post deleted successfully.', 'success');
        startTransition(() => {
          router.refresh();
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        showToast(message, 'error');
      } finally {
        setDeletingSlug(null);
      }
    },
    [showToast, router],
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-brand-text/60">
          {initialPosts.length === 0
            ? 'No posts yet.'
            : `${initialPosts.length} post${initialPosts.length === 1 ? '' : 's'} total`}
        </p>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleNewPost}
          leftIcon={<Plus size={16} />}
        >
          New Post
        </Button>
      </div>

      {/* Posts Table */}
      {initialPosts.length === 0 ? (
        <EmptyState onNew={handleNewPost} />
      ) : (
        <div className="admin-table rounded-2xl overflow-hidden border border-brand-secondary/20">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-bg border-b border-brand-secondary/20 text-left">
                  <th className="px-4 py-3 font-medium text-brand-text/60 w-full">Title</th>
                  <th className="px-4 py-3 font-medium text-brand-text/60 whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-4 py-3 font-medium text-brand-text/60 whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-4 py-3 font-medium text-brand-text/60 text-right whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-secondary/10 bg-brand-surface">
                {initialPosts.map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    isDeleting={deletingSlug === post.slug}
                    onEdit={handleEditPost}
                    onDelete={handleDeletePost}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingPost ? 'Edit Post' : 'New Post'}
        size="lg"
      >
        <BlogPostForm
          initialData={editingPost ?? undefined}
          onSave={handleSaveSuccess}
        />
      </Modal>
    </>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PostRowProps {
  post: BlogPostListItem;
  isDeleting: boolean;
  onEdit: (slug: string) => void;
  onDelete: (slug: string, titleEn: string) => void;
}

/**
 * Single table row for a blog post.
 * @param post - The blog post list item.
 * @param isDeleting - Whether a delete request is in flight for this post.
 * @param onEdit - Callback to open the edit modal.
 * @param onDelete - Callback to delete this post.
 */
const PostRow: React.FC<PostRowProps> = ({ post, isDeleting, onEdit, onDelete }) => {
  const displayDate = post.publishedAt ?? post.createdAt;

  return (
    <tr
      className={cn(
        'transition-colors hover:bg-brand-bg/60',
        isDeleting && 'opacity-50 pointer-events-none',
      )}
    >
      {/* Title */}
      <td className="px-4 py-3">
        <span className="font-medium text-brand-text line-clamp-1">{post.titleEn}</span>
        <span className="block text-xs text-brand-text/40 mt-0.5">/blog/{post.slug}</span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        {post.isPublished ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <Eye size={10} />
            Published
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-bg text-brand-text/50 border border-brand-secondary/20">
            <EyeOff size={10} />
            Draft
          </span>
        )}
      </td>

      {/* Date */}
      <td className="px-4 py-3 text-brand-text/60 whitespace-nowrap text-xs">
        {formatDate(displayDate)}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onEdit(post.slug)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-brand-bg text-brand-text hover:bg-brand-secondary/10 border border-brand-secondary/20
              transition-colors"
            aria-label={`Edit ${post.titleEn}`}
          >
            <PenLine size={13} />
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(post.slug, post.titleEn)}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-red-50 text-red-600 hover:bg-red-100 border border-red-200
              transition-colors disabled:opacity-50"
            aria-label={`Delete ${post.titleEn}`}
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
};

interface EmptyStateProps {
  onNew: () => void;
}

/**
 * Empty state displayed when no blog posts exist.
 * @param onNew - Callback to open the create post modal.
 */
const EmptyState: React.FC<EmptyStateProps> = ({ onNew }) => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center
    rounded-2xl border-2 border-dashed border-brand-secondary/20 bg-brand-bg/50">
    <div className="w-16 h-16 rounded-full bg-brand-secondary/10 flex items-center justify-center mb-4">
      <BookOpen size={28} className="text-brand-primary/60" />
    </div>
    <h3 className="text-base font-semibold text-brand-text mb-1">No blog posts yet</h3>
    <p className="text-sm text-brand-text/50 mb-6 max-w-xs">
      Share news, style guides, or Eid offers with your customers via blog posts.
    </p>
    <Button type="button" variant="primary" size="md" onClick={onNew} leftIcon={<Plus size={16} />}>
      Create Your First Post
    </Button>
  </div>
);