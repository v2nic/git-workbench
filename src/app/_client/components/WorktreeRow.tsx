import React, { memo, useCallback } from 'react'
import { Worktree } from '@/types/worktrees'
import { usePullRequest } from '../data/usePullRequest'
import { Button } from './ui/Button'
import { ExternalLink, Copy, GitBranch, MoreVertical, FolderOpen, GitPullRequest } from 'lucide-react'
import { PRNotification } from '@/types/github'
import clsx from 'clsx'

interface WorktreeRowProps {
  worktree: Worktree
  onDeleteWorktree: (worktree: Worktree) => void
  onCreateFromBranch: (repoName: string, branchName: string) => void
  allPullRequests?: PRNotification[]
  onNavigateToPR?: (prNumber: number, prRepository: string) => void
}

export const WorktreeRow = memo(function WorktreeRow({
  worktree,
  onDeleteWorktree,
  onCreateFromBranch,
  allPullRequests = [],
  onNavigateToPR
}: WorktreeRowProps) {
  const { pullRequests } = usePullRequest(worktree.repoFullName || '', worktree.branch)
  
  const matchingPR = allPullRequests.find(pr => 
    pr.headRef === worktree.branch && 
    pr.repository.toLowerCase() === (worktree.repoFullName || '').toLowerCase()
  )

  const handleOpenInGitHub = useCallback(() => {
    if (worktree.repoFullName) {
      const url = `https://github.com/${worktree.repoFullName}/tree/${worktree.branch}`
      window.open(url, '_blank')
    }
  }, [worktree.repoFullName, worktree.branch])

  const handleOpenInWindsurf = useCallback(() => {
    const url = `windsurf://file/${encodeURIComponent(worktree.path)}`
    window.open(url, '_blank')
  }, [worktree.path])

  const handleCopyBranch = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(worktree.branch)
    } catch (error) {
      console.error('Failed to copy branch name:', error)
      // Fallback for older browsers or when clipboard API is not available
      const textArea = document.createElement('textarea')
      textArea.value = worktree.branch
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }, [worktree.branch])

  const handleDeleteWorktree = useCallback(() => {
    onDeleteWorktree(worktree)
  }, [worktree, onDeleteWorktree])

  const handleCreateFromBranch = useCallback(() => {
    const repoName = worktree.repoFullName || worktree.repoName
    onCreateFromBranch(repoName, worktree.branch)
  }, [worktree, onCreateFromBranch])

  const handleNavigateToPR = useCallback(() => {
    if (matchingPR && onNavigateToPR) {
      onNavigateToPR(matchingPR.number, matchingPR.repository)
    }
  }, [matchingPR, onNavigateToPR])

  // Extract worktree name from path (last directory name)
  const worktreeName = worktree.pathRelativeToHome.split('/').pop() || worktree.pathRelativeToHome

  const isDirty = worktree.status && (
    worktree.status.staged > 0 || 
    worktree.status.modified > 0 || 
    worktree.status.untracked > 0 || 
    worktree.status.outgoing > 0
  )

  return (
    <div className="border-b p-4 hover:bg-muted/50 transition-colors">
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
            
            <span className="font-medium" title={worktree.pathRelativeToHome}>
              {worktreeName}
            </span>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-4 mt-1">
              <div className="flex items-center space-x-1">
                <GitBranch className="w-3 h-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{worktree.branch}</span>
                <button
                  onClick={handleCopyBranch}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy branch name"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>

              {worktree.status && (
                <div className="flex items-center space-x-3 text-xs">
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
                      onClick={handleNavigateToPR}
                      className="text-green-500 hover:text-green-600 transition-colors"
                      title={`Go to PR #${matchingPR.number}`}
                    >
                      <GitPullRequest className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {pullRequests.length > 0 && (
                <div className="flex items-center space-x-2">
                  {pullRequests.map((pr) => (
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
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenInWindsurf}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Open
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCreateFromBranch}
          >
            Create from this branch
          </Button>
          
          <Button
            variant={isDirty ? 'destructive' : 'secondary'}
            size="sm"
            onClick={handleDeleteWorktree}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
})
