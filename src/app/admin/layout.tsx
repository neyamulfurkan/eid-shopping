// src/app/admin/layout.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AdminSidebar } from '@/components/layout/AdminSidebar';

/**
 * Root layout for all /admin/* routes.
 * Performs a server-side session check and redirects unauthenticated or
 * non-ADMIN users to the sign-in page before rendering any admin UI.
 *
 * @param children - Nested admin page content.
 * @returns The admin shell layout with sidebar and main content area.
 */
export default async function AdminLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const session = await auth();

  if (!session || session.user?.role !== 'ADMIN') {
    redirect('/auth/signin');
  }

  return (
    <div className="flex min-h-screen bg-brand-bg">
      {/* Fixed 256 px sidebar — Client Component */}
      <AdminSidebar />

      {/* Main content area offset by sidebar width on lg+ screens */}
      <main className="flex-1 overflow-y-auto p-6 lg:ml-64">
        {children}
      </main>
    </div>
  );
}