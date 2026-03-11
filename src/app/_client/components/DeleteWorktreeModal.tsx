import React, { useState } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Worktree, WorktreeStatus } from "@/types/worktrees";

interface DeleteWorktreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  worktree: Worktree | null;
  status: WorktreeStatus | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteWorktreeModal({
  isOpen,
  onClose,
  worktree,
  status,
  onConfirm,
  isLoading = false,
}: DeleteWorktreeModalProps) {
  if (!worktree || !status) return null;

  const isDirty =
    status.staged > 0 ||
    status.modified > 0 ||
    status.untracked > 0 ||
    status.outgoing > 0;

  return (
    <Modal isOpen={isOpen && isDirty} onClose={onClose} title="Delete Worktree">
      <div className="space-y-4">
        <p className="text-sm text-foreground">
          The worktree{" "}
          <span className="font-semibold">{worktree.pathRelativeToHome}</span>{" "}
          is not clean and contains uncommitted changes:
        </p>

        <div className="bg-muted/50 rounded p-3 space-y-1 text-sm">
          {status.staged > 0 && (
            <div className="text-green-600 dark:text-green-400">
              Staged: {status.staged}
            </div>
          )}
          {status.modified > 0 && (
            <div className="text-orange-600 dark:text-orange-400">
              Modified: {status.modified}
            </div>
          )}
          {status.untracked > 0 && (
            <div className="text-red-600 dark:text-red-400">
              Untracked: {status.untracked}
            </div>
          )}
          {status.outgoing > 0 && (
            <div className="text-purple-600 dark:text-purple-400">
              Outgoing: {status.outgoing}
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete this worktree? This action cannot be
          undone.
        </p>

        <div className="flex gap-2 justify-end pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : "Delete Anyway"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
