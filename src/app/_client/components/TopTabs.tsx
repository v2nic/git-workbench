import React from 'react'
import { Tab } from '../state/useAppNavigation'
import { Button } from './ui/Button'
import clsx from 'clsx'

interface TopTabsProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function TopTabs({ activeTab, onTabChange }: TopTabsProps) {
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'favorites', label: 'Favorites' },
    { id: 'repositories', label: 'Repositories' },
    { id: 'worktrees', label: 'Worktrees' },
    { id: 'branches', label: 'Branches' },
    { id: 'pull-requests', label: 'Pull Requests' }
  ]

  return (
    <div className="border-b">
      <nav className="flex space-x-8 px-6" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
