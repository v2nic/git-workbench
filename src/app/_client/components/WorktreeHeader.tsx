import React from 'react'
import { Worktree } from '@/types/worktrees'

interface WorktreeHeaderProps {
  worktree: Worktree
  worktreeName: string
}

export const WorktreeHeader: React.FC<WorktreeHeaderProps> = ({
  worktree,
  worktreeName
}) => {
  return (
    <div className="flex items-center space-x-2">
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          <span className="font-medium" title={worktree.pathRelativeToHome}>
            {worktreeName}
          </span>
        </div>
      </div>
    </div>
  )
}
