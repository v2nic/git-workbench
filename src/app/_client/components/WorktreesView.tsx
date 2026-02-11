import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useWorktrees } from '../data/useWorktrees'
import { useRepos } from '../data/useRepos'
import { usePullRequests } from '../data/usePullRequests'
import { useConfig } from '../data/useConfig'
import { WorktreeRow } from './WorktreeRow'
import { FilterBanner } from './FilterBanner'
import { RepositoryHeader } from './RepositoryHeader'
import { DeleteWorktreeModal } from './DeleteWorktreeModal'
import { StateMismatchModal } from './StateMismatchModal'
import { Button } from './ui/Button'
import { GitBranchPlus } from 'lucide-react'
import { Worktree, WorktreeStatus } from '@/types/worktrees'
import { getWorktreeName } from '../utils/worktreeUtils'
import clsx from 'clsx'

interface WorktreesViewProps {
  onCreateWorktree: (repoName: string) => void
  onCreateFromBranch: (repoName: string, branchName: string) => void
  filterRepo?: string
  onClearFilter?: () => void
  onFilterByRepository?: (repoName: string) => void
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
  onNavigateToPR?: (prNumber: number, prRepository: string) => void
}

export function WorktreesView({ onCreateWorktree, onCreateFromBranch, filterRepo, onClearFilter, onFilterByRepository, onSuccess, onError, onNavigateToPR }: WorktreesViewProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { worktrees, isLoading, error, mutate } = useWorktrees()
  const { repos } = useRepos()
  const { pullRequests } = usePullRequests()
  const { config } = useConfig()
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [pendingDeleteWorktree, setPendingDeleteWorktree] = useState<Worktree | null>(null)
  const [pendingDeleteStatus, setPendingDeleteStatus] = useState<WorktreeStatus | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [stateMismatchOpen, setStateMismatchOpen] = useState(false)
  const [mismatches, setMismatches] = useState<any[]>([])
  
  const worktreeRowRefs = useRef<Map<string, HTMLElement>>(new Map())
  const [highlightWorktreeName, setHighlightWorktreeName] = useState<string | undefined>()
  
  // Read worktree highlight from URL parameter
  useEffect(() => {
    const encoded = searchParams.get('worktree')
    const worktreeName = encoded ? decodeURIComponent(encoded) : undefined
    setHighlightWorktreeName(worktreeName)
  }, [searchParams])

  // Clear highlight by updating URL without worktree parameter
  const clearHighlight = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('worktree')
    const newUrl = params.toString() ? `/worktrees?${params.toString()}` : '/worktrees'
    router.push(newUrl, { scroll: false })
    setHighlightWorktreeName(undefined)
  }, [searchParams, router])

  // Scroll to highlighted worktree once it appears in the DOM (permanent highlight)
  useEffect(() => {
    if (!highlightWorktreeName) return

    // Find worktree by name instead of path
    const targetWorktree = worktrees.find(worktree => getWorktreeName(worktree) === highlightWorktreeName)
    if (!targetWorktree) return

    const worktreeElement = worktreeRowRefs.current.get(targetWorktree.path)
    if (!worktreeElement) return

    setTimeout(() => {
      worktreeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }, [highlightWorktreeName, worktrees])

  // Group worktrees by repository and include all repos
  const worktreesByRepo = useMemo(() => {
    const grouped = new Map<string, Worktree[]>()
    
    // Add worktrees to their respective repos
    worktrees.forEach(worktree => {
      const key = worktree.repoName
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(worktree)
    })

    // If not filtering, only include repos that have worktrees
    // If filtering, include all repos (so the target repo is always shown)
    if (filterRepo) {
      // When filtering, make sure the target repo is included even if it has no worktrees
      repos.forEach(repo => {
        const matchesFilter = repo.repoName === filterRepo || repo.fullName === filterRepo
        if (matchesFilter && !grouped.has(repo.repoName)) {
          grouped.set(repo.repoName, [])
        }
      })
    }

    // Get entries AFTER we've potentially added empty repos
    let entries = Array.from(grouped.entries())
    
    if (filterRepo) {
      entries = entries.filter(([repoName]) => {
        const repo = repos.find(r => r.repoName === repoName)
        return repo && (repo.repoName === filterRepo || repo.fullName === filterRepo)
      })
    }

    // Sort repositories: favorites first, then alphabetically
    const sortedEntries = entries.sort(([a], [b]) => {
      const repoA = repos.find(r => r.repoName === a)
      const repoB = repos.find(r => r.repoName === b)
      
      if (repoA?.favorite && !repoB?.favorite) return -1
      if (!repoA?.favorite && repoB?.favorite) return 1
      
      return a.localeCompare(b)
    })

    return sortedEntries
  }, [worktrees, repos, filterRepo])

  const handleDeleteWorktree = useCallback(async (worktree: Worktree) => {
    try {
      const response = await fetch('/api/worktrees/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: worktree.repoFullName || worktree.repoName,
          worktreePath: worktree.path,
          expectedStatus: worktree.status
        })
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.requiresConfirmation) {
          if (error.mismatches) {
            // State mismatch - show detailed modal
            setPendingDeleteWorktree(worktree)
            setMismatches(error.mismatches)
            setStateMismatchOpen(true)
          } else {
            // Regular dirty state confirmation
            setPendingDeleteWorktree(worktree)
            setPendingDeleteStatus(error.status)
            setDeleteModalOpen(true)
          }
          return
        } else {
          throw new Error(error.error)
        }
      }

      mutate()
      onSuccess?.(`Worktree '${worktree.pathRelativeToHome}' deleted successfully`)
    } catch (error) {
      console.error('Failed to delete worktree:', error)
      onError?.(`Failed to delete worktree: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [mutate, onSuccess, onError])

  const handleRefreshStatus = useCallback(async () => {
    if (!pendingDeleteWorktree) return
    
    // Re-fetch worktrees to get updated status
    await mutate()
    setStateMismatchOpen(false)
    setMismatches([])
    onSuccess?.('Worktree status refreshed')
  }, [pendingDeleteWorktree, mutate, onSuccess])

  const handleForceDeleteWithMismatch = useCallback(async () => {
    if (!pendingDeleteWorktree) return

    setIsDeleting(true)
    try {
      const response = await fetch('/api/worktrees/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: pendingDeleteWorktree.repoFullName || pendingDeleteWorktree.repoName,
          worktreePath: pendingDeleteWorktree.path,
          force: true,
          expectedStatus: pendingDeleteWorktree.status
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete worktree')
      }

      setStateMismatchOpen(false)
      setPendingDeleteWorktree(null)
      setMismatches([])
      mutate()
      onSuccess?.(`Worktree '${pendingDeleteWorktree.pathRelativeToHome}' deleted successfully`)
    } catch (error) {
      console.error('Failed to delete worktree:', error)
      onError?.(`Failed to delete worktree: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDeleting(false)
    }
  }, [pendingDeleteWorktree, mutate, onSuccess, onError])

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeleteWorktree) return

    setIsDeleting(true)
    try {
      const response = await fetch('/api/worktrees/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: pendingDeleteWorktree.repoFullName || pendingDeleteWorktree.repoName,
          worktreePath: pendingDeleteWorktree.path,
          force: true,
          expectedStatus: pendingDeleteWorktree.status
        })
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.mismatches) {
          // Even with force, show state mismatch warning
          const mismatchDetails = error.mismatches.map((m: any) => {
            if (m.type === 'untracked' && m.newFiles) {
              return `${m.actual - m.expected} new untracked files: ${m.newFiles.join(', ')}`
            } else if (m.hashMismatch) {
              return `File list changed for ${m.type} files`
            } else {
              return `${m.type} files changed: ${m.expected} → ${m.actual}`
            }
          }).join(', ')
          
          onError?.(`Warning: Worktree state changed during deletion: ${mismatchDetails}. Proceeding anyway.`)
        } else {
          throw new Error(error.error || 'Failed to delete worktree')
        }
      }

      setDeleteModalOpen(false)
      setPendingDeleteWorktree(null)
      setPendingDeleteStatus(null)
      mutate()
      onSuccess?.(`Worktree '${pendingDeleteWorktree.pathRelativeToHome}' deleted successfully`)
    } catch (error) {
      console.error('Failed to delete worktree:', error)
      onError?.(`Failed to delete worktree: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDeleting(false)
    }
  }, [pendingDeleteWorktree, mutate, onSuccess, onError])

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Failed to load worktrees</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <FilterBanner
        filterValue={filterRepo}
        filterType="worktrees"
        onClearFilter={onClearFilter}
      />
      
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">Loading worktrees...</p>
          </div>
        ) : worktreesByRepo.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">
              {filterRepo ? `No repository found matching ${filterRepo}` : 'No repositories found'}
            </p>
          </div>
        ) : (
          <div>
            {worktreesByRepo.map(([repoName, repoWorktrees]) => {
              const repo = repos.find(r => r.repoName === repoName)
              const isFavorite = repo?.favorite

              return (
                <div key={repoName}>
                  <RepositoryHeader
                    repositoryName={repoName}
                    showFilterButton={!!onFilterByRepository}
                    isFilterActive={filterRepo === repoName}
                    onToggleFilter={onFilterByRepository}
                    onClearFilter={onClearFilter}
                    actionButton={{
                      label: 'Create Worktree',
                      onClick: () => onCreateWorktree(repoName),
                      icon: <GitBranchPlus className="w-4 h-4 mr-1" />,
                      variant: 'primary'
                    }}
                  />
                  
                  <div>
                    {repoWorktrees.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <p className="text-sm">No worktrees yet. Create your first worktree above!</p>
                      </div>
                    ) : (
                      <div>
                        {repoWorktrees.map((worktree) => {
                          const setRef = (element: HTMLDivElement | null) => {
                            if (element) {
                              worktreeRowRefs.current.set(worktree.path, element)
                            } else {
                              worktreeRowRefs.current.delete(worktree.path)
                            }
                          }
                          
                          return (
                            <WorktreeRow
                              key={worktree.path}
                              ref={setRef}
                              worktree={worktree}
                              editorConfig={config!.editor}
                              onDeleteWorktree={handleDeleteWorktree}
                              onCreateFromBranch={onCreateFromBranch}
                              allPullRequests={pullRequests}
                              onNavigateToPR={onNavigateToPR}
                              isHighlighted={highlightWorktreeName === getWorktreeName(worktree)}
                              onClearHighlight={clearHighlight}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <DeleteWorktreeModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setPendingDeleteWorktree(null)
          setPendingDeleteStatus(null)
        }}
        worktree={pendingDeleteWorktree}
        status={pendingDeleteStatus}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />

      <StateMismatchModal
        isOpen={stateMismatchOpen}
        onClose={() => {
          setStateMismatchOpen(false)
          setPendingDeleteWorktree(null)
          setMismatches([])
        }}
        worktree={pendingDeleteWorktree}
        mismatches={mismatches}
        onRefresh={handleRefreshStatus}
        onForceDelete={handleForceDeleteWithMismatch}
        isLoading={isDeleting}
      />
    </div>
  )
}
