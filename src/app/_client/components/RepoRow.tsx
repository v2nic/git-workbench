import React, { memo, useCallback, useState, useEffect, useRef } from 'react'
import { Repo } from '@/types/repos'
import { Button } from './ui/Button'
import { Star, GitBranchPlus, GitBranch, Download, MoreVertical, Trash2, GitPullRequest, Upload, Plus, FolderTree } from 'lucide-react'
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
  onJumpToBranches?: (repoName: string) => void
  onPublishRepo?: (repoName: string) => void
  onTrackRepo?: (repoName: string) => void
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
  onJumpToBranches,
  onPublishRepo,
  onTrackRepo,
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

  const handleJumpToBranches = useCallback(() => {
    if (onJumpToBranches) {
      onJumpToBranches(repo.repoName)
    }
  }, [repo.repoName, onJumpToBranches])

  const handlePublishRepo = useCallback(() => {
    setShowPublishModal(true)
  }, [])

  const handleTrackRepo = useCallback(() => {
    if (onTrackRepo) {
      onTrackRepo(repo.repoName)
    }
  }, [repo.repoName, onTrackRepo])

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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleFavorite}
            className="text-muted-foreground hover:text-yellow-500"
            aria-label={repo.favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className={clsx('w-5 h-5', repo.favorite && 'fill-yellow-500 text-yellow-500')} />
          </Button>
          
          <div>
            <h3 
              className={clsx(
                'font-medium cursor-pointer transition-colors',
                repo.remoteUrls?.some(url => url.includes('github.com')) && 'hover:text-blue-600'
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

          {/* Show Track button if repo is untracked */}
          {!repo.tracked && onTrackRepo && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleTrackRepo}
              title="Track this repository"
            >
              <Plus className="w-4 h-4 mr-1" />
              Track
            </Button>
          )}

          {/* Show Clone button if repo needs cloning and has remote URLs */}
          {needsClone && repo.remoteUrls && repo.remoteUrls.length > 0 && (
            <Button
              variant="primary"
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
              variant="primary"
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
            <FolderTree className="w-4 h-4 mr-1" />
            Worktrees
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleJumpToBranches}
          >
            <GitBranch className="w-4 h-4 mr-1" />
            Branches
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
            Create worktree
          </Button>

          {/* Three-dot menu */}
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMenuToggle}
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-background border rounded-md shadow-lg z-50 min-w-[160px]">
                <Button
                  onClick={handleDeleteClick}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete repository</span>
                </Button>
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
              <Button
                onClick={() => setShowDeleteDialog(false)}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteRepo}
                variant="destructive"
              >
                Delete
              </Button>
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
