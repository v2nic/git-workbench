import useSWR from 'swr'
import { GitHubPullRequest } from '@/types/github'

const fetcher = async (url: string): Promise<GitHubPullRequest[]> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch pull requests')
  }
  return response.json()
}

export function usePullRequest(repoFullName: string, branch: string) {
  const { data, error, mutate } = useSWR(
    repoFullName && branch ? `/api/github/pr?repo=${encodeURIComponent(repoFullName)}&branch=${encodeURIComponent(branch)}` : null,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: false
    }
  )

  return {
    pullRequests: data || [],
    isLoading: !error && !data && repoFullName && branch,
    error,
    mutate
  }
}
