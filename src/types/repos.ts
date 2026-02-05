export interface Repo {
  fullName?: string
  repoName: string
  favorite?: boolean
  barePath: string
  remoteUrls?: string[]
  sshUrl?: string
  httpsUrl?: string
  tracked: boolean
  needsClone?: boolean
}
