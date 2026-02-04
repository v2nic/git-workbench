import useSWR from 'swr'
import { Repo } from '@/types/repos'

const fetcher = async (url: string): Promise<Repo[]> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch repos')
  }
  return response.json()
}

export function useRepos() {
  const { data, error, mutate } = useSWR('/api/repos', fetcher)

  return {
    repos: data || [],
    isLoading: !error && !data,
    error,
    mutate
  }
}
