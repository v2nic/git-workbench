'use client'

import { useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { TopTabs } from './components/TopTabs'
import { RepoListView } from './components/RepoListView'
import { WorktreesView } from './components/WorktreesView'
import { PullRequestsView } from './components/PullRequestsView'
import { BranchesView } from './components/BranchesView'
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
import { BranchReferenceProvider } from './contexts/BranchReferenceContext'

export function AppShell() {
  const searchParams = useSearchParams()
  const { 
    activeTab, 
    setActiveTab, 
    searchQuery, 
    setSearchQuery, 
    jumpToRepo,
    jumpToWorktrees,
    jumpToWorktreesForRepo,
    jumpToPullRequests,
    jumpToRepoPullRequests,
    jumpToBranches,
    jumpToRepoBranches
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
  const [highlightPRNumber, setHighlightPRNumber] = useState<number | undefined>()
  const [highlightPRRepository, setHighlightPRRepository] = useState<string | undefined>()

  // Get repository filter from URL parameter
  const worktreeFilterRepo = useMemo(() => {
    if (activeTab !== 'worktrees') return undefined
    return searchParams.get('repo') || undefined
  }, [searchParams, activeTab])

  const pullRequestFilterRepo = useMemo(() => {
    if (activeTab !== 'pull-requests') return undefined
    return searchParams.get('repo') || undefined
  }, [searchParams, activeTab])

  const branchFilterRepo = useMemo(() => {
    if (activeTab !== 'branches') return undefined
    return searchParams.get('repo') || undefined
  }, [searchParams, activeTab])

  const handleToggleFavorite = useCallback((repoName: string) => {
    mutateConfig()
  }, [mutateConfig])

  const handleJumpToWorktrees = useCallback((repoName: string, worktreePath?: string) => {
    jumpToWorktreesForRepo(repoName, worktreePath)
    mutateWorktrees()
  }, [jumpToWorktreesForRepo, mutateWorktrees])

  const handleJumpToPullRequests = useCallback((repoName: string) => {
    jumpToRepoPullRequests(repoName)
  }, [jumpToRepoPullRequests])

  const handleFilterByRepository = useCallback((repoName: string) => {
    jumpToRepoPullRequests(repoName)
  }, [jumpToRepoPullRequests])

  const handleFilterWorktreeByRepository = useCallback((repoName: string) => {
    jumpToWorktreesForRepo(repoName)
  }, [jumpToWorktreesForRepo])

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

  const handleTabChange = useCallback((tab: 'repositories' | 'favorites' | 'worktrees' | 'branches' | 'pull-requests') => {
    setActiveTab(tab)
  }, [setActiveTab])

  const handleNavigateToPR = useCallback((prNumber: number, prRepository: string) => {
    setHighlightPRNumber(prNumber)
    setHighlightPRRepository(prRepository)
    setActiveTab('pull-requests')
  }, [setActiveTab])

  const handleClearWorktreeFilter = useCallback(() => {
    jumpToWorktrees()
  }, [jumpToWorktrees])

  const handleClearPullRequestFilter = useCallback(() => {
    jumpToPullRequests()
  }, [jumpToPullRequests])

  const handleFilterBranchByRepository = useCallback((repoName: string) => {
    jumpToRepoBranches(repoName)
  }, [jumpToRepoBranches])

  const handleClearBranchFilter = useCallback(() => {
    jumpToBranches()
  }, [jumpToBranches])

  const handleJumpToWorktreeFromBranch = useCallback((repoName: string, branchName: string) => {
    jumpToWorktreesForRepo(repoName)
  }, [jumpToWorktreesForRepo])

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
      
      success(`Worktree '${worktreeName}' created successfully!`)
      setCreateWorktreeModalOpen(false)
      
      // Return the result for the caller to handle navigation/highlighting
      return result
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

  const handleTrackRepo = useCallback(async (repoName: string) => {
    try {
      const response = await fetch('/api/repos/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoNameOrFullName: repoName })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to track repository')
      }

      const result = await response.json()
      console.log('Repository tracked successfully:', result)
      
      // Refresh repos list to show updated tracking status
      await mutateRepos()
      
      success(`Repository '${repoName}' is now tracked!`)
    } catch (err) {
      console.error('Failed to track repository:', err)
      error(err instanceof Error ? err.message : 'Failed to track repository')
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
    <BranchReferenceProvider>
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
              onJumpToBranches={jumpToRepoBranches}
              onPublishRepo={handlePublishRepo}
              onTrackRepo={handleTrackRepo}
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
              onJumpToBranches={jumpToRepoBranches}
              onPublishRepo={handlePublishRepo}
              onTrackRepo={handleTrackRepo}
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
              onFilterByRepository={handleFilterWorktreeByRepository}
              onSuccess={success}
              onError={error}
              onNavigateToPR={handleNavigateToPR}
            />
          )}

          {activeTab === 'branches' && (
            <BranchesView
              filterRepo={branchFilterRepo}
              onClearFilter={handleClearBranchFilter}
              onFilterByRepository={handleFilterBranchByRepository}
              onCreateWorktree={handleCreateFromBranch}
              onJumpToWorktree={handleJumpToWorktreeFromBranch}
              onSuccess={success}
              onError={error}
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
              onFilterByRepository={handleFilterByRepository}
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
    </BranchReferenceProvider>
  )
}

export default AppShell
