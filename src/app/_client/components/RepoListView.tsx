import React, { useMemo, useCallback, useEffect } from 'react'
import { useRepos } from '../data/useRepos'
import { useConfig } from '../data/useConfig'
import { RepoRow } from './RepoRow'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { Plus, Search, X, Download } from 'lucide-react'

interface RepoListViewProps {
  showFavoritesOnly?: boolean
  onToggleFavorite: (repoName: string) => void
  onJumpToWorktrees: (repoName: string) => void
  onCreateWorktree: (repoName: string) => void
  onCloneRepo?: () => void
  onDeleteRepo?: (repoName: string) => void
  onJumpToPullRequests?: (repoName: string) => void
  onAddRepo?: () => void
  onPublishRepo?: (repoName: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function RepoListView({
  showFavoritesOnly = false,
  onToggleFavorite,
  onJumpToWorktrees,
  onCreateWorktree,
  onCloneRepo,
  onDeleteRepo,
  onJumpToPullRequests,
  onAddRepo,
  onPublishRepo,
  searchQuery,
  onSearchChange
}: RepoListViewProps) {
  const { repos, isLoading, error, mutate } = useRepos()
  const { config } = useConfig()

  const filteredRepos = useMemo(() => {
    let filtered = repos

    // Filter by favorites if requested
    if (showFavoritesOnly) {
      filtered = filtered.filter(repo => repo.favorite)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(repo =>
        repo.repoName.toLowerCase().includes(query) ||
        (repo.fullName && repo.fullName.toLowerCase().includes(query))
      )
    }

    // Sort: tracked repos first, then discovered (only when not showing favorites only)
    return filtered.sort((a, b) => {
      if (!showFavoritesOnly) {
        if (a.tracked && !b.tracked) return -1
        if (!a.tracked && b.tracked) return 1
      }
      return a.repoName.localeCompare(b.repoName)
    })
  }, [repos, showFavoritesOnly, searchQuery])

  const handleToggleFavorite = useCallback(async (repoName: string) => {
    try {
      const identifier = repos.find(r => r.repoName === repoName)?.fullName || repoName
      await fetch('/api/config/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoNameOrId: identifier })
      })
      // Refresh the repos data to show the updated favorite status
      mutate()
      onToggleFavorite(repoName)
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }, [repos, onToggleFavorite, mutate])

  // ESC key handler to clear search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && searchQuery.trim()) {
        onSearchChange('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery, onSearchChange])

  const handleClearSearch = useCallback(() => {
    onSearchChange('')
  }, [onSearchChange])

  const handleDeleteRepo = useCallback(async (repoName: string) => {
    try {
      await fetch('/api/repos/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoName })
      })
      // Refresh the repos data to show the deletion
      mutate()
    } catch (error) {
      console.error('Failed to delete repository:', error)
    }
  }, [mutate])

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Failed to load repositories</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery.trim() && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {onAddRepo && (
            <Button onClick={onAddRepo} variant="secondary">
              <Plus className="w-4 h-4 mr-2" />
              Create
            </Button>
          )}
          
          {onCloneRepo && (
            <Button onClick={onCloneRepo}>
              <Download className="w-4 h-4 mr-2" />
              Clone
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">Loading repositories...</p>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">
              {showFavoritesOnly 
                ? 'No favorite repositories found' 
                : searchQuery 
                  ? 'No repositories found matching your search'
                  : 'No repositories found'
              }
            </p>
          </div>
        ) : (
          <div>
            {filteredRepos.map((repo) => (
              <RepoRow
                key={repo.repoName}
                repo={repo}
                onToggleFavorite={handleToggleFavorite}
                onJumpToWorktrees={onJumpToWorktrees}
                onCreateWorktree={onCreateWorktree}
                onDeleteRepo={onDeleteRepo || handleDeleteRepo}
                onJumpToPullRequests={onJumpToPullRequests}
                onPublishRepo={onPublishRepo}
                needsClone={repo.needsClone}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
