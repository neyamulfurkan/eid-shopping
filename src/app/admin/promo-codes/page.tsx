import React from 'react';
import { PromoCodeManager } from '@/components/admin/PromoCodeManager';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminPromoCodesPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session || session.user?.role !== 'ADMIN') {
    redirect('/auth/signin');
  }

  return (
    <div className="p-6 space-y-2">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Promo Codes</h1>
        <p className="text-sm text-brand-text/60 mt-1">
          Create and manage discount codes for your store.
        </p>
      </div>
      <PromoCodeManager />
    </div>
  );
}