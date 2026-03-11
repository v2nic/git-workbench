import { useCallback } from "react";
import { PRNotification } from "@/types/github";
import { useBranchReference } from "../contexts/BranchReferenceContext";

interface UseWorktreeCreationProps {
  pr: PRNotification;
  onCreateFromBranch?: (repoName: string, branchName: string) => void;
  onCreateWorktree?: (repoName: string) => void;
}

export function useWorktreeCreation({
  pr,
  onCreateFromBranch,
  onCreateWorktree,
}: UseWorktreeCreationProps) {
  const { getRemoteRef } = useBranchReference();

  const handleCreateWorktree = useCallback(() => {
    if (onCreateFromBranch) {
      // Extract the repository name without owner for the worktree API
      const repoName = pr.repository.split("/")[1] || pr.repository;
      // Use the context to get the proper remote reference
      const remoteRef = getRemoteRef(pr.headRef);
      onCreateFromBranch(repoName, remoteRef);
    } else if (onCreateWorktree) {
      // Fallback to basic create worktree if onCreateFromBranch not available
      const repoName = pr.repository.split("/")[1] || pr.repository;
      onCreateWorktree(repoName);
    }
  }, [
    pr.repository,
    pr.headRef,
    onCreateFromBranch,
    onCreateWorktree,
    getRemoteRef,
  ]);

  return { handleCreateWorktree };
}
