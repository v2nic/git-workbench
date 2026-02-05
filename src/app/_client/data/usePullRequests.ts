import { PRNotification } from '@/types/github'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export function usePullRequests() {
  const prsByUrlRef = useRef<Map<string, PRNotification>>(new Map())
  const eventSourceRef = useRef<EventSource | null>(null)
  const retryUntilMsRef = useRef<number | null>(null)
  const previousCountRef = useRef<number>(0)

  const [pullRequests, setPullRequests] = useState<PRNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [cached, setCached] = useState(true)
  const [rateLimited, setRateLimited] = useState(false)
  const [timestamp, setTimestamp] = useState<number | undefined>(undefined)
  const [retryInSeconds, setRetryInSeconds] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  const publish = useCallback(() => {
    const currentPRs = Array.from(prsByUrlRef.current.values())
    const currentCount = currentPRs.length
    const previousCount = previousCountRef.current
    
    // Check if PRs were added or removed
    if (previousCount > 0 && currentCount !== previousCount) {
      setUpdateAvailable(true)
    }
    
    previousCountRef.current = currentCount
    setPullRequests(currentPRs)
  }, [])

  const checkForRemovedPRs = useCallback((newPRs: PRNotification[]) => {
    const currentUrls = new Set(prsByUrlRef.current.keys())
    const newUrls = new Set(newPRs.map(pr => pr.url))
    
    // Check if any PRs were removed
    const hasRemovals = Array.from(currentUrls).some(url => !newUrls.has(url))
    
    // Check if any PRs were added
    const hasAdditions = Array.from(newUrls).some(url => !currentUrls.has(url))
    
    return hasRemovals || hasAdditions
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsLoading(true)
    setError(null)

    const es = new EventSource('/api/pull-requests/stream')
    eventSourceRef.current = es

    const onSnapshot = (evt: MessageEvent<string>) => {
      const data = JSON.parse(evt.data) as {
        pullRequests: PRNotification[]
        asOf: number
        status?: { type: string; retryAfterMs?: number }
      }

      const hasChanges = checkForRemovedPRs(data.pullRequests)
      
      prsByUrlRef.current = new Map(data.pullRequests.map(pr => [pr.url, pr]))
      setTimestamp(data.asOf)
      
      // Check if PRs were added or removed on snapshot update
      if (hasChanges && previousCountRef.current > 0) {
        setUpdateAvailable(true)
      }
      
      previousCountRef.current = data.pullRequests.length
      setPullRequests(data.pullRequests)
      setIsLoading(false)

      setCached(Date.now() - data.asOf > 30_000)

      if (data.status?.type === 'rate_limited' && typeof data.status.retryAfterMs === 'number') {
        setRateLimited(true)
        const until = Date.now() + data.status.retryAfterMs
        retryUntilMsRef.current = until
      }
    }

    const onPr = (evt: MessageEvent<string>) => {
      const data = JSON.parse(evt.data) as { pullRequest: PRNotification; asOf: number }
      const pr = data.pullRequest
      const wasExisted = prsByUrlRef.current.has(pr.url)
      
      prsByUrlRef.current.set(pr.url, pr)
      setTimestamp(data.asOf)
      setCached(false)
      
      // Only show update banner if this is a new PR (not an update to existing PR)
      if (!wasExisted) {
        setUpdateAvailable(true)
      }
      
      publish()
    }

    const onStatus = (evt: MessageEvent<string>) => {
      const data = JSON.parse(evt.data) as { status: { type: string; retryAfterMs?: number; message?: string }; asOf: number }
      setTimestamp(data.asOf)

      if (data.status.type === 'rate_limited' && typeof data.status.retryAfterMs === 'number') {
        setRateLimited(true)
        const until = Date.now() + data.status.retryAfterMs
        retryUntilMsRef.current = until
        return
      }

      if (data.status.type === 'error') {
        setErrorMessage(data.status.message ?? 'Unknown error')
        setRateLimited(false)
        retryUntilMsRef.current = null
        setRetryInSeconds(null)
        return
      }

      if (data.status.type === 'running') {
        setRateLimited(false)
        setErrorMessage(null)
        retryUntilMsRef.current = null
        setRetryInSeconds(null)
      }
    }

    const onError = () => {
      setError(new Error('SSE connection error'))
      setIsLoading(false)
    }

    es.addEventListener('snapshot', onSnapshot as EventListener)
    es.addEventListener('pr', onPr as EventListener)
    es.addEventListener('status', onStatus as EventListener)
    es.addEventListener('error', onError as EventListener)

    return () => {
      es.removeEventListener('snapshot', onSnapshot as EventListener)
      es.removeEventListener('pr', onPr as EventListener)
      es.removeEventListener('status', onStatus as EventListener)
      es.removeEventListener('error', onError as EventListener)
      es.close()
      if (eventSourceRef.current === es) eventSourceRef.current = null
    }
  }, [checkForRemovedPRs, publish])

  useEffect(() => {
    const id = setInterval(() => {
      const until = retryUntilMsRef.current
      if (!until) return

      const remainingMs = until - Date.now()
      if (remainingMs <= 0) {
        retryUntilMsRef.current = null
        setRetryInSeconds(null)
        return
      }
      setRetryInSeconds(Math.ceil(remainingMs / 1000))
    }, 250)

    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      if (timestamp === undefined) return
      setCached(Date.now() - timestamp > 30_000)
    }, 1000)

    return () => clearInterval(id)
  }, [timestamp])

  const refreshPullRequests = useCallback(() => {
    setUpdateAvailable(false)
    // Force a refresh by triggering publish with current data
    publish()
  }, [publish])

  const result = useMemo(
    () => ({
      pullRequests,
      isLoading,
      error,
      cached,
      rateLimited,
      timestamp,
      retryInSeconds,
      errorMessage,
      updateAvailable,
      refreshPullRequests
    }),
    [pullRequests, isLoading, error, cached, rateLimited, timestamp, retryInSeconds, errorMessage, updateAvailable, refreshPullRequests]
  )

  return result
}
