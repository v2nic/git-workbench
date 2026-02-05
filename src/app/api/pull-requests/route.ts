import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { PRNotification } from '@/types/github'

const execAsync = promisify(exec)

// Cache for 60 seconds to avoid excessive API calls
let cache: { data: PRNotification[], timestamp: number } | null = null
const CACHE_TTL = 60000 // 60 seconds

async function getGitHubUsername(): Promise<string> {
  try {
    const { stdout } = await execAsync('gh api user --jq \'.login\'')
    return stdout.trim()
  } catch (error) {
    console.error('Failed to get GitHub username:', error)
    throw new Error('GitHub authentication required')
  }
}

async function getPRNotifications(): Promise<any[]> {
  try {
    const { stdout } = await execAsync('gh api notifications --paginate')
    const notifications = JSON.parse(stdout)
    return notifications.filter((n: any) => n.subject.type === 'PullRequest')
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return []
  }
}

async function searchUserPRs(username: string): Promise<any[]> {
  const queries = [
    `author:${username}`,
    `review-requested:${username}`,
    `reviewed-by:${username}`,
    `commenter:${username}`
  ]

  const results = await Promise.allSettled(
    queries.map(query => 
      execAsync(`gh search prs "${query}" --limit 100 --json number,title,state,url,repository,author,updatedAt,createdAt,closedAt,isDraft`, {
        timeout: 20000 // 20 second timeout
      })
        .then(({ stdout }) => JSON.parse(stdout))
        .catch((error: any) => {
          console.error(`Failed to search PRs for query "${query}":`, error)
          // If rate limited, return empty array for this query
          if (error instanceof Error && error.message && error.message.includes('rate limit')) {
            console.warn('Rate limit hit, returning empty results for query:', query)
            return []
          }
          return []
        })
    )
  )

  const allPRs = results
    .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
    .flatMap(result => result.value || [])

  // Deduplicate by URL
  const seen = new Set<string>()
  return allPRs.filter(pr => {
    if (seen.has(pr.url)) return false
    seen.add(pr.url)
    return true
  })
}

async function getFavoriteReposPRs(favoriteRepos: string[]): Promise<any[]> {
  const allPRs: any[] = []
  
  for (const repo of favoriteRepos) {
    try {
      const { stdout } = await execAsync(`gh search prs --repo "${repo}" --limit 20 --json "title,url,state,number,headRefName,reviewDecision,merged,closedAt,updatedAt,createdAt,author,repository,isDraft"`, {
        timeout: 15000 // 15 second timeout per repo
      })
      const prs = JSON.parse(stdout)
      allPRs.push(...prs)
    } catch (error) {
      console.error(`Failed to fetch PRs for ${repo}:`, error)
      // If rate limited, continue with next repo
      if (error instanceof Error && error.message && error.message.includes('rate limit')) {
        console.warn('Rate limit hit for repo:', repo)
        continue
      }
    }
  }
  
  return allPRs
}

function convertWebUrlToApiUrl(webUrl: string): string {
  // Convert https://github.com/owner/repo/pull/number to repos/owner/repo/pulls/number
  const match = webUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/)
  if (match) {
    return `repos/${match[1]}/${match[2]}/pulls/${match[3]}`
  }
  return webUrl // Return original if no match
}

async function fetchPRDetails(url: string): Promise<any> {
  try {
    const apiUrl = convertWebUrlToApiUrl(url)
    // Add timeout to prevent hanging
    const { stdout } = await execAsync(`timeout 10s gh api ${apiUrl}`, { 
      timeout: 15000 // 15 second timeout
    })
    return JSON.parse(stdout)
  } catch (error: any) {
    // If PR doesn't exist (404) or other API error, return null instead of throwing
    if (error.stderr && error.stderr.includes('404')) {
      console.warn(`PR not found: ${url}`)
      return null
    }
    if (error.signal === 'SIGTERM' || error.code === 'ETIMEDOUT') {
      console.warn(`Timeout fetching PR details: ${url}`)
      return null
    }
    console.error('Failed to fetch PR details:', error)
    return null
  }
}

