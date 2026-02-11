import { useCallback } from 'react'
import { Worktree } from '@/types/worktrees'
import { PRNotification } from '@/types/github'
import { generateEditorUrl } from '@/lib/editor'
import { EditorConfig } from '@/types/config'

interface UseWorktreeActionsProps {
  worktree: Worktree
  editorConfig: EditorConfig
  onDeleteWorktree: (worktree: Worktree) => void
  onCreateFromBranch: (repoName: string, branchName: string) => void
  onNavigateToPR?: (prNumber: number, prRepository: string) => void
  matchingPR?: PRNotification
}

interface UseWorktreeActionsReturn {
  handleOpenInGitHub: () => void
  handleOpenInEditor: () => void
  handleDeleteWorktree: () => void
  handleCreateFromBranch: () => void
  handleNavigateToPR: () => void
}

export const useWorktreeActions = ({
  worktree,
  editorConfig,
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

  const handleOpenInEditor = useCallback(() => {
    const url = generateEditorUrl(editorConfig, worktree.path)
    window.open(url, '_blank')
  }, [editorConfig, worktree.path])

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
    handleOpenInEditor,
    handleDeleteWorktree,
    handleCreateFromBranch,
    handleNavigateToPR
  }
}
