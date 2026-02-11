import React, { memo, forwardRef } from 'react'
import { Worktree } from '@/types/worktrees'
import { PRNotification } from '@/types/github'
import { ExternalLink } from 'lucide-react'
import { useWorktreeAnimation } from '../hooks/useWorktreeAnimation'
import { useWorktreeActions } from '../hooks/useWorktreeActions'
import { useWorktreeData } from '../hooks/useWorktreeData'
import { WorktreeHeader } from './WorktreeHeader'
import { WorktreeBranchInfo } from './WorktreeBranchInfo'
import { WorktreeActions } from './WorktreeActions'
import clsx from 'clsx'

interface WorktreeRowProps {
  worktree: Worktree
  onDeleteWorktree: (worktree: Worktree) => void
  onCreateFromBranch: (repoName: string, branchName: string) => void
  allPullRequests?: PRNotification[]
  onNavigateToPR?: (prNumber: number, prRepository: string) => void
  isHighlighted?: boolean
  onClearHighlight?: () => void
}

export const WorktreeRow = memo(forwardRef(function WorktreeRow({
  worktree,
  onDeleteWorktree,
  onCreateFromBranch,
  allPullRequests = [],
  onNavigateToPR,
  isHighlighted = false,
  onClearHighlight
}: WorktreeRowProps, ref: React.Ref<HTMLDivElement>) {
  // Use extracted hooks
  const { getAnimationClass } = useWorktreeAnimation({ isHighlighted })
  const { worktreeName, isDirty, matchingPR } = useWorktreeData({ worktree, allPullRequests })
  const {
    handleOpenInGitHub,
    handleOpenInWindsurf,
    handleDeleteWorktree,
    handleCreateFromBranch,
    handleNavigateToPR
  } = useWorktreeActions({
    worktree,
    onDeleteWorktree,
    onCreateFromBranch,
    onNavigateToPR,
    matchingPR
  })

  return (
    <div ref={ref} className={clsx(
      'border-b p-4 hover:bg-muted/50 transition-colors',
      isHighlighted && 'worktree-highlight-permanent dark:worktree-highlight-permanent-dark',
      getAnimationClass()
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenInGitHub}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Open in GitHub"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <WorktreeHeader
                  worktree={worktree}
                  worktreeName={worktreeName}
                />
              </div>
              
              <WorktreeBranchInfo
                worktree={worktree}
                worktreeName={worktreeName}
                isDirty={isDirty}
                pullRequests={allPullRequests}
                matchingPR={matchingPR}
                onNavigateToPR={handleNavigateToPR}
              />
            </div>
          </div>
        </div>

        <WorktreeActions
          worktreePath={worktree.path}
          onOpenInWindsurf={handleOpenInWindsurf}
          onCreateFromBranch={handleCreateFromBranch}
          onDeleteWorktree={handleDeleteWorktree}
        />
      </div>
    </div>
  )
}))
