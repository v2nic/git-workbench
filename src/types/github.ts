export interface GitHubRepo {
  id: number
  name: string
  fullName: string
  description?: string
  url: string
  sshUrl: string
  httpsUrl: string
  isPrivate: boolean
  defaultBranch: string
  owner: {
    login: string
  }
}

export interface GitHubPullRequest {
  number: number
  url: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  title: string
  head: {
    ref: string
    sha: string
  }
}
