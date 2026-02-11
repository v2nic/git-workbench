import React from 'react'
import { Button } from './ui/Button'
import { DropdownMenu, DropdownMenuItem } from './ui/DropdownMenu'
import { MoreVertical, FolderOpen, Code, Folder, Cpu, Terminal, FileText, Edit3, PenTool } from 'lucide-react'
import { EditorConfig } from '@/types/config'

interface WorktreeActionsProps {
  worktreePath: string
  editorConfig: EditorConfig
  onOpenInEditor: () => void
  onCreateFromBranch: () => void
  onDeleteWorktree: () => void
}

function renderEditorIcon(editorConfig: EditorConfig, className: string = '') {
  switch (editorConfig.icon) {
    case 'Code':
      return <Code className={className} />
    case 'FolderOpen':
      return <FolderOpen className={className} />
    case 'Cpu':
      return <Cpu className={className} />
    case 'Terminal':
      return <Terminal className={className} />
    case 'FileText':
      return <FileText className={className} />
    case 'Edit3':
      return <Edit3 className={className} />
    case 'PenTool':
      return <PenTool className={className} />
    default:
      return <FolderOpen className={className} />
  }
}

export const WorktreeActions: React.FC<WorktreeActionsProps> = ({
  worktreePath,
  editorConfig,
  onOpenInEditor,
  onCreateFromBranch,
  onDeleteWorktree
}) => {
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={onOpenInEditor}
        title={worktreePath}
      >
        {renderEditorIcon(editorConfig, "w-4 h-4 mr-2")}
        Open
      </Button>
      
      <DropdownMenu
        trigger={
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        }
      >
        <DropdownMenuItem onClick={onCreateFromBranch}>
          Duplicate worktree
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDeleteWorktree}>
          Delete
        </DropdownMenuItem>
      </DropdownMenu>
    </div>
  )
}
