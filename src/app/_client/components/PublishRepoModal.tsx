import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { X, Github, Globe, Lock, AlertTriangle } from 'lucide-react'

interface PublishRepoModalProps {
  repo: {
    repoName: string
    fullName?: string
    barePath?: string
  }
  onClose: () => void
  onSuccess: (sshUrl: string) => void
}

interface PublishState {
  organization: string
  visibility: 'public' | 'private'
  isSubmitting: boolean
  error: string
}

export function PublishRepoModal({ repo, onClose, onSuccess }: PublishRepoModalProps) {
  const [state, setState] = useState<PublishState>({
    organization: repo.fullName ? repo.fullName.split('/')[0] : '',
    visibility: 'private',
    isSubmitting: false,
    error: ''
  })

  const modalRef = useRef<HTMLDivElement>(null)

  // Focus organization input when modal opens
  useEffect(() => {
    // Auto-focus removed since Input component doesn't support ref forwarding
  }, [])

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const updateOrganization = useCallback((organization: string) => {
    setState(prev => ({ ...prev, organization, error: '' }))
  }, [])

  const updateVisibility = useCallback((visibility: 'public' | 'private') => {
    setState(prev => ({ ...prev, visibility, error: '' }))
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: '' }))
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!state.organization.trim()) {
      setState(prev => ({ ...prev, error: 'Organization or username is required' }))
      return
    }

    setState(prev => ({ ...prev, isSubmitting: true, error: '' }))

    try {
      const response = await fetch('/api/repos/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: repo.repoName,
          organization: state.organization.trim(),
          visibility: state.visibility,
          barePath: repo.barePath
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish repository')
      }

      // Success! Call onSuccess with the SSH URL
      onSuccess(data.sshUrl)
      onClose()
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }))
    }
  }, [state.organization, state.visibility, repo.repoName, repo.barePath, onSuccess, onClose])

  const fullRepoName = `${state.organization}/${repo.repoName}`

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-background border rounded-lg shadow-lg max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Github className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Publish to GitHub</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Repository Info */}
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-sm font-medium">{repo.repoName}</p>
            {repo.fullName && (
              <p className="text-xs text-muted-foreground">Current: {repo.fullName}</p>
            )}
          </div>

          {/* Organization/Username */}
          <div>
            <label htmlFor="organization" className="block text-sm font-medium mb-2">
              Organization or Username
            </label>
            <Input
              id="organization"
              type="text"
              value={state.organization}
              onChange={(e) => updateOrganization(e.target.value)}
              placeholder="github-username"
              disabled={state.isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Repository will be published as: {fullRepoName}
            </p>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium mb-2">Visibility</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={state.visibility === 'private'}
                  onChange={(e) => updateVisibility(e.target.value as 'private')}
                  disabled={state.isSubmitting}
                  className="text-primary"
                />
                <Lock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">Private</span>
                  <p className="text-xs text-muted-foreground">Only you can see this repository</p>
                </div>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={state.visibility === 'public'}
                  onChange={(e) => updateVisibility(e.target.value as 'public')}
                  disabled={state.isSubmitting}
                  className="text-primary"
                />
                <Globe className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">Public</span>
                  <p className="text-xs text-muted-foreground">Anyone can see this repository</p>
                </div>
              </label>
            </div>
          </div>

          {/* Error Display */}
          {state.error && (
            <div className="flex items-start space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{state.error}</p>
              </div>
              <button
                type="button"
                onClick={clearError}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={state.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={state.isSubmitting || !state.organization.trim()}
              className="min-w-[100px]"
            >
              {state.isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Publishing...</span>
                </div>
              ) : (
                'Publish'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
