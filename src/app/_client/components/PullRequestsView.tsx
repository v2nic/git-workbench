import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { usePullRequests } from '../data/usePullRequests'
import { PRRow } from './PRRow'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { GitPullRequest, CheckCircle, Users, AlertTriangle } from 'lucide-react'
import { PRNotification } from '@/types/github'
import clsx from 'clsx'

type GroupBy = 'none' | 'repository' | 'reason'

export function PullRequestsView() {
  const { pullRequests, isLoading, error, cached, rateLimited, timestamp, mutate } = usePullRequests()
  const [searchQuery, setSearchQuery] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('repository')
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null)

  // Handle retry countdown when rate limited
  useEffect(() => {
    if (rateLimited && retryCountdown === null) {
      setRetryCountdown(10)
    }
    
    if (retryCountdown !== null && retryCountdown > 0) {
      const timer = setTimeout(() => {
        setRetryCountdown(retryCountdown - 1)
      }, 1000)
      
      return () => clearTimeout(timer)
    } else if (retryCountdown === 0) {
      // Retry when countdown reaches 0
      setRetryCountdown(null)
      mutate()
    }
  }, [rateLimited, retryCountdown, mutate])

  // Filter and group pull requests
  const filteredAndGroupedPRs = useMemo(() => {
    // First, filter to show only open PRs (not merged or closed)
    let filtered = pullRequests.filter(pr => pr.state === 'open' && !pr.merged)

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
  }, [pullRequests, searchQuery, groupBy])

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
    <div className="h-full flex flex-col">
      {/* Rate limit banner */}
      {rateLimited && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-3">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Rate limited, showing cached results. Retrying in {retryCountdown || 10}...
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

      {/* Header with stats */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Pull Requests</h2>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <GitPullRequest className="w-4 h-4" />
              <span>{getStats.total} total</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>{getStats.open} ready</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span>{getStats.draft} draft</span>
            </div>
            {cached && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <span>📦</span>
                <span>Cached</span>
              </div>
            )}
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
      <div className="flex-1 overflow-auto">
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
                {prs.map((pr) => (
                  <PRRow
                    key={`${pr.repository}-${pr.number}`}
                    pr={pr}
                    onCopyNumber={handleCopyNumber}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
