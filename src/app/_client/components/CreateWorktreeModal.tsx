import React, { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

interface CreateWorktreeModalProps {
  isOpen: boolean
  onClose: () => void
  repoName: string
  fromBranch?: string
  onCreateWorktree: (repoName: string, branchName: string, worktreeName: string, startPoint?: string) => void
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

export function CreateWorktreeModal({
  isOpen,
  onClose,
  repoName,
  fromBranch,
  onCreateWorktree,
  onSuccess,
  onError
}: CreateWorktreeModalProps) {
  const [worktreeName, setWorktreeName] = useState('')
  const [branchName, setBranchName] = useState('')
  const [startPoint, setStartPoint] = useState(fromBranch || 'origin/main')
  const [isCreating, setIsCreating] = useState(false)

  // Auto-populate branch name when worktree name changes, unless user has manually edited it
  useEffect(() => {
    if (worktreeName && !branchName) {
      setBranchName(worktreeName)
    }
  }, [worktreeName, branchName])

  const handleClose = () => {
    if (!isCreating) {
      onClose()
      setWorktreeName('')
      setBranchName('')
      setStartPoint(fromBranch || 'origin/main')
    }
  }

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isCreating) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isCreating, handleClose])

  const handleWorktreeNameChange = (value: string) => {
    setWorktreeName(value)
    // Auto-update branch name if it's currently matching the worktree name (user hasn't manually changed it)
    if (branchName === '' || branchName === worktreeName) {
      setBranchName(value)
    }
  }

  const handleBranchNameChange = (value: string) => {
    setBranchName(value)
  }

  const handleStartPointChange = (value: string) => {
    setStartPoint(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!worktreeName.trim()) return

    const finalBranchName = fromBranch ? (branchName.trim() || worktreeName.trim()) : worktreeName.trim()
    const finalStartPoint = fromBranch ? (startPoint.trim() || 'origin/main') : 'origin/main'

    setIsCreating(true)
    try {
      await onCreateWorktree(repoName, finalBranchName, worktreeName.trim(), finalStartPoint)
      // Success/error handling is done in the parent component
      onClose()
      setWorktreeName('')
      setBranchName('')
      setStartPoint(fromBranch || 'origin/main')
    } catch (error) {
      console.error('Failed to create worktree:', error)
      // Error handling is done in the parent component
    } finally {
      setIsCreating(false)
    }
  }

  if (!isOpen) return null

  const isBranchAutoPopulated = branchName === worktreeName && worktreeName !== ''

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold mb-4">Create Worktree</h2>
        <p className="text-muted-foreground mb-4">
          Create a new worktree for repository: <strong>{repoName}</strong>
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="worktree" className="block text-sm font-medium mb-2">
              Worktree Name
            </label>
            <Input
              id="worktree"
              type="text"
              value={worktreeName}
              onChange={(e) => handleWorktreeNameChange(e.target.value)}
              placeholder="e.g., new-feature"
              disabled={isCreating}
              required
              autoFocus
            />
          </div>

          {fromBranch && (
            <>
              <div>
                <label htmlFor="branch" className="block text-sm font-medium mb-2">
                  Branch Name
                  {isBranchAutoPopulated && (
                    <span className="text-muted-foreground ml-2 text-xs">
                      (auto-populated from worktree name)
                    </span>
                  )}
                </label>
                <Input
                  id="branch"
                  type="text"
                  value={branchName}
                  onChange={(e) => handleBranchNameChange(e.target.value)}
                  placeholder="e.g., feature/new-feature"
                  disabled={isCreating}
                  className={isBranchAutoPopulated ? 'text-muted-foreground' : ''}
                />
                {isBranchAutoPopulated && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Branch name matches worktree name. Edit to use a different branch.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="startPoint" className="block text-sm font-medium mb-2">
                  Starting Point
                </label>
                <Input
                  id="startPoint"
                  type="text"
                  value={startPoint}
                  onChange={(e) => handleStartPointChange(e.target.value)}
                  placeholder="e.g., main, feature/other-branch, commit-hash"
                  disabled={isCreating}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Branch, tag, or commit to create the new worktree from.
                </p>
              </div>
            </>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isCreating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !worktreeName.trim()}
              className="flex-1"
            >
              {isCreating ? 'Creating...' : 'Create Worktree'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
