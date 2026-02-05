import { EventEmitter } from 'events'
import { exec } from 'child_process'
import { promisify } from 'util'
import { PRNotification } from '@/types/github'
import { getConfig } from '@/lib/config'
import { TokenBucket } from '@/lib/tokenBucket'

const execAsync = promisify(exec)

const PERSIST_PATH = '/tmp/repo-worktree-ui-pr-worker-cache.json'

type WorkerStatus =
  | { type: 'starting' }
  | { type: 'running' }
  | { type: 'rate_limited'; retryAfterMs: number; message: string }
  | { type: 'error'; message: string }

type WorkerEvent =
  | { type: 'snapshot'; pullRequests: PRNotification[]; asOf: number }
  | { type: 'pr'; pullRequest: PRNotification; asOf: number }
  | { type: 'status'; status: WorkerStatus; asOf: number }
  | { type: 'heartbeat'; asOf: number }

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    if (!signal) return

    const onAbort = () => {
      clearTimeout(t)
      reject(new Error('Aborted'))
    }

    if (signal.aborted) {
      onAbort()
      return
    }

    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function isRateLimitError(err: unknown): string | null {
  const parts: string[] = []

  if (err instanceof Error) {
    parts.push(err.message || '')
    const anyErr = err as unknown as { stderr?: unknown; stdout?: unknown }
    if (typeof anyErr.stderr === 'string') parts.push(anyErr.stderr)
    if (typeof anyErr.stdout === 'string') parts.push(anyErr.stdout)
  } else if (typeof err === 'object' && err !== null) {
    const anyErr = err as { message?: unknown; stderr?: unknown; stdout?: unknown }
    if (typeof anyErr.message === 'string') parts.push(anyErr.message)
    if (typeof anyErr.stderr === 'string') parts.push(anyErr.stderr)
    if (typeof anyErr.stdout === 'string') parts.push(anyErr.stdout)
  }

  const haystack = parts.join('\n').toLowerCase()
  if (haystack.includes('secondary rate limit') || haystack.includes('api rate limit exceeded') || haystack.includes('rate limit')) {
    return parts.join('\n')
  }

  return null
}

function keyForPR(pr: PRNotification): string {
  return pr.url
}

type RequestKind = 'user_query' | 'favorite_repo' | 'notifications' | 'whoami'

const REQUEST_COST: Record<RequestKind, number> = {
  whoami: 1,
  notifications: 2,
  user_query: 4,
  favorite_repo: 4
}

export class PullRequestsWorker {
  private readonly emitter = new EventEmitter()
  private readonly bucket: TokenBucket

  private started = false
  private running = false
  private abortController: AbortController | null = null
  private readyPromise: Promise<void> | null = null
  private resolveReady: (() => void) | null = null

  private username: string | null = null
  private store = new Map<string, PRNotification>()
  private lastSnapshotMs = 0
  private lastStatus: WorkerStatus = { type: 'starting' }
  private lastStatusAsOf = 0

  public constructor() {
    this.bucket = new TokenBucket(20, 1, 0)
    this.readyPromise = new Promise(resolve => {
      this.resolveReady = resolve
    })
    void this.loadPersistedStore()
  }

  private async loadPersistedStore() {
    try {
      const fs = await import('fs/promises')
      const raw = await fs.readFile(PERSIST_PATH, 'utf-8')
      const parsed = JSON.parse(raw) as { asOf: number; pullRequests: PRNotification[] }
      if (!parsed?.pullRequests?.length) return

      this.store = new Map(parsed.pullRequests.map(pr => [keyForPR(pr), pr]))
      this.lastSnapshotMs = parsed.asOf || 0
      this.emit({ type: 'snapshot', pullRequests: Array.from(this.store.values()), asOf: this.lastSnapshotMs || Date.now() })
    } catch {
      // ignore
    } finally {
      this.resolveReady?.()
    }
  }

  private async persistStore() {
    try {
      const fs = await import('fs/promises')
      const payload = {
        asOf: this.lastSnapshotMs,
        pullRequests: Array.from(this.store.values())
      }
      await fs.writeFile(PERSIST_PATH, JSON.stringify(payload), 'utf-8')
    } catch {
      // ignore
    }
  }

