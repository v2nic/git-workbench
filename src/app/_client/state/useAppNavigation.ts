import { useState, useCallback, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export type Tab = 'repositories' | 'favorites' | 'worktrees' | 'pull-requests'

export function useAppNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')

  // Derive activeTab from pathname - single source of truth
  // Always returns 'favorites' for SSR consistency, then updates on client
  const activeTab = useMemo((): Tab => {
    if (pathname.includes('/repositories')) return 'repositories'
    if (pathname.includes('/worktrees')) return 'worktrees'
    if (pathname.includes('/pull-requests')) return 'pull-requests'
    // Default to favorites for both SSR and any unknown paths
    return 'favorites'
  }, [pathname])

  // Navigate to a tab by updating the URL
  const setActiveTab = useCallback((tab: Tab) => {
    router.push(`/${tab}`, { scroll: false })
  }, [router])

  const jumpToRepo = useCallback((repoName: string) => {
    setSearchQuery('')
    router.push('/worktrees', { scroll: false })
  }, [router])

  const jumpToWorktrees = useCallback(() => {
    router.push('/worktrees', { scroll: false })
  }, [router])

  const jumpToRepoPullRequests = useCallback((repoName: string) => {
    setSearchQuery('')
    router.push(`/pull-requests?repo=${encodeURIComponent(repoName)}`, { scroll: false })
  }, [router])

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    jumpToRepo,
    jumpToWorktrees,
    jumpToRepoPullRequests
  }
}
