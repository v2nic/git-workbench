export interface Branch {
  name: string;
  repoName: string;
  repoFullName?: string;
  isLocal: boolean;
  isRemote: boolean;
  remoteName?: string;
  trackingBranch?: string;
  isMergedToMain: boolean;
  hasWorktree: boolean;
  worktreePath?: string;
  lastCommitDate?: string;
  lastCommitMessage?: string;
}

export interface DeleteBranchRequest {
  repoName: string;
  branchName: string;
  deleteLocal: boolean;
  deleteRemote: boolean;
  force?: boolean;
}

export interface DeleteBranchResponse {
  localDeleted: boolean;
  remoteDeleted: boolean;
  error?: string;
}
