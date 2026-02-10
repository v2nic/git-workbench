import React from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Worktree } from '@/types/worktrees'

interface StateMismatchModalProps {
  isOpen: boolean
  onClose: () => void
  worktree: Worktree | null
  mismatches: Array<{
    type: 'staged' | 'modified' | 'untracked'
    expected: number
    actual: number
    hashMismatch?: boolean
    newFiles?: string[]
  }>
  onRefresh: () => void
  onForceDelete: () => void
  isLoading?: boolean
}

export function StateMismatchModal({
  isOpen,
  onClose,
  worktree,
  mismatches,
  onRefresh,
  onForceDelete,
  isLoading = false
}: StateMismatchModalProps) {
  if (!worktree) return null

  const renderMismatchDetails = () => {
    return mismatches.map((mismatch, index) => {
      if (mismatch.type === 'untracked' && mismatch.newFiles) {
        return (
          <div key={index} className="text-red-600 dark:text-red-400">
            <span className="font-medium">Untracked files:</span> {mismatch.newFiles.length} new file(s)
            <div className="text-xs mt-1 font-mono opacity-75">
              {mismatch.newFiles.slice(0, 5).join(', ')}
              {mismatch.newFiles.length > 5 && `... and ${mismatch.newFiles.length - 5} more`}
            </div>
          </div>
        )
      } else if (mismatch.hashMismatch) {
        return (
          <div key={index} className="text-orange-600 dark:text-orange-400">
            <span className="font-medium">{mismatch.type} files:</span> File list changed (count unchanged)
          </div>
        )
      } else {
        return (
          <div key={index} className="text-blue-600 dark:text-blue-400">
            <span className="font-medium capitalize">{mismatch.type} files:</span> {mismatch.expected} → {mismatch.actual}
          </div>
        )
      }
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Worktree State Changed">
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-foreground">
              The worktree <span className="font-semibold">{worktree.pathRelativeToHome}</span> has changed since you viewed it:
            </p>
          </div>
        </div>
        
        <div className="bg-muted/50 rounded p-3 space-y-2 text-sm">
          {renderMismatchDetails()}
        </div>

        <p className="text-sm text-muted-foreground">
          This could be due to:
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
          <li>Files were added, modified, or deleted</li>
          <li>Another process made changes to the worktree</li>
          <li>Git operations are in progress</li>
        </ul>

        <div className="flex gap-2 justify-end pt-4">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Status
          </Button>
          <Button
            variant="destructive"
            onClick={onForceDelete}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete Anyway'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
