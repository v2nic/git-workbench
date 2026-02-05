'use client'

import React, { useState, useCallback } from 'react'
import { TopTabs } from './components/TopTabs'
import { RepoListView } from './components/RepoListView'
import { WorktreesView } from './components/WorktreesView'
import { PullRequestsView } from './components/PullRequestsView'
import { CreateWorktreeModal } from './components/CreateWorktreeModal'
import { ToastContainer } from './components/ui/ToastContainer'
import { useAppNavigation } from './state/useAppNavigation'
import { useConfig } from './data/useConfig'
import { useWorktrees } from './data/useWorktrees'
import { useRepos } from './data/useRepos'
import { useToast } from './hooks/useToast'
import { Worktree } from '@/types/worktrees'

export default function AppShell() {
  const { 
    activeTab, 
    setActiveTab, 
    searchQuery, 
    setSearchQuery, 
    jumpToRepo 
  } = useAppNavigation()
  
  const { config, mutate: mutateConfig } = useConfig()
  const { toasts, success, error, removeToast } = useToast()
  const { mutate: mutateRepos } = useRepos()

  const [createWorktreeModalOpen, setCreateWorktreeModalOpen] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState('')
  const [fromBranch, setFromBranch] = useState<string | undefined>()
  const [worktreeFilterRepo, setWorktreeFilterRepo] = useState<string | undefined>()
  const [highlightPRNumber, setHighlightPRNumber] = useState<number | undefined>()
  const [highlightPRRepository, setHighlightPRRepository] = useState<string | undefined>()

  const handleToggleFavorite = useCallback((repoName: string) => {
    mutateConfig()
  }, [mutateConfig])

  const handleJumpToWorktrees = useCallback((repoName: string) => {
    setWorktreeFilterRepo(repoName)
    setActiveTab('worktrees')
  }, [])

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
  }, [])

  const handleNavigateToPR = useCallback((prNumber: number, prRepository: string) => {
    setHighlightPRNumber(prNumber)
    setHighlightPRRepository(prRepository)
    setActiveTab('pull-requests')
  }, [])

  const handleClearWorktreeFilter = useCallback(() => {
    setWorktreeFilterRepo(undefined)
  }, [])

  const handleCreateWorktreeSubmit = useCallback(async (repoName: string, branchName: string, worktreeName: string, startPoint?: string) => {
    try {
      const response = await fetch('/api/worktrees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoName,
          branchName,
          worktreeName,
          startPoint
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

  const handleCloneRepo = useCallback(async (repoName: string) => {
    try {
      const response = await fetch('/api/clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoName })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to clone repository')
      }

      const result = await response.json()
      console.log('Repository cloned successfully:', result)
      
      // Show success message
      success(`Repository '${repoName}' cloned successfully!`)
      
      // Refresh both config and repos data to update the UI
      await Promise.all([
        mutateConfig(),
        mutateRepos()
      ])
    } catch (err) {
      console.error('Failed to clone repository:', err)
      error(`Failed to clone repository: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [success, error, mutateConfig, mutateRepos])

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
          />
        )}
      </main>

      {/* Add Repo Modal - simplified for now */}
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
