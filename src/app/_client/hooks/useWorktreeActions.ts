import { useCallback } from 'react'
import { Worktree } from '@/types/worktrees'
import { PRNotification } from '@/types/github'

interface UseWorktreeActionsProps {
  worktree: Worktree
  onDeleteWorktree: (worktree: Worktree) => void
  onCreateFromBranch: (repoName: string, branchName: string) => void
  onNavigateToPR?: (prNumber: number, prRepository: string) => void
  matchingPR?: PRNotification
}

interface UseWorktreeActionsReturn {
  handleOpenInGitHub: () => void
  handleOpenInWindsurf: () => void
  handleDeleteWorktree: () => void
  handleCreateFromBranch: () => void
  handleNavigateToPR: () => void
}

export const useWorktreeActions = ({
  worktree,
  onDeleteWorktree,
  onCreateFromBranch,
  onNavigateToPR,
  matchingPR
}: UseWorktreeActionsProps): UseWorktreeActionsReturn => {
  const handleOpenInGitHub = useCallback(() => {
    if (worktree.repoFullName) {
      const url = `https://github.com/${worktree.repoFullName}/tree/${worktree.branch}`
      window.open(url, '_blank')
    }
  }, [worktree.repoFullName, worktree.branch])

  const handleOpenInWindsurf = useCallback(() => {
    const url = `windsurf://file/${encodeURIComponent(worktree.path)}`
    window.open(url, '_blank')
  }, [worktree.path])

  const handleDeleteWorktree = useCallback(() => {
    onDeleteWorktree(worktree)
  }, [worktree, onDeleteWorktree])

  const handleCreateFromBranch = useCallback(() => {
    const repoName = worktree.repoFullName || worktree.repoName
    onCreateFromBranch(repoName, worktree.branch)
  }, [worktree, onCreateFromBranch])

  const handleNavigateToPR = useCallback(() => {
    if (matchingPR && onNavigateToPR) {
      onNavigateToPR(matchingPR.number, matchingPR.repository)
    }
  }, [matchingPR, onNavigateToPR])

  return {
    handleOpenInGitHub,
    handleOpenInWindsurf,
    handleDeleteWorktree,
    handleCreateFromBranch,
    handleNavigateToPR
  }
}
