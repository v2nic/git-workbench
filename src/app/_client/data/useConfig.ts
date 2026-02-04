import useSWR from 'swr'
import { Config } from '@/types/config'

const fetcher = async (url: string): Promise<Config> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch config')
  }
  return response.json()
}

export function useConfig() {
  const { data, error, mutate } = useSWR('/api/config', fetcher)

  return {
    config: data,
    isLoading: !error && !data,
    error,
    mutate
  }
}
