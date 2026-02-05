import React, { memo, useCallback, useState, useEffect, useRef } from 'react'
import { Repo } from '@/types/repos'
import { Button } from './ui/Button'
import { Star, GitBranchPlus, GitBranch, Download, MoreHorizontal, Trash2, GitPullRequest, Upload } from 'lucide-react'
import { PublishRepoModal } from './PublishRepoModal'
import clsx from 'clsx'

interface RepoRowProps {
  repo: Repo
  onToggleFavorite: (repoName: string) => void
  onJumpToWorktrees: (repoName: string) => void
  onCreateWorktree: (repoName: string) => void
  onCloneRepo?: (repoName: string) => void
  onDeleteRepo?: (repoName: string) => void
  onJumpToPullRequests?: (repoName: string) => void
  onPublishRepo?: (repoName: string) => void
  needsClone?: boolean
}

export const RepoRow = memo(function RepoRow({
  repo,
  onToggleFavorite,
  onJumpToWorktrees,
  onCreateWorktree,
  onCloneRepo,
  onDeleteRepo,
  onJumpToPullRequests,
  onPublishRepo,
  needsClone
}: RepoRowProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])
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

  const handleDeleteRepo = useCallback(() => {
    if (onDeleteRepo) {
      onDeleteRepo(repo.repoName)
      setShowDeleteDialog(false)
      setShowMenu(false)
    }
  }, [repo.repoName, onDeleteRepo])

  const handleMenuToggle = useCallback(() => {
    setShowMenu(!showMenu)
  }, [showMenu])

  const handleDeleteClick = useCallback(() => {
    setShowDeleteDialog(true)
    setShowMenu(false)
  }, [])

  const handleJumpToPullRequests = useCallback(() => {
    if (onJumpToPullRequests) {
      onJumpToPullRequests(repo.fullName || repo.repoName)
    }
  }, [repo.fullName, repo.repoName, onJumpToPullRequests])

  const handlePublishRepo = useCallback(() => {
    setShowPublishModal(true)
  }, [])

  const handlePublishSuccess = useCallback((sshUrl: string) => {
    setShowPublishModal(false)
    if (onPublishRepo) {
      onPublishRepo(repo.repoName)
    }
  }, [repo.repoName, onPublishRepo])

  const handleClosePublishModal = useCallback(() => {
    setShowPublishModal(false)
  }, [])

  const handleRepoNameClick = useCallback(() => {
    if (repo.remoteUrls && repo.remoteUrls.length > 0) {
      const githubUrl = repo.remoteUrls.find(url => url.includes('github.com'))
      if (githubUrl) {
        // Convert SSH URL to HTTPS URL if needed
        let webUrl = githubUrl
        if (githubUrl.startsWith('git@github.com:')) {
          webUrl = githubUrl
            .replace('git@github.com:', 'https://github.com/')
            .replace('.git', '')
        } else if (githubUrl.startsWith('git://github.com/')) {
          webUrl = githubUrl
            .replace('git://github.com/', 'https://github.com/')
            .replace('.git', '')
        } else if (githubUrl.startsWith('https://github.com/') && githubUrl.endsWith('.git')) {
          webUrl = githubUrl.replace('.git', '')
        }
        window.open(webUrl, '_blank')
      }
    }
  }, [repo.remoteUrls])

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
            <h3 
              className={clsx(
                'font-medium',
                repo.remoteUrls?.some(url => url.includes('github.com')) && 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer underline'
              )}
              onClick={handleRepoNameClick}
            >
              {repo.repoName}
            </h3>
            {repo.fullName && (
              <p className="text-sm text-muted-foreground">{repo.fullName}</p>
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

          {/* Show Publish button if repo is local (no SSH URL) */}
          {!repo.sshUrl && !repo.httpsUrl && onPublishRepo && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePublishRepo}
              title="Publish repository to GitHub"
            >
              <Upload className="w-4 h-4 mr-1" />
              Publish
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
            variant="secondary"
            size="sm"
            onClick={handleJumpToPullRequests}
          >
            <GitPullRequest className="w-4 h-4 mr-1" />
            Pull Requests
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateWorktree}
          >
            <GitBranchPlus className="w-4 h-4 mr-1" />
            Create
          </Button>

          {/* Three-dot menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={handleMenuToggle}
              className="p-1 rounded-md hover:bg-muted transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-background border rounded-md shadow-lg z-50 min-w-[160px]">
                <button
                  onClick={handleDeleteClick}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete repository</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteDialog(false)}
        >
          <div 
            className="bg-background border rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">Delete Repository</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete &quot;{repo.repoName}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRepo}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <PublishRepoModal
          repo={{
            repoName: repo.repoName,
            fullName: repo.fullName,
            barePath: repo.barePath
          }}
          onClose={handleClosePublishModal}
          onSuccess={handlePublishSuccess}
        />
      )}
    </div>
  )
})
