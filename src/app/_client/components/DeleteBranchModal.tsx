import React, { useState, useCallback } from 'react'
import { Branch } from '@/types/branches'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { AlertTriangle } from 'lucide-react'

interface DeleteBranchModalProps {
  isOpen: boolean
  onClose: () => void
  branch: Branch | null
  onConfirm: (branch: Branch, deleteLocal: boolean, deleteRemote: boolean, force: boolean) => void
  isLoading: boolean
}

export function DeleteBranchModal({
  isOpen,
  onClose,
  branch,
  onConfirm,
  isLoading,
}: DeleteBranchModalProps) {
  const [deleteRemote, setDeleteRemote] = useState(false)
  const [forceDelete, setForceDelete] = useState(false)

  const handleConfirm = useCallback(() => {
    if (!branch) return

    const deleteLocal = branch.isLocal
    const shouldDeleteRemote = branch.isRemote && !branch.isLocal
      ? true
      : deleteRemote

    onConfirm(branch, deleteLocal, shouldDeleteRemote, forceDelete)
  }, [branch, deleteRemote, forceDelete, onConfirm])

  const handleClose = useCallback(() => {
    setDeleteRemote(false)
    setForceDelete(false)
    onClose()
  }, [onClose])

  if (!branch) return null

  const isLocalOnly = branch.isLocal && !branch.isRemote
  const isRemoteOnly = !branch.isLocal && branch.isRemote
  const isBoth = branch.isLocal && branch.isRemote

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Delete Branch">
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              Delete branch &quot;{branch.name}&quot;?
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Repository: {branch.repoName}
            </p>
          </div>
        </div>

        {isLocalOnly && !branch.isMergedToMain && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              This branch has not been merged to the default branch. Deleting it may result in lost work.
            </p>
          </div>
        )}

        {isLocalOnly && branch.isMergedToMain && (
          <p className="text-sm text-muted-foreground">
            This local branch has been merged and can be safely deleted.
          </p>
        )}

        {isRemoteOnly && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-800 dark:text-red-200">
              This will delete the remote branch from the server. This action cannot be undone.
            </p>
          </div>
        )}

        {isBoth && (
          <>
            <p className="text-sm text-muted-foreground">
              This branch exists both locally and on the remote.
              {!branch.isMergedToMain && ' It has not been merged to the default branch.'}
            </p>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteRemote}
                onChange={(e) => setDeleteRemote(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Also delete the remote branch (cannot be undone)</span>
            </label>
          </>
        )}

        {isLocalOnly && !branch.isMergedToMain && (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={forceDelete}
              onChange={(e) => setForceDelete(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Force delete (branch is not merged)</span>
          </label>
        )}

        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || (isLocalOnly && !branch.isMergedToMain && !forceDelete)}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
