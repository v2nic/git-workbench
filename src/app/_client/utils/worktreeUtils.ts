import { Worktree } from '@/types/worktrees'
import { PRNotification } from '@/types/github'

/**
 * Extract worktree name from path (last directory name)
 */
export const getWorktreeName = (worktree: Worktree): string => {
  return worktree.pathRelativeToHome 
    ? worktree.pathRelativeToHome.split('/').pop() || worktree.pathRelativeToHome
    : 'Unknown Worktree'
}

/**
 * Extract worktree name from full path
 */
export const getWorktreeNameFromPath = (fullPath: string): string => {
  return fullPath.split('/').pop() || fullPath
}

/**
 * Check if worktree has any changes (dirty state)
 */
export const isWorktreeDirty = (worktree: Worktree): boolean => {
  if (!worktree.status) return false
  
  return (
    worktree.status.staged > 0 || 
    worktree.status.modified > 0 || 
    worktree.status.untracked > 0 || 
    worktree.status.outgoing > 0
  )
}

/**
 * Find matching pull request for a worktree
 */
export const findMatchingPR = (worktree: Worktree, pullRequests: PRNotification[]): PRNotification | undefined => {
  return pullRequests.find(pr => 
    pr.headRef === worktree.branch && 
    pr.repository.toLowerCase() === (worktree.repoFullName || '').toLowerCase()
  )
}
