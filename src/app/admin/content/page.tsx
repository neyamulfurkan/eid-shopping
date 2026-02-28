import React from 'react';
import { getCachedSiteConfig } from '@/lib/siteConfig';
import { BannerManager } from '@/components/admin/BannerManager';
import { ContentTextEditor } from '@/components/admin/ContentTextEditor';
import { TabSwitcher } from './TabSwitcher';

export default async function AdminContentPage() {
  const initialConfig = await getCachedSiteConfig();
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <TabSwitcher
        bannerContent={<BannerManager />}
        textContent={<ContentTextEditor initialConfig={initialConfig} />}
      />
    </div>
  );
}