'use client';

/**
 * Tabs Components
 * F1 luxury styled tab navigation
 */

import React, { createContext, useContext, useState } from 'react';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps {
  /** Default active tab */
  defaultTab: string;
  /** Controlled active tab */
  activeTab?: string;
  /** Callback when tab changes */
  onTabChange?: (tab: string) => void;
  /** Children (TabList and TabPanels) */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

export function Tabs({
  defaultTab,
  activeTab: controlledActiveTab,
  onTabChange,
  children,
  className = '',
}: TabsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab);

  const activeTab = controlledActiveTab ?? internalActiveTab;

  const setActiveTab = (tab: string) => {
    if (!controlledActiveTab) {
      setInternalActiveTab(tab);
    }
    onTabChange?.(tab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabListProps {
  /** Tab buttons */
  children: React.ReactNode;
  /** Variant style */
  variant?: 'default' | 'pills' | 'underline';
  /** Full width tabs */
  fullWidth?: boolean;
  /** Additional className */
  className?: string;
}

export function TabList({
  children,
  variant = 'default',
  fullWidth = false,
  className = '',
}: TabListProps) {
  const getVariantClass = () => {
    switch (variant) {
      case 'pills':
        return 'bg-zinc-800 rounded-lg p-1';
      case 'underline':
        return 'border-b border-zinc-800';
      default:
        return 'bg-zinc-900 rounded-lg';
    }
  };

  return (
    <div
      className={`
        flex
        ${fullWidth ? '' : 'inline-flex'}
        ${getVariantClass()}
        ${className}
      `}
      role="tablist"
    >
      {children}
    </div>
  );
}

export interface TabProps {
  /** Tab identifier */
  value: string;
  /** Tab label */
  children: React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Icon */
  icon?: React.ReactNode;
  /** Additional className */
  className?: string;
}

export function Tab({
  value,
  children,
  disabled = false,
  icon,
  className = '',
}: TabProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tab must be used within a Tabs component');
  }

  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      disabled={disabled}
      onClick={() => setActiveTab(value)}
      className={`
        flex items-center justify-center gap-2
        px-4 py-2
        text-sm font-bold
        transition-colors
        ${
          isActive
            ? 'bg-zinc-700 text-zinc-100'
            : 'text-zinc-400 hover:text-zinc-200'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        rounded-md
        flex-1
        ${className}
      `}
    >
      {icon}
      {children}
    </button>
  );
}

export interface TabPanelProps {
  /** Panel identifier (must match Tab value) */
  value: string;
  /** Panel content */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

export function TabPanel({ value, children, className = '' }: TabPanelProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabPanel must be used within a Tabs component');
  }

  const { activeTab } = context;
  const isActive = activeTab === value;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      className={className}
    >
      {children}
    </div>
  );
}

/**
 * BottomTabs Component
 * Mobile navigation tabs at bottom of screen
 */
export interface BottomTabsProps {
  /** Currently active tab */
  activeTab: string;
  /** Callback when tab changes */
  onTabChange: (tab: string) => void;
  /** Tab items */
  tabs: Array<{
    value: string;
    label: string;
    icon?: React.ReactNode;
    badge?: number;
    highlight?: boolean;
  }>;
  /** Additional className */
  className?: string;
}

export function BottomTabs({
  activeTab,
  onTabChange,
  tabs,
  className = '',
}: BottomTabsProps) {
  return (
    <nav
      className={`
        fixed bottom-0 left-0 right-0
        bg-zinc-900 border-t border-zinc-800
        px-2 pb-safe
        ${className}
      `}
    >
      <div className="flex justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={`
                flex flex-col items-center justify-center
                py-2 px-3 min-w-[64px]
                transition-colors
                ${tab.highlight ? 'text-red-500' : isActive ? 'text-zinc-100' : 'text-zinc-500'}
              `}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default Tabs;
