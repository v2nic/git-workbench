import React, { memo, useCallback } from 'react'
import { Button } from './ui/Button'
import { GitPullRequest, CheckCircle, XCircle, AlertCircle, Clock, Copy, ExternalLink, FolderPlus, Github, Star, FolderOpen } from 'lucide-react'
import { PRNotification } from '@/types/github'
import { useUserInfo } from '../data/useUserInfo'
import { useWorktrees } from '../data/useWorktrees'
import { useWorktreeCreation } from '../hooks/useWorktreeCreation'
import { CopyLabel } from './CopyLabel'
import clsx from 'clsx'

interface PRRowProps {
  pr: PRNotification
  onCopyNumber?: (number: number) => void
  onCreateWorktree?: (repoName: string) => void
  onCreateFromBranch?: (repoName: string, branchName: string) => void
}

export const PRRow = memo(function PRRow({ pr, onCopyNumber, onCreateWorktree, onCreateFromBranch }: PRRowProps) {
  const { userInfo } = useUserInfo()
  const { worktrees } = useWorktrees()
  const { handleCreateWorktree } = useWorktreeCreation({ pr, onCreateFromBranch, onCreateWorktree })

  const handleOpenPR = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.open(pr.url, '_blank')
    }
  }, [pr.url])

  const handleOpenWorktree = useCallback(() => {
    const worktree = worktrees.find(w => w.branch === pr.headRef)
    if (worktree) {
      if (typeof window !== 'undefined') {
        window.open(`file://${worktree.path}`, '_blank')
      }
    }
  }, [pr.headRef, worktrees])

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else {
      return 'just now'
    }
  }

  const hasMatchingWorktree = worktrees.some(w => w.branch === pr.headRef)
  const isCurrentUserAuthor = userInfo?.githubUsername === pr.author.login

  const getStatusIcon = () => {
    if (pr.merged) {
      return <GitPullRequest className="w-4 h-4 text-purple-500" />
    }
    
    // Show draft PRs with gray color
    if (pr.draft) {
      return <GitPullRequest className="w-4 h-4 text-gray-400" />
    }
    
    switch (pr.state) {
      case 'open':
        return <GitPullRequest className="w-4 h-4 text-green-500" />
      case 'closed':
        return <GitPullRequest className="w-4 h-4 text-red-500" />
      default:
        return <GitPullRequest className="w-4 h-4 text-gray-500" />
    }
  }

  const getReviewStatusIcon = () => {
    switch (pr.reviewDecision) {
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'CHANGES_REQUESTED':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'REVIEW_REQUIRED':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return null
    }
  }

  const getReasonBadge = () => {
    const colors = {
      author: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      review_requested: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      reviewed: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      commenter: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      notification: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      favorite: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'
    }

    const labels = {
      author: 'Author',
      review_requested: 'Review Requested',
      reviewed: 'Reviewed',
      commenter: 'Commented',
      notification: 'Notification',
      favorite: 'Favorite'
    }

    return (
      <span className={clsx(
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
        colors[pr.reason]
      )}>
        {pr.reason === 'favorite' ? (
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 dark:text-yellow-300 dark:fill-yellow-300" />
        ) : (
          labels[pr.reason]
        )}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const authorBadgeClasses = clsx(
    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
    isCurrentUserAuthor
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
  )

  return (
    <div className="p-4 border-b hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <CopyLabel 
                text={`#${pr.number}`} 
                title="Copy PR number"
                className="text-sm text-muted-foreground"
              />
              <button
                onClick={handleOpenPR}
                className="font-medium text-sm truncate text-left hover:text-blue-600 transition-colors"
                title="Open PR on GitHub"
              >
                {pr.title}
              </button>
              {pr.draft && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  Draft
                </span>
              )}
              {getReviewStatusIcon()}
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-2">
              <CopyLabel 
                text={pr.headRef} 
                title="Copy branch name"
              />
              <span>•</span>
              <span title={formatDate(pr.updatedAt)}>
                {getRelativeTime(pr.updatedAt)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {getReasonBadge()}
              {pr.author.avatarUrl && (
                <div
                  className="w-4 h-4 rounded-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${pr.author.avatarUrl})` }}
                  title={pr.author.login}
                />
              )}
              <span className={authorBadgeClasses}>
                {`@${pr.author.login}`}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          {hasMatchingWorktree ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenWorktree}
              title="Open worktree"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Open
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateWorktree}
              title={`Create worktree for ${pr.headRef}`}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Create Worktree
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for PR data to optimize re-renders
  return prevProps.pr.number === nextProps.pr.number &&
         prevProps.pr.headRef === nextProps.pr.headRef &&
         prevProps.pr.state === nextProps.pr.state &&
         prevProps.pr.updatedAt === nextProps.pr.updatedAt
})
