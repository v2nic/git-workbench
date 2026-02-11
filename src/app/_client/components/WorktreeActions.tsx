import React from 'react'
import { Button } from './ui/Button'
import { DropdownMenu, DropdownMenuItem } from './ui/DropdownMenu'
import { MoreVertical, FolderOpen } from 'lucide-react'

interface WorktreeActionsProps {
  worktreePath: string
  onOpenInWindsurf: () => void
  onCreateFromBranch: () => void
  onDeleteWorktree: () => void
}

export const WorktreeActions: React.FC<WorktreeActionsProps> = ({
  worktreePath,
  onOpenInWindsurf,
  onCreateFromBranch,
  onDeleteWorktree
}) => {
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={onOpenInWindsurf}
        title={worktreePath}
      >
        <FolderOpen className="w-4 h-4 mr-2" />
        Open
      </Button>
      
      <Button
        variant="secondary"
        size="sm"
        onClick={onCreateFromBranch}
      >
        Create from this branch
      </Button>
      
      <DropdownMenu
        trigger={
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        }
      >
        <DropdownMenuItem onClick={onDeleteWorktree}>
          Delete
        </DropdownMenuItem>
      </DropdownMenu>
    </div>
  )
}
