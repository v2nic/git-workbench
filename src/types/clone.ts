export interface CloneRepoState {
  url: string;
  isValid: boolean;
  isSubmitting: boolean;
  error: string;
  repoInfo: RepoInfo | null;
}

export interface RepoInfo {
  owner: string;
  repo: string;
  fullName: string;
  defaultBranch: string;
  description?: string;
}

export interface CloneRepoActions {
  updateUrl: (url: string) => void;
  validateUrl: () => Promise<void>;
  submitClone: () => Promise<void>;
  clearError: () => void;
}

export interface CloneRepoMeta {
  inputRef: React.RefObject<HTMLInputElement>;
}

export interface CloneRepoContextValue {
  state: CloneRepoState;
  actions: CloneRepoActions;
  meta: CloneRepoMeta;
}

export interface CloneRepoData {
  url: string;
  repoName: string;
  favorite: boolean;
}
