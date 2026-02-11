import React, { memo, forwardRef } from 'react'
import { Worktree } from '@/types/worktrees'
import { PRNotification } from '@/types/github'
import { EditorConfig } from '@/types/config'
import { Code, Folder, Cpu, Terminal, FileText, Edit3, PenTool, FolderOpen } from 'lucide-react'
import { useWorktreeAnimation } from '../hooks/useWorktreeAnimation'
import { useWorktreeActions } from '../hooks/useWorktreeActions'
import { useWorktreeData } from '../hooks/useWorktreeData'
import { WorktreeHeader } from './WorktreeHeader'
import { WorktreeBranchInfo } from './WorktreeBranchInfo'
import { WorktreeActions } from './WorktreeActions'
import clsx from 'clsx'

interface WorktreeRowProps {
  worktree: Worktree
  editorConfig: EditorConfig
  onDeleteWorktree: (worktree: Worktree) => void
  onCreateFromBranch: (repoName: string, branchName: string) => void
  allPullRequests?: PRNotification[]
  onNavigateToPR?: (prNumber: number, prRepository: string) => void
  isHighlighted?: boolean
  onClearHighlight?: () => void
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
      return <Folder className={className} />
  }
}

export const WorktreeRow = memo(forwardRef(function WorktreeRow({
  worktree,
  editorConfig,
  onDeleteWorktree,
  onCreateFromBranch,
  allPullRequests = [],
  onNavigateToPR,
  isHighlighted = false,
  onClearHighlight
}: WorktreeRowProps, ref: React.Ref<HTMLDivElement>) {
  // Use extracted hooks
  const { getAnimationClass } = useWorktreeAnimation({ isHighlighted })
  const { worktreeName, isDirty, matchingPR } = useWorktreeData({ worktree, allPullRequests })
  const {
    handleOpenInGitHub,
    handleOpenInEditor,
    handleDeleteWorktree,
    handleCreateFromBranch,
    handleNavigateToPR
  } = useWorktreeActions({
    worktree,
    editorConfig,
    onDeleteWorktree,
    onCreateFromBranch,
    onNavigateToPR,
    matchingPR
  })

  return (
    <div ref={ref} className={clsx(
      'border-b p-4 hover:bg-muted/50 transition-colors',
      isHighlighted && 'worktree-highlight-permanent dark:worktree-highlight-permanent-dark',
      getAnimationClass()
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenInEditor}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title={`Open in ${editorConfig.name}`}
            >
              {renderEditorIcon(editorConfig, "w-4 h-4")}
            </button>
            
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <WorktreeHeader
                  worktree={worktree}
                  worktreeName={worktreeName}
                />
              </div>
              
              <WorktreeBranchInfo
                worktree={worktree}
                worktreeName={worktreeName}
                isDirty={isDirty}
                pullRequests={allPullRequests}
                matchingPR={matchingPR}
                onNavigateToPR={handleNavigateToPR}
              />
            </div>
          </div>
        </div>

        <WorktreeActions
          worktreePath={worktree.path}
          editorConfig={editorConfig}
          onOpenInEditor={handleOpenInEditor}
          onCreateFromBranch={handleCreateFromBranch}
          onDeleteWorktree={handleDeleteWorktree}
        />
      </div>
    </div>
  )
}))
