import React from 'react'
import { Button } from './ui/Button'
import { DropdownMenu, DropdownMenuItem } from './ui/DropdownMenu'
import { MoreVertical, Trash2 } from 'lucide-react'
import { PRNotification } from '@/types/github'

interface PRActionsProps {
  pr: PRNotification
  hasMatchingWorktree: boolean
  onDeleteWorktree: (pr: PRNotification) => void
}

export const PRActions: React.FC<PRActionsProps> = ({
  pr,
  hasMatchingWorktree,
  onDeleteWorktree
}) => {
  if (!hasMatchingWorktree) {
    return null
  }

  return (
    <DropdownMenu
      trigger={
        <Button variant="ghost" size="sm">
          <MoreVertical className="w-4 h-4" />
        </Button>
      }
    >
      <DropdownMenuItem onClick={() => onDeleteWorktree(pr)}>
        <div className="flex items-center space-x-2">
          <Trash2 className="w-4 h-4" />
          <span>Delete work tree</span>
        </div>
      </DropdownMenuItem>
    </DropdownMenu>
  )
}
