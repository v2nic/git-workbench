import useSWR from 'swr'
import { Worktree } from '@/types/worktrees'

const fetcher = async (url: string): Promise<Worktree[]> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch worktrees')
  }
  return response.json()
}

export function useWorktrees() {
  const { data, error, mutate } = useSWR('/api/worktrees', fetcher, {
    refreshInterval: 15000 // Refresh every 15 seconds
  })

  return {
    worktrees: data || [],
    isLoading: !error && !data,
    error,
    mutate
  }
}