  public ensureStarted() {
    if (this.started) return
    this.started = true
    if (!this.abortController) {
      this.abortController = new AbortController()
    }
    void this.loop(this.abortController.signal)
  }

  public stop() {
    this.abortController?.abort()
    this.abortController = null
    this.started = false
  }

  public whenReady(): Promise<void> {
    return this.readyPromise || Promise.resolve()
  }

  public getSnapshot(): {
    pullRequests: PRNotification[]
    asOf: number
    status: WorkerStatus
    statusAsOf: number
  } {
    const prs = Array.from(this.store.values())
    return {
      pullRequests: prs,
      asOf: this.lastSnapshotMs || Date.now(),
      status: this.lastStatus,
      statusAsOf: this.lastStatusAsOf
    }
  }

  public onEvent(listener: (evt: WorkerEvent) => void): () => void {
    this.emitter.on('event', listener)
    return () => this.emitter.off('event', listener)
  }

  private emit(evt: WorkerEvent) {
    if (evt.type === 'status') {
      this.lastStatus = evt.status
      this.lastStatusAsOf = evt.asOf
    }
    this.emitter.emit('event', evt)
  }

  private async ghJson<T>(command: string, kind: RequestKind, signal: AbortSignal): Promise<T> {
    await this.bucket.waitAndConsume(REQUEST_COST[kind], signal)
    const { stdout } = await execAsync(command, { timeout: 20000 })
    return JSON.parse(stdout) as T
  }

  private async ghText(command: string, kind: RequestKind, signal: AbortSignal): Promise<string> {
    await this.bucket.waitAndConsume(REQUEST_COST[kind], signal)
    const { stdout } = await execAsync(command, { timeout: 20000 })
    return stdout.trim()
  }

  private async getUsername(signal: AbortSignal): Promise<string> {
    if (this.username) return this.username
    const login = await this.ghText("gh api user --jq '.login'", 'whoami', signal)
    this.username = login
    return this.username
  }

  private upsert(pr: PRNotification, asOf: number) {
    const key = keyForPR(pr)
    const prev = this.store.get(key)

    if (!prev) {
      this.store.set(key, pr)
      this.emit({ type: 'pr', pullRequest: pr, asOf })
      return
    }

    if (prev.updatedAt !== pr.updatedAt || prev.reviewDecision !== pr.reviewDecision || prev.draft !== pr.draft) {
      this.store.set(key, pr)
      this.emit({ type: 'pr', pullRequest: pr, asOf })
    }
  }

  private normalize(pr: any, reason: PRNotification['reason'], repository?: string): PRNotification {
    return {
      title: pr.title,
      reason,
      url: pr.url,
      html_url: pr.url,
      state: (pr.state || 'OPEN').toLowerCase() as PRNotification['state'],
      repository: repository || pr.repository?.nameWithOwner || pr.repository?.fullName || pr.repository || 'Unknown',
      number: pr.number,
      headRef: pr.headRefName || pr.headRef || `pr-${pr.number}`,
      reviewDecision: pr.reviewDecision,
      merged: Boolean(pr.merged) || pr.state === 'MERGED',
      draft: Boolean(pr.isDraft),
      closedAt: pr.closedAt,
      updatedAt: pr.updatedAt,
      createdAt: pr.createdAt,
      author: {
        login: pr.author?.login || pr.author?.name || 'Unknown',
        avatarUrl: pr.author?.avatarUrl
      }
    }
  }

