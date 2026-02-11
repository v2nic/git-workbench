import { useMemo } from 'react'
import { Worktree } from '@/types/worktrees'
import { PRNotification } from '@/types/github'
import { getWorktreeName, isWorktreeDirty, findMatchingPR } from '../utils/worktreeUtils'

interface UseWorktreeDataProps {
  worktree: Worktree
  allPullRequests: PRNotification[]
}

interface UseWorktreeDataReturn {
  worktreeName: string
  isDirty: boolean
  matchingPR?: PRNotification
}

export const useWorktreeData = ({
  worktree,
  allPullRequests
}: UseWorktreeDataProps): UseWorktreeDataReturn => {
  const worktreeName = useMemo(() => getWorktreeName(worktree), [worktree])
  
  const isDirty = useMemo(() => isWorktreeDirty(worktree), [worktree])
  
  const matchingPR = useMemo(() => findMatchingPR(worktree, allPullRequests), [worktree, allPullRequests])

  return {
    worktreeName,
    isDirty,
    matchingPR
  }
}
