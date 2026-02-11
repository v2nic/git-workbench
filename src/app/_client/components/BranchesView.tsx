import React, { useMemo, useState, useCallback } from 'react'
import { useBranches } from '../data/useBranches'
import { useRepos } from '../data/useRepos'
import { BranchRow } from './BranchRow'
import { FilterBanner } from './FilterBanner'
import { RepositoryHeader } from './RepositoryHeader'
import { DeleteBranchModal } from './DeleteBranchModal'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { Search, X, Globe, Monitor, GitBranchPlus } from 'lucide-react'
import { Branch } from '@/types/branches'
import clsx from 'clsx'

interface BranchesViewProps {
  filterRepo?: string
  onClearFilter?: () => void
  onFilterByRepository?: (repoName: string) => void
  onCreateWorktree: (repoName: string, branchName: string) => void
  onJumpToWorktree: (repoName: string, branchName: string) => void
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

export function BranchesView({
  filterRepo,
  onClearFilter,
  onFilterByRepository,
  onCreateWorktree,
  onJumpToWorktree,
  onSuccess,
  onError,
}: BranchesViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [includeRemote, setIncludeRemote] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [pendingDeleteBranch, setPendingDeleteBranch] = useState<Branch | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { branches, isLoading, error, mutate } = useBranches({
    repo: filterRepo,
    includeRemote,
    favoritesOnly: !filterRepo && favoritesOnly,
  })

  const { repos } = useRepos()

  const filteredBranches = useMemo(() => {
    if (!searchQuery.trim()) return branches

    const query = searchQuery.toLowerCase()
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        b.repoName.toLowerCase().includes(query) ||
        (b.lastCommitMessage && b.lastCommitMessage.toLowerCase().includes(query))
    )
  }, [branches, searchQuery])

  const branchesByRepo = useMemo(() => {
    const grouped = new Map<string, Branch[]>()

    filteredBranches.forEach((branch) => {
      const key = branch.repoName
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(branch)
    })

    return Array.from(grouped.entries()).sort(([a], [b]) => {
      const repoA = repos.find((r) => r.repoName === a)
      const repoB = repos.find((r) => r.repoName === b)
      if (repoA?.favorite && !repoB?.favorite) return -1
      if (!repoA?.favorite && repoB?.favorite) return 1
      return a.localeCompare(b)
    })
  }, [filteredBranches, repos])

  const stats = useMemo(() => {
    const local = branches.filter((b) => b.isLocal).length
    const remote = branches.filter((b) => b.isRemote && !b.isLocal).length
    const withWorktree = branches.filter((b) => b.hasWorktree).length
    return { total: branches.length, local, remote, withWorktree }
  }, [branches])

  const handleDeleteBranch = useCallback((branch: Branch) => {
    setPendingDeleteBranch(branch)
    setDeleteModalOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(
    async (branch: Branch, deleteLocal: boolean, deleteRemote: boolean, force: boolean) => {
      setIsDeleting(true)
      try {
        const response = await fetch('/api/branches/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repoName: branch.repoName,
            branchName: branch.name,
            deleteLocal,
            deleteRemote,
            force,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          if (data.requiresForce) {
            onError?.(data.error)
            return
          }
          throw new Error(data.error || 'Failed to delete branch')
        }

        const result = await response.json()
        const parts: string[] = []
        if (result.localDeleted) parts.push('local')
        if (result.remoteDeleted) parts.push('remote')

        setDeleteModalOpen(false)
        setPendingDeleteBranch(null)
        mutate()
        onSuccess?.(`Deleted ${parts.join(' and ')} branch '${branch.name}'`)
      } catch (err) {
        console.error('Failed to delete branch:', err)
        onError?.(err instanceof Error ? err.message : 'Failed to delete branch')
      } finally {
        setIsDeleting(false)
      }
    },
    [mutate, onSuccess, onError]
  )

  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Failed to load branches</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <FilterBanner filterValue={filterRepo} filterType="branches" onClearFilter={onClearFilter} />

      <div className="p-4 border-b space-y-3">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search branches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIncludeRemote(!includeRemote)}
              className={clsx(
                'flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm transition-colors border',
                includeRemote
                  ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              )}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Include Remote</span>
            </button>

            {!filterRepo && (
              <button
                onClick={() => setFavoritesOnly(!favoritesOnly)}
                className={clsx(
                  'flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm transition-colors border',
                  favoritesOnly
                    ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                )}
              >
                <span>{favoritesOnly ? '★ Favorites Only' : '☆ All Repos'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            <span className="flex items-center space-x-1">
              <Monitor className="w-3 h-3" />
              <span>{stats.local} local</span>
            </span>
            {includeRemote && (
              <span className="flex items-center space-x-1">
                <Globe className="w-3 h-3" />
                <span>{stats.remote} remote-only</span>
              </span>
            )}
            <span>{stats.total} total</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">Loading branches...</p>
          </div>
        ) : branchesByRepo.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">
              {filterRepo
                ? `No branches found for ${filterRepo}`
                : searchQuery
                  ? 'No branches found matching your search'
                  : favoritesOnly
                    ? 'No branches found in favorite repositories'
                    : 'No branches found'}
            </p>
          </div>
        ) : (
          <div>
            {branchesByRepo.map(([repoName, repoBranches]) => {
              const repo = repos.find((r) => r.repoName === repoName)
              const isFavorite = repo?.favorite

              return (
                <div key={repoName}>
                  <RepositoryHeader
                    repositoryName={repoName}
                    itemCount={repoBranches.length}
                    showFilterButton={!!onFilterByRepository}
                    isFilterActive={filterRepo === repoName}
                    onToggleFilter={onFilterByRepository}
                    onClearFilter={onClearFilter}
                    actionButton={{
                      label: 'Create Worktree',
                      onClick: () => {/* TODO: Implement create worktree from branch */},
                      icon: <GitBranchPlus className="w-4 h-4 mr-1" />,
                      variant: 'primary'
                    }}
                  />

                  <div>
                    {repoBranches.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <p className="text-sm">No branches found.</p>
                      </div>
                    ) : (
                      <div>
                        {repoBranches.map((branch) => (
                          <BranchRow
                            key={`${branch.repoName}-${branch.name}-${branch.isLocal ? 'l' : ''}${branch.isRemote ? 'r' : ''}`}
                            branch={branch}
                            onJumpToWorktree={onJumpToWorktree}
                            onCreateWorktree={onCreateWorktree}
                            onDeleteBranch={handleDeleteBranch}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <DeleteBranchModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setPendingDeleteBranch(null)
        }}
        branch={pendingDeleteBranch}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </div>
  )
}
