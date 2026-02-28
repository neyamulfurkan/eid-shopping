// src/app/admin/products/[id]/page.tsx
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ProductFormClient } from './ProductFormClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminProductEditPageProps {
  params: { id: string };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Admin product create/edit page. Renders ProductForm with full product data
 * for edit mode or blank for create mode.
 * @param params - Route params containing the product id or the literal "new".
 * @returns The product form page.
 */
export default async function AdminProductEditPage({
  params,
}: AdminProductEditPageProps) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/signin');
  }

  // ── Fetch categories (always needed) ────────────────────────────────────────
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
    select: { id: true, nameEn: true },
  });

  // ── Create mode ─────────────────────────────────────────────────────────────
  if (params.id === 'new') {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand-text">New Product</h1>
          <p className="mt-1 text-sm text-brand-text/60">
            Fill in the details below to add a new product to your store.
          </p>
        </div>

        <ProductFormClient categories={categories} />
      </div>
    );
  }

  // ── Edit mode ────────────────────────────────────────────────────────────────
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      images: {
        orderBy: { displayOrder: 'asc' },
      },
      variants: {
        where: { isActive: true },
        orderBy: { type: 'asc' },
      },
    },
  });

  if (!product) {
    notFound();
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-text">
          Edit: {product.nameEn}
        </h1>
        <p className="mt-1 text-sm text-brand-text/60">
          Update product details, images, variants, or flash deal settings.
        </p>
      </div>

      <ProductFormClient
        initialData={product}
        categories={categories}
      />
    </div>
  );
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: AdminProductEditPageProps) {
  if (params.id === 'new') {
    return { title: 'New Product | Admin' };
  }

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: { nameEn: true },
  });

  return {
    title: product ? `Edit: ${product.nameEn} | Admin` : 'Edit Product | Admin',
  };
}