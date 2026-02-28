// src/components/ui/ImageUpload.tsx
'use client';

import React, { useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { UploadCloud, X } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  /** Called with the Cloudinary URL and public ID after a successful upload, or ('', '') on remove. */
  onUpload: (url: string, publicId: string) => void;
  /** Cloudinary folder to upload into. */
  folder: string;
  /** If provided, renders a preview of the current image instead of the upload zone. */
  currentUrl?: string;
  /** Additional Tailwind classes applied to the root container. */
  className?: string;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Drag-and-drop image upload component.
 * Validates MIME type and file size on the client, POSTs to /api/upload,
 * and calls onUpload with the resulting Cloudinary URL and public ID.
 * @param onUpload - Callback invoked with (url, publicId) on success, or ('', '') on remove.
 * @param folder - Cloudinary destination folder string.
 * @param currentUrl - Optional existing image URL; renders preview mode when provided.
 * @param className - Optional extra classes for the root element.
 * @returns An upload zone or image preview with remove button.
 */
export const ImageUpload: React.FC<ImageUploadProps> = ({
  onUpload,
  folder,
  currentUrl,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!file.type.startsWith('image/')) {
        setError('Only image files are accepted.');
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError('File exceeds the 5 MB size limit.');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      setIsUploading(true);
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const json = (await response.json()) as { error?: string };
          throw new Error(json.error ?? `Upload failed with status ${response.status}`);
        }

        const json = (await response.json()) as { data: { url: string; publicId: string } };
        onUpload(json.data.url, json.data.publicId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
        setError(message);
      } finally {
        setIsUploading(false);
        // Reset the input so the same file can be re-selected after removal.
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      }
    },
    [folder, onUpload],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleRemove = useCallback(() => {
    setError(null);
    onUpload('', '');
  }, [onUpload]);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // ── Preview mode ────────────────────────────────────────────────────────────
  if (currentUrl) {
    return (
      <div className={cn('relative inline-block', className)}>
        <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-brand-secondary/30">
          <Image
            src={currentUrl}
            alt="Uploaded image preview"
            fill
            className="object-cover"
            sizes="128px"
          />
        </div>
        <button
          type="button"
          onClick={handleRemove}
          aria-label="Remove image"
          className={cn(
            'absolute -top-2 -right-2 w-6 h-6 rounded-full',
            'bg-red-500 text-white flex items-center justify-center',
            'hover:bg-red-600 transition-colors shadow-md',
          )}
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  // ── Upload zone ─────────────────────────────────────────────────────────────
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload image"
        onClick={openFilePicker}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openFilePicker()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center gap-3',
          'w-full min-h-[140px] rounded-xl border-2 border-dashed',
          'cursor-pointer transition-colors duration-200 select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
          isDragging
            ? 'border-brand-primary bg-brand-primary/5'
            : 'border-brand-secondary/40 bg-brand-surface hover:border-brand-primary/60 hover:bg-brand-primary/3',
          isUploading && 'pointer-events-none opacity-70',
        )}
      >
        {isUploading ? (
          <Spinner size="lg" className="text-brand-primary" />
        ) : (
          <>
            <UploadCloud
              size={36}
              strokeWidth={1.5}
              className={cn(
                'transition-colors',
                isDragging ? 'text-brand-primary' : 'text-brand-secondary',
              )}
            />
            <div className="text-center px-4">
              <p className="text-sm font-medium text-brand-text">
                Click to upload or drag &amp; drop
              </p>
              <p className="text-xs text-brand-text/50 mt-0.5">5 MB max — images only</p>
            </div>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleInputChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-500 flex items-center gap-1">
          <X size={12} strokeWidth={2.5} className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};