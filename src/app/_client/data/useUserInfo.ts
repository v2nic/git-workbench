import useSWR from 'swr'

interface UserInfo {
  githubUsername: string
  gitUserName: string
  gitUserEmail: string
}

const fetcher = async (url: string): Promise<UserInfo> => {
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`)
  }
  
  return response.json()
}

export function useUserInfo() {
  const { data, error, isLoading } = useSWR(
    typeof window !== 'undefined' ? '/api/user' : null,
    fetcher,
    { 
      ssr: false,
      revalidateOnFocus: false,
      refreshInterval: 300000 // 5 minutes
    }
  )
  
  return { 
    userInfo: data || { githubUsername: '', gitUserName: '', gitUserEmail: '' }, 
    isLoading, 
    error 
  }
}
