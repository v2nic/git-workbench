import React, { useState, useMemo, useCallback, useTransition } from 'react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { CreateRepoData } from '@/types/config'

interface CreateRepoModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateRepo: (repoData: CreateRepoData) => Promise<void>
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
  onNavigateToWorktrees?: (repoName: string) => void
  defaultRepoName?: string
}

export function CreateRepoModal({
  isOpen,
  onClose,
  onCreateRepo,
  onSuccess,
  onError,
  onNavigateToWorktrees,
  defaultRepoName
}: CreateRepoModalProps) {
  // Lazy state initialization for expensive operations
  const [formData, setFormData] = useState(() => ({
    repoName: '',
    defaultBranch: 'main',
    worktreeName: '', // Will be set to repo name when repo name changes
    worktreeBranchName: 'main',
    favorite: false
  }))
  
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  // Track if user has modified the repo name
  const [repoNameModified, setRepoNameModified] = useState(false)

  // Reset modified state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setRepoNameModified(false)
    }
  }, [isOpen])

  // Auto-set worktree name to repo name (or default repo name)
  React.useEffect(() => {
    const repoNameToUse = formData.repoName.trim() || defaultRepoName?.trim() || ''
    if (repoNameToUse && !formData.worktreeName.trim()) {
      setFormData(prev => ({
        ...prev,
        worktreeName: repoNameToUse
      }))
    }
  }, [formData.repoName, defaultRepoName, formData.worktreeName])

  // Derived state instead of effect - form validation
  const isValidForm = useMemo(() => {
    const cleanRepoName = formData.repoName.trim() || defaultRepoName?.trim() || ''
    return cleanRepoName !== '' && 
           /^[a-zA-Z0-9_-]+$/.test(cleanRepoName) &&
           formData.worktreeName.trim() !== '' &&
           formData.worktreeBranchName.trim() !== ''
  }, [formData.repoName, formData.worktreeName, formData.worktreeBranchName, defaultRepoName])

  // Derived state - calculate paths
  const paths = useMemo(() => {
    const cleanRepoName = formData.repoName.trim() || defaultRepoName?.trim() || ''
    const cleanWorktreeName = formData.worktreeName.trim()
    
    if (!cleanRepoName) {
      return {
        barePath: '',
        worktreeFullPath: ''
      }
    }
    
    return {
      barePath: `~/Source/git-root/${cleanRepoName}.git`,
      worktreeFullPath: `~/Source/${cleanRepoName}/${cleanWorktreeName}`
    }
  }, [formData.repoName, formData.worktreeName, defaultRepoName])

  // Derived state - worktree name is always 'main'
  const worktreeNameMatchesRepo = useMemo(() => {
    return formData.worktreeName.trim() === 'main'
  }, [formData.worktreeName])

  // Functional setState updates to prevent stale closures
  const updateRepoName = useCallback((name: string) => {
    setRepoNameModified(true)
    setFormData(prev => ({
      ...prev,
      repoName: name
    }))
  }, [])

  const updateDefaultBranch = useCallback((defaultBranch: string) => {
    setFormData(prev => ({ ...prev, defaultBranch }))
  }, [])

  const updateWorktreeName = useCallback((worktreeName: string) => {
    setFormData(prev => ({ 
      ...prev, 
      worktreeName,
      // Update branch name to match if it was matching the old worktree name or if it's still the default "main"
      worktreeBranchName: (prev.worktreeBranchName === prev.worktreeName || prev.worktreeBranchName === 'main') 
        ? worktreeName 
        : prev.worktreeBranchName
    }))
  }, [])

  const updateWorktreeBranchName = useCallback((worktreeBranchName: string) => {
    setFormData(prev => ({ ...prev, worktreeBranchName }))
  }, [])

  const updateFavorite = useCallback((favorite: boolean) => {
    setFormData(prev => ({ ...prev, favorite }))
  }, [])

  const handleClose = useCallback(() => {
    if (!isCreating && !isPending) {
      onClose()
      setError('')
      // Reset form using functional update
      setFormData(() => ({
        repoName: '',
        defaultBranch: 'main',
        worktreeName: '', // Reset to empty, will be auto-set when modal opens again
        worktreeBranchName: 'main',
        favorite: false
      }))
    }
  }, [onClose, isCreating, isPending])

  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isCreating && !isPending) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isCreating, isPending, handleClose])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isValidForm) return

    const cleanRepoName = formData.repoName.trim() || defaultRepoName?.trim() || ''
    const submitData: CreateRepoData = {
      repoName: cleanRepoName,
      defaultBranch: formData.defaultBranch,
      worktreeName: formData.worktreeName.trim(),
      worktreeBranchName: formData.worktreeBranchName.trim(),
      favorite: formData.favorite
    }

    setIsCreating(true)
    setError('')

    startTransition(async () => {
      try {
        await onCreateRepo(submitData)
        
        // Close modal immediately
        onClose()
        
        // Reset form state
        setFormData(() => ({
          repoName: '',
          defaultBranch: 'main',
          worktreeName: '', // Reset to empty, will be auto-set when modal opens again
          worktreeBranchName: 'main',
          favorite: false
        }))
        
        // Navigate to worktrees view since worktree creation is now mandatory
        if (onNavigateToWorktrees) {
          onNavigateToWorktrees(cleanRepoName)
        }
        
        // Show success message
        if (onSuccess) {
          onSuccess(`Repository '${cleanRepoName}' created successfully with worktree!`)
        }
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error('Failed to create repository:', err)
        setError(errorMessage)
        
        if (onError) {
          onError(errorMessage)
        }
      } finally {
        setIsCreating(false)
      }
    })
  }, [formData, isValidForm, onCreateRepo, onClose, onNavigateToWorktrees, onSuccess, onError])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-auto">
        <h2 className="text-lg font-semibold mb-4">Create New Repository</h2>
        <p className="text-muted-foreground mb-4">
          Create a new local repository with initial worktree.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <div>
            <label htmlFor="repoName" className="block text-sm font-medium mb-2">
              Repository Name *
            </label>
            <Input
              id="repoName"
              type="text"
              value={formData.repoName}
              onChange={(e) => updateRepoName(e.target.value)}
              placeholder={defaultRepoName || ''}
              disabled={isCreating}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              Letters, numbers, hyphens, and underscores only
            </p>
          </div>

          {/* Path Display */}
          {paths.barePath && (
            <div className="bg-muted/30 rounded-md p-3 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Bare Repository
                </label>
                <div className="font-mono text-xs bg-background rounded p-2">
                  {paths.barePath}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Worktree Path
                </label>
                <div className="font-mono text-xs bg-background rounded p-2">
                  {paths.worktreeFullPath}
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="defaultBranch" className="block text-sm font-medium mb-2">
              Default Branch
            </label>
            <Input
              id="defaultBranch"
              type="text"
              value={formData.defaultBranch}
              onChange={(e) => updateDefaultBranch(e.target.value)}
              placeholder="main"
              disabled={isCreating}
              required
            />
          </div>

          <div>
            <label htmlFor="worktreeName" className="block text-sm font-medium mb-2">
              Worktree Name *
            </label>
            <Input
              id="worktreeName"
              type="text"
              value={formData.worktreeName}
              onChange={(e) => updateWorktreeName(e.target.value)}
              placeholder="main"
              disabled={isCreating}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Name of the worktree directory
            </p>
          </div>

          <div>
            <label htmlFor="worktreeBranchName" className="block text-sm font-medium mb-2">
              Worktree Branch Name *
            </label>
            <Input
              id="worktreeBranchName"
              type="text"
              value={formData.worktreeBranchName}
              onChange={(e) => updateWorktreeBranchName(e.target.value)}
              placeholder="main"
              disabled={isCreating}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Branch name for the worktree (will be created if different from default branch)
            </p>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.favorite}
                onChange={(e) => updateFavorite(e.target.checked)}
                disabled={isCreating}
                className="mr-2"
              />
              <span className="text-sm font-medium">Mark as favorite</span>
            </label>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              Favorite repositories appear in the Favorites tab
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isCreating || isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || isPending || !isValidForm}
              className="flex-1"
            >
              {isCreating || isPending ? 'Creating...' : 'Create Repository'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
