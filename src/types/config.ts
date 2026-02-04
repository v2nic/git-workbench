export interface RepoConfig {
  fullName?: string
  repoName?: string
  sshUrl?: string
  httpsUrl?: string
  barePath?: string
  defaultBranch: string
  favorite: boolean
}

export interface Config {
  version: number
  paths: {
    bareRoot: string
    worktreeRoot: string
  }
  repos: RepoConfig[]
}
