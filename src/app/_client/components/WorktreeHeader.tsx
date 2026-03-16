import React, { useState, useCallback } from "react";
import { Worktree } from "@/types/worktrees";

interface WorktreeHeaderProps {
  worktree: Worktree;
  worktreeName: string;
}

export const WorktreeHeader: React.FC<WorktreeHeaderProps> = ({
  worktree,
  worktreeName,
}) => {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(() => {
    navigator.clipboard.writeText(worktree.pathRelativeToHome).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [worktree.pathRelativeToHome]);

  return (
    <div className="flex items-center space-x-2">
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          <span
            className="font-medium cursor-pointer hover:underline"
            title={worktree.pathRelativeToHome}
            onClick={handleClick}
          >
            {worktreeName}
          </span>
          {copied && (
            <span className="text-xs text-muted-foreground animate-pulse">
              Copied!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
