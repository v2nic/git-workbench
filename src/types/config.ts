export interface EditorConfig {
  name: string           // Display name (e.g., "Windsurf", "VS Code", "Cursor")
  scheme: string         // URL scheme (e.g., "windsurf", "vscode", "cursor")
  icon?: string          // Optional Lucide icon name
  openCommand?: string   // Optional custom command template
}

export interface RepoConfig {
  fullName?: string
  repoName?: string
  sshUrl?: string
  httpsUrl?: string
  barePath?: string
  defaultBranch: string
  favorite: boolean
}

export interface CreateRepoData {
  repoName: string
  defaultBranch: string
  worktreeName: string
  worktreeBranchName: string
  favorite: boolean
}

export interface CreateRepoResponse {
  success: boolean
  repo: RepoConfig
  error?: string
}

export interface Config {
  version: number
  paths: {
    bareRoot: string
    worktreeRoot: string
  }
  editor: EditorConfig
  repos: RepoConfig[]
}
