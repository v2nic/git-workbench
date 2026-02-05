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

export interface PRNotification {
  title: string
  reason: 'author' | 'review_requested' | 'reviewed' | 'commenter' | 'notification' | 'favorite'
  url: string
  html_url: string
  state: 'open' | 'closed' | 'merged'
  repository: string
  number: number
  headRef: string
  reviewDecision?: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED'
  merged: boolean
  draft: boolean
  closedAt?: string
  updatedAt: string
  createdAt: string
  author: {
    login: string
    avatarUrl?: string
  }
}
