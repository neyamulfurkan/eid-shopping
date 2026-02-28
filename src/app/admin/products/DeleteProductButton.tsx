// src/app/admin/products/DeleteProductButton.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DeleteProductButtonProps {
  productId: string;
  productName: string;
}

/**
 * Client island for the delete product action.
 * Prompts for confirmation then calls DELETE /api/products/[id] and refreshes.
 * @param productId - The product's database ID.
 * @param productName - Human-readable name shown in the confirmation dialog.
 * @returns A danger-variant delete button.
 */
export const DeleteProductButton: React.FC<DeleteProductButtonProps> = ({
  productId,
  productName,
}) => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${productName}"? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body?.error ?? 'Failed to delete product.');
      } else {
        router.refresh();
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button
      variant="danger"
      size="sm"
      isLoading={isDeleting}
      leftIcon={!isDeleting ? <Trash2 className="w-3.5 h-3.5" /> : undefined}
      onClick={handleDelete}
    >
      Delete
    </Button>
  );
};