  private async fetchNotifications(signal: AbortSignal): Promise<PRNotification[]> {
    const notifications = await this.ghJson<any[]>(`gh api notifications --paginate`, 'notifications', signal)
    const prNotifs = notifications.filter((n: any) => n.subject?.type === 'PullRequest')

    const results: PRNotification[] = []
    for (const n of prNotifs) {
      const url: string | undefined = n.subject?.url
      if (!url) continue

      const match = url.match(/https:\/\/api\.github\.com\/repos\/([^/]+\/[^/]+)\/pulls\/(\d+)/)
      if (!match) continue

      const repo = match[1]
      const num = Number(match[2])

      try {
        // Fetch full PR details to get the actual branch name
        console.log(`Fetching PR details: gh api repos/${repo}/pulls/${num}`)
        const prDetails = await this.ghJson<any>(
          `gh api repos/${repo}/pulls/${num}`,
          'notifications',
          signal
        )

        results.push(
          this.normalize(
            {
              title: prDetails.title || n.subject?.title || `PR #${num}`,
              url: prDetails.html_url || `https://github.com/${repo}/pull/${num}`,
              state: prDetails.state || 'OPEN',
              number: prDetails.number || num,
              headRefName: prDetails.head?.ref || `pr-${num}`,
              updatedAt: prDetails.updated_at || n.updated_at || new Date().toISOString(),
              createdAt: prDetails.created_at || n.updated_at || new Date().toISOString(),
              isDraft: prDetails.draft || false,
              author: prDetails.user || { login: 'Unknown' },
              reviewDecision: prDetails.review_decision,
              merged: prDetails.merged || false,
              closedAt: prDetails.closed_at
            },
            'notification',
            repo
          )
        )
      } catch (error) {
        // Fallback to basic notification data if PR details fetch fails
        console.warn(`Failed to fetch details for PR #${num} in ${repo}:`, error)
        results.push(
          this.normalize(
            {
              title: n.subject?.title || `PR #${num}`,
              url: `https://github.com/${repo}/pull/${num}`,
              state: 'OPEN',
              number: num,
              headRefName: `pr-${num}`,
              updatedAt: n.updated_at || new Date().toISOString(),
              createdAt: n.updated_at || new Date().toISOString(),
              isDraft: false,
              author: { login: 'Unknown' }
            },
            'notification',
            repo
          )
        )
      }
    }

    return results
  }

