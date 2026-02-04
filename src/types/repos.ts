export interface Repo {
  fullName?: string
  repoName: string
  favorite?: boolean
  barePath: string
  remoteUrls?: string[]
  tracked: boolean
  needsClone?: boolean
}
