'use client';

import React, { useState } from 'react';
import { Image as ImageIcon, Type } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'banners' | 'text';

interface TabSwitcherProps {
  /** Content rendered when the Hero Banners tab is active. */
  bannerContent: React.ReactNode;
  /** Content rendered when the Site Text tab is active. */
  textContent: React.ReactNode;
}

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

// ─── Sub-component: TabButton ─────────────────────────────────────────────────

/**
 * A single styled tab button.
 * @param isActive - Whether this tab is currently selected.
 * @param onClick  - Handler called when the tab is clicked.
 * @param icon     - Icon element displayed before the label.
 * @param label    - Visible tab label text.
 * @returns A styled tab button element.
 */
const TabButton: React.FC<TabButtonProps> = ({ isActive, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
      isActive
        ? 'bg-brand-primary text-white shadow-sm'
        : 'text-brand-text/60 hover:text-brand-text hover:bg-brand-secondary/10',
    )}
    aria-selected={isActive}
    role="tab"
  >
    {icon}
    {label}
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * Client-side tab switcher for the admin content page.
 * Renders two tabs — Hero Banners and Site Text — and conditionally displays
 * the appropriate content panel based on the active tab state.
 *
 * @param bannerContent - React node rendered for the Hero Banners tab.
 * @param textContent   - React node rendered for the Site Text tab.
 * @returns Tab navigation and active panel content.
 */
export const TabSwitcher: React.FC<TabSwitcherProps> = ({
  bannerContent,
  textContent,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('banners');

  return (
    <div>
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Content sections"
        className="flex items-center gap-2 p-1 rounded-2xl bg-brand-surface border border-brand-secondary/20 w-fit mb-8"
      >
        <TabButton
          isActive={activeTab === 'banners'}
          onClick={() => setActiveTab('banners')}
          icon={<ImageIcon size={16} />}
          label="Hero Banners"
        />
        <TabButton
          isActive={activeTab === 'text'}
          onClick={() => setActiveTab('text')}
          icon={<Type size={16} />}
          label="Site Text"
        />
      </div>

      {/* Tab panels */}
      <div role="tabpanel">
        {activeTab === 'banners' && bannerContent}
        {activeTab === 'text' && textContent}
      </div>
    </div>
  );
};