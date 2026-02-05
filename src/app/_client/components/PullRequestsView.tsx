import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { usePullRequests } from '../data/usePullRequests'
import { PRRow } from './PRRow'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { GitPullRequest, CheckCircle, Users, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'
import { PRNotification } from '@/types/github'
import clsx from 'clsx'

type GroupBy = 'none' | 'repository' | 'reason'
type StatusFilter = 'all' | 'ready' | 'draft'

interface PullRequestsViewProps {
  onCreateWorktree?: (repoName: string) => void
  onCreateFromBranch?: (repoName: string, branchName: string) => void
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
  highlightPRNumber?: number
  highlightPRRepository?: string
}

export function PullRequestsView({ onCreateWorktree, onCreateFromBranch, onSuccess, onError, highlightPRNumber, highlightPRRepository }: PullRequestsViewProps) {
  const { pullRequests, isLoading, error, cached, rateLimited, timestamp, retryInSeconds, errorMessage, updateAvailable, refreshPullRequests } = usePullRequests()
  const [searchQuery, setSearchQuery] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('repository')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [animatingPRKey, setAnimatingPRKey] = useState<string | null>(null)
  const prRowRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const retryLabel = retryInSeconds ?? 10

  useEffect(() => {
    if (highlightPRNumber && highlightPRRepository) {
      const prKey = `${highlightPRRepository}-${highlightPRNumber}`
      setAnimatingPRKey(prKey)
      
      const prElement = prRowRefs.current.get(prKey)
      if (prElement) {
        setTimeout(() => {
          prElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
      
      const animationDuration = 4000
      setTimeout(() => {
        setAnimatingPRKey(null)
      }, animationDuration)
    }
  }, [highlightPRNumber, highlightPRRepository])

  // Filter and group pull requests
  const filteredAndGroupedPRs = useMemo(() => {
    // First, filter to show only open PRs (not merged or closed)
    let filtered = pullRequests.filter(pr => pr.state === 'open' && !pr.merged)

    // Apply status filter
    if (statusFilter === 'ready') {
      filtered = filtered.filter(pr => !pr.draft)
    } else if (statusFilter === 'draft') {
      filtered = filtered.filter(pr => pr.draft)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(pr => 
        pr.title.toLowerCase().includes(query) ||
        pr.repository.toLowerCase().includes(query) ||
        pr.headRef.toLowerCase().includes(query) ||
        pr.author.login.toLowerCase().includes(query) ||
        pr.number.toString().includes(query)
      )
    }

    // Group PRs
    if (groupBy === 'none') {
      return { 'All Pull Requests': filtered }
    }

    const grouped = new Map<string, PRNotification[]>()
    
    filtered.forEach(pr => {
      let key: string
      
      switch (groupBy) {
        case 'repository':
          key = pr.repository
          break
        case 'reason':
          key = pr.reason.charAt(0).toUpperCase() + pr.reason.slice(1).replace(/_/g, ' ')
          break
        default:
          key = 'Other'
      }
      
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(pr)
    })

    // Sort groups by key (alphabetically) and PRs within each group by updated date
    const result: Record<string, PRNotification[]> = {}
    Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, prs]) => {
        result[key] = prs.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      })

    return result
  }, [pullRequests, searchQuery, groupBy, statusFilter])

  const handleCopyNumber = useCallback((number: number) => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(number.toString())
        .catch(err => console.error('Failed to copy PR number:', err))
    }
  }, [])

  const getStats = useMemo(() => {
    const stats = {
      total: pullRequests.length,
      open: pullRequests.filter(pr => pr.state === 'open' && !pr.draft).length,
      draft: pullRequests.filter(pr => pr.draft).length,
      reviewRequested: pullRequests.filter(pr => pr.reviewDecision === 'REVIEW_REQUIRED').length,
      changesRequested: pullRequests.filter(pr => pr.reviewDecision === 'CHANGES_REQUESTED').length,
      approved: pullRequests.filter(pr => pr.reviewDecision === 'APPROVED').length
    }
    return stats
  }, [pullRequests])

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Failed to load pull requests</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Update banner */}
      {updateAvailable && (
        <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 px-4 py-3">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-green-800 dark:text-green-200">
                Pull Requests updated
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshPullRequests}
              className="text-green-700 hover:text-green-900 dark:text-green-300 dark:hover:text-green-100"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-3">
          <div className="flex items-center space-x-3">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-200">
                Error fetching. Retrying...
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header with stats */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Pull Requests</h2>
          <div className="flex items-center space-x-2 text-sm">
            <button
              onClick={() => setStatusFilter('all')}
              className={clsx(
                'flex items-center space-x-2 px-3 py-1 rounded-md transition-colors',
                statusFilter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <GitPullRequest className="w-4 h-4" />
              <span>{getStats.total} all</span>
            </button>
            <button
              onClick={() => setStatusFilter('ready')}
              className={clsx(
                'flex items-center space-x-2 px-3 py-1 rounded-md transition-colors',
                statusFilter === 'ready'
                  ? 'bg-green-500 text-white'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>{getStats.open} ready</span>
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={clsx(
                'flex items-center space-x-2 px-3 py-1 rounded-md transition-colors',
                statusFilter === 'draft'
                  ? 'bg-gray-500 text-white'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span>{getStats.draft} draft</span>
            </button>
          </div>
        </div>

        {/* Filters and controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search pull requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Group by */}
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="px-3 py-2 border rounded-md bg-background text-sm"
            >
              <option value="repository">Group by Repository</option>
              <option value="reason">Group by Reason</option>
              <option value="none">No Grouping</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pull requests list */}
      <div className="flex-1 overflow-auto pb-20">
        {isLoading ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">Loading pull requests...</p>
          </div>
        ) : Object.keys(filteredAndGroupedPRs).length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">
              {searchQuery 
                ? 'No pull requests match your search' 
                : 'No pull requests found'}
            </p>
          </div>
        ) : (
          <div>
            {Object.entries(filteredAndGroupedPRs).map(([groupName, prs]) => (
              <div key={groupName}>
                {groupBy !== 'none' && (
                  <div className="px-4 py-2 bg-muted/50 border-b">
                    <h3 className="font-medium text-sm text-muted-foreground">
                      {groupName} ({prs.length})
                    </h3>
                  </div>
                )}
                {prs.map((pr) => {
                  const prKey = `${pr.repository}-${pr.number}`
                  const isAnimating = animatingPRKey === prKey
                  return (
                    <div
                      key={prKey}
                      ref={(el) => {
                        if (el) {
                          prRowRefs.current.set(prKey, el)
                        } else {
                          prRowRefs.current.delete(prKey)
                        }
                      }}
                      className={clsx(
                        'transition-all duration-300',
                        isAnimating && 'animate-pr-glow'
                      )}
                    >
                      <PRRow
                        pr={pr}
                        onCopyNumber={handleCopyNumber}
                        onCreateWorktree={onCreateWorktree}
                        onCreateFromBranch={onCreateFromBranch}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating rate limit banner */}
      {rateLimited && (
        <div className="fixed bottom-0 left-0 right-0 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800 px-4 py-3 z-10">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Rate limited, showing cached results.
              </p>
              {cached && timestamp && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  Data cached at {new Date(timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
