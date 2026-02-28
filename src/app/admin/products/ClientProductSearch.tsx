// src/app/admin/products/ClientProductSearch.tsx
'use client';

import React, { useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientProductSearchProps {
  initialSearch: string;
}

/**
 * Client island for the admin product search input.
 * Updates the URL ?search= param on form submit or clear, triggering a server re-render.
 * @param initialSearch - The current search value from URL params (for controlled input).
 * @returns A search form input with clear button.
 */
export const ClientProductSearch: React.FC<ClientProductSearchProps> = ({
  initialSearch,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = inputRef.current?.value.trim() ?? '';
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    params.delete('page');
    router.push(`/admin/products?${params.toString()}`);
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = '';
    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    params.delete('page');
    router.push(`/admin/products?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-sm">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/40 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          defaultValue={initialSearch}
          placeholder="Search products…"
          className={cn(
            'w-full pl-9 pr-9 py-2 rounded-xl border border-brand-secondary/30',
            'bg-brand-surface text-brand-text text-sm',
            'focus:outline-none focus:ring-2 focus:ring-brand-primary/30',
          )}
        />
        {initialSearch && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text/40 hover:text-brand-text"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <button
        type="submit"
        className="px-4 py-2 rounded-xl bg-brand-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Search
      </button>
    </form>
  );
};