  private async fetchUserQueries(username: string, signal: AbortSignal): Promise<PRNotification[]> {
    const queries = [
      { q: `state:open author:${username}`, reason: 'author' as const },
      { q: `state:open review-requested:${username}`, reason: 'review_requested' as const },
      { q: `state:open reviewed-by:${username}`, reason: 'reviewed' as const },
      { q: `state:open commenter:${username}`, reason: 'commenter' as const }
    ]

    const results: PRNotification[] = []
    for (const { q, reason } of queries) {
      const prs = await this.ghJson<any[]>(
        `gh search prs "${q}" --limit 100 --json number,title,state,url,repository,author,updatedAt,createdAt,closedAt,isDraft`,
        'user_query',
        signal
      )

      // Fetch detailed PR info for each PR to get the branch name
      for (const pr of prs) {
        const state = typeof pr.state === 'string' ? pr.state.toLowerCase() : 'open'
        if (state !== 'open') {
          continue
        }
        try {
          const repoName = pr.repository?.nameWithOwner || pr.repository?.fullName || pr.repository
          if (repoName && pr.number) {
            console.log(`Fetching user query PR details: gh api repos/${repoName}/pulls/${pr.number}`)
            const prDetails = await this.ghJson<any>(
              `gh api repos/${repoName}/pulls/${pr.number}`,
              'user_query',
              signal
            )
            // Merge the search results with detailed PR info
            const mergedPR = {
              ...pr,
              headRefName: prDetails.head?.ref || `pr-${pr.number}`
            }
            results.push(this.normalize(mergedPR, reason))
          } else {
            results.push(this.normalize(pr, reason))
          }
        } catch (error) {
          // Fallback to basic PR data if details fetch fails
          console.warn(`Failed to fetch details for PR #${pr.number}:`, error)
          results.push(this.normalize(pr, reason))
        }
      }
    }

    const seen = new Set<string>()
    return results.filter(pr => {
      const key = pr.url
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private async fetchFavorites(favorites: string[], signal: AbortSignal): Promise<PRNotification[]> {
    const results: PRNotification[] = []

    for (const repo of favorites) {
      try {
        const prs = await this.ghJson<any[]>(
          `gh search prs --repo "${repo}" --state open --limit 50 --json title,url,state,number,closedAt,updatedAt,createdAt,author,repository,isDraft`,
          'favorite_repo',
          signal
        )
        
        // Fetch detailed PR info for each PR to get the branch name
        for (const pr of prs) {
          const state = typeof pr.state === 'string' ? pr.state.toLowerCase() : 'open'
          if (state !== 'open') {
            continue
          }
          try {
            const repoName = pr.repository?.nameWithOwner || pr.repository?.fullName || pr.repository || repo
            if (repoName && pr.number) {
              console.log(`Fetching favorite PR details: gh api repos/${repoName}/pulls/${pr.number}`)
              const prDetails = await this.ghJson<any>(
                `gh api repos/${repoName}/pulls/${pr.number}`,
                'favorite_repo',
                signal
              )
              // Merge the search results with detailed PR info
              const mergedPR = {
                ...pr,
                headRefName: prDetails.head?.ref || `pr-${pr.number}`
              }
              results.push(this.normalize(mergedPR, 'favorite', repo))
            } else {
              results.push(this.normalize(pr, 'favorite', repo))
            }
          } catch (error) {
            // Fallback to basic PR data if details fetch fails
            console.warn(`Failed to fetch details for PR #${pr.number} in ${repo}:`, error)
            results.push(this.normalize(pr, 'favorite', repo))
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('cannot be searched') || msg.includes('do not have permission') || msg.includes('Invalid search query')) {
          console.warn(`Skipping inaccessible favorite repo: ${repo} - ${msg}`)
          continue
        }
        throw err
      }
    }

    return results
  }

  private async loop(signal: AbortSignal) {
    const asOf = Date.now()
    this.emit({ type: 'status', status: { type: 'starting' }, asOf })

    if (this.running) return
    this.running = true

    let cooldownUntil = 0

    try {
      while (!signal.aborted) {
        const now = Date.now()

        if (now < cooldownUntil) {
          await sleep(Math.min(1000, cooldownUntil - now), signal)
          continue
        }

        try {
          const username = await this.getUsername(signal)
          const config = await getConfig()
          const favorites = (config.repos || [])
            .filter(r => r.favorite)
            .map(r => r.fullName || r.repoName)
            .filter((v): v is string => Boolean(v))

          const cycleAsOf = Date.now()
          this.emit({ type: 'status', status: { type: 'running' }, asOf: cycleAsOf })

          const notifications = await this.fetchNotifications(signal)
          for (const pr of notifications) this.upsert(pr, cycleAsOf)

          const userPRs = await this.fetchUserQueries(username, signal)
          for (const pr of userPRs) this.upsert(pr, cycleAsOf)

          const favPRs = await this.fetchFavorites(favorites, signal)
          for (const pr of favPRs) this.upsert(pr, cycleAsOf)

          this.lastSnapshotMs = cycleAsOf
          this.emit({ type: 'snapshot', pullRequests: Array.from(this.store.values()), asOf: cycleAsOf })
          void this.persistStore()

          this.emit({ type: 'heartbeat', asOf: Date.now() })
          await sleep(1000, signal)
        } catch (err) {
          const rateMsg = isRateLimitError(err)
          if (rateMsg) {
            const retryAfterMs = 2 * 60 * 1000
            cooldownUntil = Date.now() + retryAfterMs
            this.emit({
              type: 'status',
              status: { type: 'rate_limited', retryAfterMs, message: rateMsg },
              asOf: Date.now()
            })
            continue
          }

          const msg = err instanceof Error ? err.message : 'Unknown error'
          this.emit({ type: 'status', status: { type: 'error', message: msg }, asOf: Date.now() })
          await sleep(5000, signal)
        }
      }
    } finally {
      this.running = false
    }
  }
}

let singleton: PullRequestsWorker | null = null

export function getPullRequestsWorker(): PullRequestsWorker {
  if (!singleton) singleton = new PullRequestsWorker()
  return singleton
}