async function mapToPRNotification(pr: any, reason: PRNotification['reason'], repository?: string): Promise<PRNotification | null> {
  // Extract basic info that's always available from search results
  const basicInfo = {
    title: pr.title,
    reason,
    url: pr.url,
    html_url: pr.url.replace('api.github.com/repos', 'github.com').replace('/pulls/', '/pull/'),
    state: pr.state.toLowerCase() as 'open' | 'closed' | 'merged',
    repository: repository || pr.repository?.nameWithOwner || pr.repository?.fullName || 'Unknown',
    number: pr.number,
    headRef: pr.headRefName || pr.headRef || `pr-${pr.number}`, // Fallback to PR number
    reviewDecision: pr.reviewDecision,
    merged: pr.merged || pr.state === 'MERGED',
    draft: pr.isDraft || false, // Use isDraft instead of draft
    closedAt: pr.closedAt,
    updatedAt: pr.updatedAt,
    createdAt: pr.createdAt,
    author: {
      login: pr.author?.login || pr.author?.name || 'Unknown',
      avatarUrl: pr.author?.avatarUrl
    }
  }

  // Only fetch detailed info if we're missing critical data
  if (!pr.headRefName && !pr.headRef) {
    const details = await fetchPRDetails(pr.url)
    if (!details) {
      // If we can't fetch details, still return the basic info rather than null
      console.warn(`Using basic info for PR due to missing details: ${pr.url}`)
      return basicInfo
    }
    basicInfo.headRef = details.head?.ref || `pr-${pr.number}`
    basicInfo.reviewDecision = details.reviewDecision
    basicInfo.draft = details.draft || false // Update draft status from details if available
  }

  return basicInfo
}

async function getConfig(): Promise<any> {
  try {
    const { stdout } = await execAsync('cat /app/data/config.json 2>/dev/null || echo "{}"')
    return JSON.parse(stdout)
  } catch (error) {
    return {}
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check cache first
    const now = Date.now()
    if (cache && now - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        pullRequests: cache.data,
        cached: true,
        rateLimited: false,
        timestamp: cache.timestamp
      })
    }

    const username = await getGitHubUsername()
    const config = await getConfig()
    
    // Check for rate limiting before proceeding
    let rateLimited = false
    
    // Get all PRs from different sources with rate limit detection
    const [notifications, userPRs, favoritePRs] = await Promise.allSettled([
      getPRNotifications(),
      searchUserPRs(username).catch(error => {
        if (error instanceof Error && error.message && error.message.includes('rate limit')) {
          rateLimited = true
        }
        return []
      }),
      getFavoriteReposPRs(config.favoriteRepos || []).catch(error => {
        if (error instanceof Error && error.message && error.message.includes('rate limit')) {
          rateLimited = true
        }
        return []
      })
    ])

    // If we hit rate limits but have cached data, return it
    if (rateLimited && cache) {
      return NextResponse.json({
        pullRequests: cache.data,
        cached: true,
        rateLimited: true,
        timestamp: cache.timestamp
      })
    }

    const notificationsData = notifications.status === 'fulfilled' ? notifications.value : []
    const userPRsData = userPRs.status === 'fulfilled' ? userPRs.value : []
    const favoritePRsData = favoritePRs.status === 'fulfilled' ? favoritePRs.value : []

    // Process all PRs
    const allPRs = [
      ...notificationsData.map(pr => mapToPRNotification(pr, 'notification')),
      ...userPRsData.map(pr => mapToPRNotification(pr, 'author')),
      ...favoritePRsData.map(pr => mapToPRNotification(pr, 'favorite'))
    ]

    // Wait for all mappings to complete
    const mappedPRs = await Promise.all(allPRs)
    const validPRs = mappedPRs.filter((pr): pr is PRNotification => pr !== null)

    // Cache the results
    cache = { data: validPRs, timestamp: now }

    return NextResponse.json({
      pullRequests: validPRs,
      cached: false,
      rateLimited: false,
      timestamp: now
    })
  } catch (error) {
    console.error('Failed to fetch pull requests:', error)
    
    // If we have cached data, return it even on error
    if (cache) {
      return NextResponse.json({
        pullRequests: cache.data,
        cached: true,
        rateLimited: true,
        timestamp: cache.timestamp,
        error: 'Failed to fetch fresh data, showing cached results'
      })
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch pull requests',
      pullRequests: [],
      cached: false,
      rateLimited: false
    }, { status: 500 })
  }
}
