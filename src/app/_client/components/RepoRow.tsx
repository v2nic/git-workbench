import React, { memo, useCallback } from 'react'
import { Repo } from '@/types/repos'
import { Button } from './ui/Button'
import { Star, GitBranchPlus, GitBranch, ExternalLink, Download } from 'lucide-react'
import clsx from 'clsx'

interface RepoRowProps {
  repo: Repo
  onToggleFavorite: (repoName: string) => void
  onJumpToWorktrees: (repoName: string) => void
  onCreateWorktree: (repoName: string) => void
  onCloneRepo?: (repoName: string) => void
  needsClone?: boolean
}

export const RepoRow = memo(function RepoRow({
  repo,
  onToggleFavorite,
  onJumpToWorktrees,
  onCreateWorktree,
  onCloneRepo,
  needsClone
}: RepoRowProps) {
  const handleToggleFavorite = useCallback(() => {
    onToggleFavorite(repo.repoName)
  }, [repo.repoName, onToggleFavorite])

  const handleJumpToWorktrees = useCallback(() => {
    onJumpToWorktrees(repo.repoName)
  }, [repo.repoName, onJumpToWorktrees])

  const handleCreateWorktree = useCallback(() => {
    onCreateWorktree(repo.repoName)
  }, [repo.repoName, onCreateWorktree])

  const handleCloneRepo = useCallback(() => {
    if (onCloneRepo) {
      onCloneRepo(repo.repoName)
    }
  }, [repo.repoName, onCloneRepo])

  return (
    <div className="border-b p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleToggleFavorite}
            className="text-muted-foreground hover:text-yellow-500 transition-colors"
            aria-label={repo.favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className={clsx('w-5 h-5', repo.favorite && 'fill-yellow-500 text-yellow-500')} />
          </button>
          
          <div>
            <h3 className="font-medium">{repo.repoName}</h3>
            {repo.fullName && (
              <p className="text-sm text-muted-foreground">{repo.fullName}</p>
            )}
            {repo.remoteUrls && repo.remoteUrls.length > 0 && (
              <div className="flex items-center space-x-2 mt-1">
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {repo.remoteUrls[0].includes('github.com') ? 'GitHub' : 'Remote'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={clsx(
            'px-2 py-1 text-xs rounded-full',
            repo.tracked 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
          )}>
            {repo.tracked ? 'Tracked' : 'Discovered'}
          </span>

          {/* Show Clone button if repo needs cloning and has remote URLs */}
          {needsClone && repo.remoteUrls && repo.remoteUrls.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCloneRepo}
              title="Clone repository"
            >
              <Download className="w-4 h-4 mr-1" />
              Clone
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleJumpToWorktrees}
          >
            <GitBranch className="w-4 h-4 mr-1" />
            Worktrees
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateWorktree}
          >
            <GitBranchPlus className="w-4 h-4 mr-1" />
            Create
          </Button>
        </div>
      </div>
    </div>
  )
})
