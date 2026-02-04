import { useState, useCallback, useEffect } from 'react'

export type Tab = 'repositories' | 'favorites' | 'worktrees'

export function useAppNavigation() {
  // Initialize tab from URL fragment, default to 'favorites'
  const getInitialTab = (): Tab => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1)
      if (hash === 'repositories' || hash === 'favorites' || hash === 'worktrees') {
        return hash as Tab
      }
    }
    return 'favorites' // Default to favorites
  }

  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab)
  const [searchQuery, setSearchQuery] = useState('')

  // Update URL fragment when tab changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const newHash = activeTab === 'favorites' ? '' : `#${activeTab}`
      window.history.replaceState(null, '', newHash)
    }
  }, [activeTab])

  // Listen for browser back/forward to sync tab state
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      if (hash === 'repositories' || hash === 'favorites' || hash === 'worktrees') {
        setActiveTab(hash as Tab)
      } else if (!hash) {
        setActiveTab('favorites')
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', handleHashChange)
      return () => window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const jumpToRepo = useCallback((repoName: string) => {
    setActiveTab('worktrees')
    setSearchQuery('')
    // In a real implementation, we might store the target repo for scrolling
  }, [])

  const jumpToWorktrees = useCallback(() => {
    setActiveTab('worktrees')
  }, [])

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    jumpToRepo,
    jumpToWorktrees
  }
}
