import React, { memo, useCallback, useState, useEffect, useRef } from "react";
import { Branch } from "@/types/branches";
import { Button } from "./ui/Button";
import {
  GitBranch,
  GitBranchPlus,
  FolderOpen,
  MoreVertical,
  Trash2,
  Globe,
  Monitor,
} from "lucide-react";
import clsx from "clsx";

interface BranchRowProps {
  branch: Branch;
  onJumpToWorktree: (repoName: string, branchName: string) => void;
  onCreateWorktree: (repoName: string, branchName: string) => void;
  onDeleteBranch: (branch: Branch) => void;
  isHighlighted?: boolean;
}

export const BranchRow = memo(function BranchRow({
  branch,
  onJumpToWorktree,
  onCreateWorktree,
  onDeleteBranch,
  isHighlighted,
}: BranchRowProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const handleJumpToWorktree = useCallback(() => {
    onJumpToWorktree(branch.repoName, branch.name);
  }, [branch.repoName, branch.name, onJumpToWorktree]);

  const handleCreateWorktree = useCallback(() => {
    const ref =
      branch.isRemote && !branch.isLocal && branch.remoteName
        ? `${branch.remoteName}/${branch.name}`
        : branch.name;
    onCreateWorktree(branch.repoName, ref);
  }, [branch, onCreateWorktree]);

  const handleDeleteClick = useCallback(() => {
    setShowMenu(false);
    onDeleteBranch(branch);
  }, [branch, onDeleteBranch]);

  const handleMenuToggle = useCallback(() => {
    setShowMenu((prev) => !prev);
  }, []);

  const locationLabel =
    branch.isLocal && branch.isRemote
      ? "local + remote"
      : branch.isLocal
        ? "local"
        : "remote";

  const relativeDate = branch.lastCommitDate
    ? formatRelativeDate(branch.lastCommitDate)
    : undefined;

  return (
    <div
      className={clsx(
        "border-b px-4 py-3 hover:bg-muted/50 transition-colors",
        isHighlighted && "bg-blue-50 dark:bg-blue-900/20 animate-pulse",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <GitBranch
            className={clsx(
              "w-4 h-4 flex-shrink-0",
              branch.hasWorktree
                ? "text-green-500"
                : branch.isRemote && !branch.isLocal
                  ? "text-blue-400"
                  : "text-muted-foreground",
            )}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm truncate">{branch.name}</span>

              <span
                className={clsx(
                  "px-1.5 py-0.5 text-xs rounded-full flex-shrink-0",
                  branch.isLocal && branch.isRemote
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                    : branch.isLocal
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                )}
              >
                {branch.isLocal && (
                  <Monitor className="w-3 h-3 inline mr-0.5" />
                )}
                {branch.isRemote && <Globe className="w-3 h-3 inline mr-0.5" />}
                {locationLabel}
              </span>

              {branch.isMergedToMain && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 flex-shrink-0">
                  merged
                </span>
              )}

              {branch.hasWorktree && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex-shrink-0">
                  worktree
                </span>
              )}
            </div>

            {(branch.lastCommitMessage || relativeDate) && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {relativeDate && <span>{relativeDate}</span>}
                {relativeDate && branch.lastCommitMessage && (
                  <span> &middot; </span>
                )}
                {branch.lastCommitMessage && (
                  <span>{branch.lastCommitMessage}</span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
          {branch.hasWorktree ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleJumpToWorktree}
            >
              <FolderOpen className="w-4 h-4 mr-1" />
              Worktree
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleCreateWorktree}>
              <GitBranchPlus className="w-4 h-4 mr-1" />
              Create Worktree
            </Button>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={handleMenuToggle}
              className="p-1 rounded-md hover:bg-muted transition-colors"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-background border rounded-md shadow-lg z-50 min-w-[180px]">
                <button
                  onClick={handleDeleteClick}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete branch</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}
