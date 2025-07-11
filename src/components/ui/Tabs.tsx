import React, { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string | number;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
  onTabChange?: (tabId: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ 
  tabs, 
  defaultTab, 
  className = '', 
  onTabChange 
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={`w-full ${className}`}>
      {/* Tab Headers */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            
            // Only show badge if it's a positive number
            const shouldShowBadge = tab.badge !== undefined && 
              ((typeof tab.badge === 'number' && tab.badge > 0) || 
               (typeof tab.badge === 'string' && tab.badge !== '0' && tab.badge !== ''));
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                  ${isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {Icon && (
                  <Icon
                    size={20}
                    className={`mr-2 ${
                      isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                )}
                {tab.label}
                {shouldShowBadge && (
                  <span className={`
                    ml-2 py-0.5 px-2 rounded-full text-xs font-medium
                    ${isActive 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTabContent}
      </div>
    </div>
  );
};