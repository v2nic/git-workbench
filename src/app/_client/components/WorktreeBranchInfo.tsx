import React from 'react'
import { Worktree } from '@/types/worktrees'
import { PRNotification } from '@/types/github'
import { CopyLabel } from './CopyLabel'
import { GitPullRequest } from 'lucide-react'
import { usePullRequest } from '../data/usePullRequest'
import clsx from 'clsx'

interface WorktreeBranchInfoProps {
  worktree: Worktree
  worktreeName: string
  isDirty: boolean
  pullRequests: PRNotification[]
  matchingPR?: PRNotification
  onNavigateToPR?: () => void
}

export const WorktreeBranchInfo: React.FC<WorktreeBranchInfoProps> = ({
  worktree,
  worktreeName,
  isDirty,
  pullRequests,
  matchingPR,
  onNavigateToPR
}) => {
  const { pullRequests: branchPullRequests } = usePullRequest(worktree.repoFullName || '', worktree.branch)

  return (
    <>
      {/* Status indicators */}
      {worktree.status && (
        <div className="flex items-center space-x-2 text-xs">
          {worktree.status.staged > 0 && (
            <span className="text-green-600 dark:text-green-400">
              staged: {worktree.status.staged}
            </span>
          )}
          {worktree.status.modified > 0 && (
            <span className="text-orange-600 dark:text-orange-400">
              modified: {worktree.status.modified}
            </span>
          )}
          {worktree.status.untracked > 0 && (
            <span className="text-red-600 dark:text-red-400">
              untracked: {worktree.status.untracked}
            </span>
          )}
          {worktree.status.incoming > 0 && (
            <span className="text-blue-600 dark:text-blue-400">
              ↓{worktree.status.incoming}
            </span>
          )}
          {worktree.status.outgoing > 0 && (
            <span className="text-purple-600 dark:text-purple-400">
              ↑{worktree.status.outgoing}
            </span>
          )}
          {!isDirty && (
            <span className="text-green-600 dark:text-green-400">
              clean
            </span>
          )}
          {matchingPR && (
            <button
              onClick={onNavigateToPR}
              className="text-green-500 hover:text-green-600 transition-colors"
              title={`Go to PR #${matchingPR.number}`}
            >
              <GitPullRequest className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
      
      {/* Branch name - only show if different from worktree name */}
      {worktree.branch !== worktreeName && (
        <div className="flex items-center space-x-1 mt-1">
          <CopyLabel 
            text={worktree.branch} 
            className="text-sm text-muted-foreground"
            title="Copy branch name"
          />
        </div>
      )}
      
      {/* PR badges from usePullRequest hook */}
      <div className="flex-1">
        {branchPullRequests.length > 0 && (
          <div className="flex items-center space-x-2">
            {branchPullRequests.map((pr) => (
              <a
                key={pr.number}
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(
                  'text-xs px-2 py-1 rounded',
                  pr.state === 'OPEN' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : pr.state === 'MERGED'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                )}
              >
                #{pr.number}
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
