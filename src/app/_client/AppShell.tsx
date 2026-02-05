'use client'

import { useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { TopTabs } from './components/TopTabs'
import { RepoListView } from './components/RepoListView'
import { WorktreesView } from './components/WorktreesView'
import { PullRequestsView } from './components/PullRequestsView'
import { CreateWorktreeModal } from './components/CreateWorktreeModal'
import { CreateRepoModal } from './components/CreateRepoModal'
import { CloneRepoModal } from './components/CloneRepoModal'
import { ToastContainer } from './components/ui/ToastContainer'
import { useAppNavigation } from './state/useAppNavigation'
import { useConfig } from './data/useConfig'
import { useWorktrees } from './data/useWorktrees'
import { useRepos } from './data/useRepos'
import { useToast } from './hooks/useToast'
import { Worktree } from '@/types/worktrees'
import { CreateRepoData } from '@/types/config'
import { generateSlug } from 'random-word-slugs'

export function AppShell() {
  const searchParams = useSearchParams()
  const { 
    activeTab, 
    setActiveTab, 
    searchQuery, 
    setSearchQuery, 
    jumpToRepo,
    jumpToRepoPullRequests
  } = useAppNavigation()
  
  const { config, mutate: mutateConfig } = useConfig()
  const { worktrees, mutate: mutateWorktrees } = useWorktrees()
  const { mutate: mutateRepos } = useRepos()
  const { toasts, success, error, removeToast } = useToast()

  const [createWorktreeModalOpen, setCreateWorktreeModalOpen] = useState(false)
  const [createRepoModalOpen, setCreateRepoModalOpen] = useState(false)
  const [cloneRepoModalOpen, setCloneRepoModalOpen] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState('')
  const [fromBranch, setFromBranch] = useState<string | undefined>()
  const [worktreeFilterRepo, setWorktreeFilterRepo] = useState<string | undefined>()
  const [highlightPRNumber, setHighlightPRNumber] = useState<number | undefined>()
  const [highlightPRRepository, setHighlightPRRepository] = useState<string | undefined>()

  // Get repository filter from URL parameter
  const pullRequestFilterRepo = useMemo(() => {
    return searchParams.get('repo') || undefined
  }, [searchParams])

  const handleToggleFavorite = useCallback((repoName: string) => {
    mutateConfig()
  }, [mutateConfig])

  const handleJumpToWorktrees = useCallback((repoName: string) => {
    setWorktreeFilterRepo(repoName)
    setActiveTab('worktrees')
  }, [])

  const handleJumpToPullRequests = useCallback((repoName: string) => {
    jumpToRepoPullRequests(repoName)
  }, [jumpToRepoPullRequests])

  const handleCreateWorktree = useCallback((repoName: string) => {
    setSelectedRepo(repoName)
    setFromBranch('origin/main') // Default to origin/main
    setCreateWorktreeModalOpen(true)
  }, [])

  const handleCreateFromBranch = useCallback((repoName: string, branchName: string) => {
    setSelectedRepo(repoName)
    setFromBranch(branchName) // Set to specific branch
    setCreateWorktreeModalOpen(true)
  }, [])

  const handleTabChange = useCallback((tab: 'repositories' | 'favorites' | 'worktrees' | 'pull-requests') => {
    setActiveTab(tab)
    if (tab !== 'worktrees') {
      setWorktreeFilterRepo(undefined) // Clear filter when leaving worktrees tab
    }
    // Pull request filter is now handled by URL parameters, no need to clear
  }, [])

  const handleNavigateToPR = useCallback((prNumber: number, prRepository: string) => {
    setHighlightPRNumber(prNumber)
    setHighlightPRRepository(prRepository)
    setActiveTab('pull-requests')
  }, [])

  const handleClearWorktreeFilter = useCallback(() => {
    setWorktreeFilterRepo(undefined)
  }, [])

  const handleClearPullRequestFilter = useCallback(() => {
    // Navigate to pull requests without the repo parameter
    setActiveTab('pull-requests')
  }, [setActiveTab])

  const handleCreateWorktreeSubmit = useCallback(async (repoName: string, branchName: string, worktreeName: string, startPoint?: string) => {
    try {
      const response = await fetch('/api/worktrees/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoFullNameOrName: repoName,
          worktreeName,
          ref: startPoint
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create worktree')
      }

      const result = await response.json()
      console.log('Worktree created successfully:', result)
      
      success(`Worktree '${worktreeName}' created successfully!`)
      setCreateWorktreeModalOpen(false)
    } catch (err) {
      console.error('Failed to create worktree:', err)
      throw err
    }
  }, [success])

  const handleCreateRepo = useCallback(() => {
    setCreateRepoModalOpen(true)
  }, [])

  const generateDefaultRepoName = useCallback(() => {
    // Generate cute random word combinations like "happy-purple-dragon"
    const slug = generateSlug(2) // Generate 2 words for shorter names
    return slug.replace(/-/g, '-') // Keep the kebab case
  }, [])

  const handleCloneRepo = useCallback(() => {
    setCloneRepoModalOpen(true)
  }, [])

  const handlePublishRepo = useCallback(async (repoName: string) => {
    try {
      // Refresh repos list to show updated SSH URL
      await mutateRepos()
      success(`Repository '${repoName}' published successfully!`)
    } catch (err) {
      console.error('Failed to refresh repositories after publish:', err)
      error('Repository was published but failed to refresh the list')
    }
  }, [mutateRepos, success, error])

  const handleCreateRepoSubmit = useCallback(async (repoData: CreateRepoData) => {
    try {
      const response = await fetch('/api/repos/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(repoData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create repository')
      }

      const result = await response.json()
      console.log('Repository created successfully:', result)
      
      // Refresh repos list to show new repository
      await mutateRepos()
      
      return result
    } catch (err) {
      console.error('Failed to create repository:', err)
      throw err
    }
  }, [mutateRepos])

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="bg-muted/30 border-b">
        <TopTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </header>

      <main className="flex-1 overflow-hidden">
        {activeTab === 'repositories' && (
          <RepoListView
            showFavoritesOnly={false}
            onToggleFavorite={handleToggleFavorite}
            onJumpToWorktrees={handleJumpToWorktrees}
            onCreateWorktree={handleCreateWorktree}
            onCloneRepo={handleCloneRepo}
            onAddRepo={handleCreateRepo}
            onJumpToPullRequests={jumpToRepoPullRequests}
            onPublishRepo={handlePublishRepo}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {activeTab === 'favorites' && (
          <RepoListView
            showFavoritesOnly={true}
            onToggleFavorite={handleToggleFavorite}
            onJumpToWorktrees={handleJumpToWorktrees}
            onCreateWorktree={handleCreateWorktree}
            onCloneRepo={handleCloneRepo}
            onAddRepo={handleCreateRepo}
            onJumpToPullRequests={jumpToRepoPullRequests}
            onPublishRepo={handlePublishRepo}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {activeTab === 'worktrees' && (
          <WorktreesView
            onCreateWorktree={handleCreateWorktree}
            onCreateFromBranch={handleCreateFromBranch}
            filterRepo={worktreeFilterRepo}
            onClearFilter={handleClearWorktreeFilter}
            onSuccess={success}
            onError={error}
            onNavigateToPR={handleNavigateToPR}
          />
        )}

        {activeTab === 'pull-requests' && (
          <PullRequestsView
            onCreateWorktree={handleCreateWorktree}
            onCreateFromBranch={handleCreateFromBranch}
            onSuccess={success}
            onError={error}
            highlightPRNumber={highlightPRNumber}
            highlightPRRepository={highlightPRRepository}
            filterRepo={pullRequestFilterRepo}
            onClearFilter={handleClearPullRequestFilter}
          />
        )}
      </main>

      {/* Create Repo Modal */}
      <CreateRepoModal
        isOpen={createRepoModalOpen}
        onClose={() => setCreateRepoModalOpen(false)}
        onCreateRepo={handleCreateRepoSubmit}
        onSuccess={success}
        onError={error}
        onNavigateToWorktrees={handleJumpToWorktrees}
        defaultRepoName={createRepoModalOpen ? generateDefaultRepoName() : undefined}
      />

      {/* Clone Repo Modal */}
      <CloneRepoModal
        isOpen={cloneRepoModalOpen}
        onClose={() => setCloneRepoModalOpen(false)}
        onSuccess={success}
        onError={error}
        onNavigateToWorktrees={handleJumpToWorktrees}
      />

      {/* Create Worktree Modal */}
      <CreateWorktreeModal
        isOpen={createWorktreeModalOpen}
        onClose={() => setCreateWorktreeModalOpen(false)}
        repoName={selectedRepo}
        fromBranch={fromBranch}
        onCreateWorktree={handleCreateWorktreeSubmit}
        onSuccess={success}
        onError={error}
        onNavigateToWorktrees={handleJumpToWorktrees}
      />

      {/* Toast Container */}
      <ToastContainer 
        toasts={toasts} 
        onRemoveToast={removeToast} 
      />
    </div>
  )
}

export default AppShell
