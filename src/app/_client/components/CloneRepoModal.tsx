import React, { useState, useCallback, useRef, memo, useEffect } from 'react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Spinner } from './ui/Spinner'
import { RepoInfo } from '@/types/clone'

export interface CloneRepoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
  onNavigateToWorktrees?: (repoName: string) => void
}

export const CloneRepoModal = memo(function CloneRepoModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
  onNavigateToWorktrees
}: CloneRepoModalProps) {
  const [url, setUrl] = useState('')
  const [isValid, setIsValid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  const validateUrl = useCallback(async (urlToValidate: string) => {
    const trimmedUrl = urlToValidate.trim()
    if (!trimmedUrl) {
      setError('Please enter a repository URL')
      setIsLoading(false)
      return
    }

    // Parse URL or org/repo format
    let owner: string, repo: string
    if (trimmedUrl.includes('github.com/')) {
      const match = trimmedUrl.match(/github\.com\/([^\/]+)\/([^\/\?]+)/)
      if (!match) {
        setError('Invalid GitHub URL format')
        setIsLoading(false)
        return
      }
      owner = match[1]
      repo = match[2].replace('.git', '')
    } else if (trimmedUrl.includes('/')) {
      [owner, repo] = trimmedUrl.split('/')
    } else {
      setError('Invalid format. Use https://github.com/org/repo or org/repo')
      setIsLoading(false)
      return
    }

    setError('')

    try {
      // Validate repository exists via GitHub API
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
      if (!response.ok) {
        throw new Error(response.status === 404 ? 'Repository not found' : 'Failed to validate repository')
      }
      
      const repoData = await response.json()
      const newRepoInfo: RepoInfo = {
        owner,
        repo,
        fullName: repoData.full_name,
        defaultBranch: repoData.default_branch,
        description: repoData.description
      }

      setRepoInfo(newRepoInfo)
      setIsValid(true)
      setError('')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate repository'
      setError(errorMessage)
      setIsValid(false)
      setRepoInfo(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateUrl = useCallback((newUrl: string) => {
    setUrl(newUrl)
    setIsValid(false)
    setError('')
    setRepoInfo(null)
    
    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    // Only validate if URL is not empty
    if (newUrl.trim()) {
      setIsLoading(true)
      debounceRef.current = setTimeout(() => {
        validateUrl(newUrl)
      }, 800) // 800ms debounce delay
    } else {
      setIsLoading(false)
    }
  }, [validateUrl])

  const submitClone = useCallback(async () => {
    if (!isValid || !repoInfo) {
      setError('Please validate the repository first')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url,
          repoName: repoInfo.repo,
          fullName: repoInfo.fullName
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to clone repository')
      }

      onSuccess?.(`Repository '${repoInfo.repo}' cloned successfully!`)
      
      // Reset form
      setUrl('')
      setIsValid(false)
      setError('')
      setRepoInfo(null)
      
      // Close modal and navigate
      onClose()
      if (onNavigateToWorktrees) {
        onNavigateToWorktrees(repoInfo.repo)
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clone repository'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [isValid, repoInfo, url, onSuccess, onError, onClose, onNavigateToWorktrees])

  const clearError = useCallback(() => {
    setError('')
  }, [])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Clone Repository</h2>
        <p className="text-muted-foreground mb-4">
          Clone a remote GitHub repository to your local workspace.
        </p>
        
        <form className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={clearError}
                  className="text-red-500 hover:text-red-700"
                  aria-label="Clear error"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          
          <div>
            <label htmlFor="repoUrl" className="block text-sm font-medium mb-2">
              Repository URL *
            </label>
            <Input
              id="repoUrl"
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => updateUrl(e.target.value)}
              placeholder="https://github.com/org/repo or org/repo"
              disabled={isSubmitting || isLoading}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter a GitHub repository URL or org/repo format
            </p>
          </div>

          {isLoading && (
            <div className="bg-muted/30 rounded-md p-3 flex items-center justify-center space-x-2">
              <Spinner size="sm" />
              <span className="text-sm text-muted-foreground">Finding repository...</span>
            </div>
          )}

          {repoInfo && !isLoading && (
            <div className="bg-muted/30 rounded-md p-3 space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">
                    {repoInfo.owner.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm">{repoInfo.fullName}</p>
                  {repoInfo.description && (
                    <p className="text-xs text-muted-foreground">{repoInfo.description}</p>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Default branch: {repoInfo.defaultBranch}
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="flex-1"
              onClick={(e) => {
                e.preventDefault()
                submitClone()
              }}
            >
              {isSubmitting ? 'Cloning...' : 'Clone Repository'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
})
