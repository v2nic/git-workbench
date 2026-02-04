import React, { useMemo, useCallback } from 'react'
import { useWorktrees } from '../data/useWorktrees'
import { useRepos } from '../data/useRepos'
import { WorktreeRow } from './WorktreeRow'
import { Button } from './ui/Button'
import { GitBranchPlus } from 'lucide-react'
import { Worktree } from '@/types/worktrees'
import clsx from 'clsx'

interface WorktreesViewProps {
  onCreateWorktree: (repoName: string) => void
  onCreateFromBranch: (repoName: string, branchName: string) => void
  filterRepo?: string
  onClearFilter?: () => void
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

export function WorktreesView({ onCreateWorktree, onCreateFromBranch, filterRepo, onClearFilter, onSuccess, onError }: WorktreesViewProps) {
  const { worktrees, isLoading, error, mutate } = useWorktrees()
  const { repos } = useRepos()

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
          worktreePath: worktree.path
        })
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.requiresConfirmation) {
          // In a real implementation, show a confirmation dialog
          const confirmed = window.confirm(
            `Worktree is not clean:\n` +
            `Staged: ${error.status.staged}\n` +
            `Modified: ${error.status.modified}\n` +
            `Untracked: ${error.status.untracked}\n` +
            `Outgoing: ${error.status.outgoing}\n\n` +
            `Delete anyway?`
          )
          if (!confirmed) return
        } else {
          throw new Error(error.error)
        }
      }

      // Refresh worktrees
      mutate()
      onSuccess?.(`Worktree '${worktree.pathRelativeToHome}' deleted successfully`)
    } catch (error) {
      console.error('Failed to delete worktree:', error)
      onError?.(`Failed to delete worktree: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [mutate, onSuccess, onError])

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Failed to load worktrees</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {filterRepo && (
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing worktrees for: <strong>{filterRepo}</strong>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilter}
            >
              Clear Filter
            </Button>
          </div>
        </div>
      )}
      
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
                <div key={repoName} className={clsx('border-b', isFavorite && 'bg-yellow-50/50 dark:bg-yellow-900/10')}>
                  <div className="p-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{repoName}</h3>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onCreateWorktree(repoName)}
                      >
                        <GitBranchPlus className="w-4 h-4 mr-1" />
                        Create Worktree
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    {repoWorktrees.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <p className="text-sm">No worktrees yet. Create your first worktree above!</p>
                      </div>
                    ) : (
                      <div>
                        {repoWorktrees.map((worktree) => (
                          <WorktreeRow
                            key={worktree.path}
                            worktree={worktree}
                            onDeleteWorktree={handleDeleteWorktree}
                            onCreateFromBranch={onCreateFromBranch}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
