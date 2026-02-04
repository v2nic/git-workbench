export interface WorktreeStatus {
  staged: number
  modified: number
  untracked: number
  incoming: number
  outgoing: number
}

export interface Worktree {
  path: string
  pathRelativeToHome: string
  branch: string
  status?: WorktreeStatus
  repoName: string
  repoFullName?: string
}

export interface CreateWorktreeRequest {
  repoFullNameOrName: string
  worktreeName: string
  ref?: string
}

export interface CreateFromBranchRequest {
  repo: string
  fromBranch: string
  newBranchName: string
  worktreeName?: string
}

export interface CreateFromMainRequest {
  repo: string
  newBranchName: string
  worktreeName?: string
}

export interface DeleteWorktreeRequest {
  repo: string
  worktreePath: string
}
