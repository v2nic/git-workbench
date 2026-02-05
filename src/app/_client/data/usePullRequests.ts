import useSWR from 'swr'
import { PRNotification } from '@/types/github'

interface PullRequestsResponse {
  pullRequests: PRNotification[]
  cached: boolean
  rateLimited: boolean
  timestamp: number
  error?: string
}

const fetcher = async (url: string): Promise<PullRequestsResponse> => {
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`)
  }
  
  return response.json()
}

export function usePullRequests() {
  const { data, error, mutate, isLoading } = useSWR(
    typeof window !== 'undefined' ? '/api/pull-requests' : null,
    fetcher,
    { 
      ssr: false, 
      refreshInterval: 60000, // 1 minute
      revalidateOnFocus: false,
      loadingTimeout: 30000 // 30 second timeout
    }
  )
  
  return { 
    pullRequests: data?.pullRequests || [], 
    isLoading, 
    error, 
    mutate,
    cached: data?.cached || false,
    rateLimited: data?.rateLimited || false,
    timestamp: data?.timestamp
  }
}
