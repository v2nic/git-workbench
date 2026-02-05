import React, { memo, useCallback } from 'react'
import { Button } from './ui/Button'
import { GitPullRequest, CheckCircle, XCircle, AlertCircle, Clock, Copy, ExternalLink, FolderPlus } from 'lucide-react'
import { PRNotification } from '@/types/github'
import { useUserInfo } from '../data/useUserInfo'
import { useWorktrees } from '../data/useWorktrees'
import clsx from 'clsx'

interface PRRowProps {
  pr: PRNotification
  onCopyNumber?: (number: number) => void
}

export const PRRow = memo(function PRRow({ pr, onCopyNumber }: PRRowProps) {
  const { userInfo } = useUserInfo()
  const { worktrees } = useWorktrees()

  const handleCopyNumber = useCallback(() => {
    if (onCopyNumber) {
      onCopyNumber(pr.number)
    } else {
      navigator.clipboard.writeText(pr.number.toString())
    }
  }, [pr.number, onCopyNumber])

  const handleCopyBranch = useCallback(() => {
    navigator.clipboard.writeText(pr.headRef)
  }, [pr.headRef])

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

  const handleCreateWorktree = useCallback(() => {
    // This would open a dialog or navigate to worktree creation
    // For now, we'll just log it
    console.log('Create worktree for branch:', pr.headRef)
  }, [pr.headRef])

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
  const isCurrentUserAuthor = userInfo.githubUsername === pr.author.login

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
      favorite: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
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
        {labels[pr.reason]}
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

  return (
    <div className="p-4 border-b hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
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
              <span className="font-mono">#{pr.number}</span>
              <span>•</span>
              <span className="truncate">{pr.repository}</span>
              <span>•</span>
              <button
                onClick={handleCopyBranch}
                className="hover:text-foreground transition-colors font-mono"
                title="Copy branch name"
              >
                {pr.headRef}
              </button>
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
              {isCurrentUserAuthor && (
                <span className="text-xs text-muted-foreground">
                  Author
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1 ml-4">
          {hasMatchingWorktree ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenWorktree}
              title="Open worktree"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateWorktree}
              title={`Create worktree for ${pr.headRef}`}
            >
              <FolderPlus className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyNumber}
            title="Copy PR number"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenPR}
            title="Open in GitHub"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
})
