import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Button } from './ui/Button'
import { getWorktreeNameFromPath } from '../utils/worktreeUtils'
import { Input } from './ui/Input'
import { useBranchReference } from '../contexts/BranchReferenceContext'

interface CreateWorktreeModalProps {
  isOpen: boolean
  onClose: () => void
  repoName: string
  fromBranch?: string
  onCreateWorktree: (repoName: string, branchName: string, worktreeName: string, startPoint?: string) => Promise<any>
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
  onNavigateToWorktrees?: (repoName: string, worktreePath?: string) => void
}

export function CreateWorktreeModal({
  isOpen,
  onClose,
  repoName,
  fromBranch,
  onCreateWorktree,
  onSuccess,
  onError,
  onNavigateToWorktrees
}: CreateWorktreeModalProps) {
  const [worktreeName, setWorktreeName] = useState('')
  const [branchName, setBranchName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  
  const { isRemoteRef, getLocalRef } = useBranchReference()

  // Derived state for startPoint based on fromBranch and context
  const derivedStartPoint = useMemo(() => {
    if (!fromBranch) return 'origin/main'
    const isRemote = isRemoteRef(fromBranch)
    return isRemote ? fromBranch : getLocalRef(fromBranch)
  }, [fromBranch, isRemoteRef, getLocalRef])

  // Auto-populate worktree name from branch when fromBranch is provided
  useEffect(() => {
    if (fromBranch && isOpen) {
      // Detect remote references and preserve them
      const isRemote = isRemoteRef(fromBranch)
      if (isRemote) {
        // For remote references, extract the clean branch name for display
        const cleanBranchName = getLocalRef(fromBranch)
        setWorktreeName(cleanBranchName)
        setBranchName(cleanBranchName)
      } else {
        // For local branches, use as-is
        setWorktreeName(fromBranch)
        setBranchName(fromBranch)
      }
    }
  }, [fromBranch, isOpen, isRemoteRef, getLocalRef])

  // Auto-populate branch name when worktree name changes, unless user has manually edited it
  useEffect(() => {
    if (worktreeName && !branchName) {
      setBranchName(worktreeName)
    }
  }, [worktreeName, branchName])

  const handleClose = useCallback(() => {
    if (!isCreating) {
      onClose()
      setWorktreeName('')
      setBranchName('')
      setError('')
    }
  }, [isCreating, onClose])

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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!worktreeName.trim()) return

    const finalBranchName = fromBranch ? (branchName.trim() || worktreeName.trim()) : worktreeName.trim()
    const finalStartPoint = fromBranch ? derivedStartPoint : 'origin/main'

    setIsCreating(true)
    setError('')
    try {
      const result = await onCreateWorktree(repoName, finalBranchName, worktreeName.trim(), finalStartPoint)
      // Success/error handling is done in the parent component
      onClose()
      setWorktreeName('')
      setBranchName('')
      // Navigate to worktrees tab filtered by this repo, passing the worktree name for highlighting
      if (onNavigateToWorktrees && result?.path) {
        const worktreeName = getWorktreeNameFromPath(result.path)
        onNavigateToWorktrees(repoName, worktreeName)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to create worktree:', err)
      setError(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  if (!isOpen) return null

  const isBranchAutoPopulated = branchName === worktreeName && worktreeName !== ''

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleClose}>
      <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Create Worktree</h2>
        <p className="text-muted-foreground mb-4">
          Create a new worktree for repository: <strong>{repoName}</strong>
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
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
                  value={derivedStartPoint}
                  disabled={true}
                  className="text-muted-foreground"
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
