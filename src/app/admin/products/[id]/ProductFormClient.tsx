// src/app/admin/products/[id]/ProductFormClient.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ProductForm } from '@/components/admin/ProductForm';

interface Category {
  id: string;
  nameEn: string;
}

interface ProductFormClientProps {
  categories: Category[];
  initialData?: React.ComponentProps<typeof ProductForm>['initialData'];
}

/**
 * Thin client wrapper around ProductForm.
 * Exists solely to own the onSave callback (a function, which cannot be
 * passed from a Server Component to a Client Component).
 */
export const ProductFormClient: React.FC<ProductFormClientProps> = ({
  categories,
  initialData,
}) => {
  const router = useRouter();

  const handleSave = () => {
    router.push('/admin/products');
  };

  return (
    <ProductForm
      categories={categories}
      initialData={initialData}
      onSave={handleSave}
    />
  );
};