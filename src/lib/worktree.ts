import { execCommand, expandPath, pathRelativeToHome, execGitCommandSync } from './git'
import { WorktreeStatus } from '@/types/worktrees'
import * as crypto from 'crypto'

// Helper function to compute SHA-256 hash of a file list
function computeFileHash(files: string[]): string {
  return crypto.createHash('sha256')
    .update(files.sort().join('\n'))
    .digest('hex')
}

export async function getWorktreeStatus(worktreePath: string): Promise<WorktreeStatus> {
  const status: WorktreeStatus = {
    staged: 0,
    modified: 0,
    untracked: 0,
    incoming: 0,
    outgoing: 0
  }

  try {
    // Staged files - use git command directly instead of shell pipe
    try {
      const { stdout: staged } = await execGitCommandSync(['diff', '--cached', '--name-only'], worktreePath)
      const stagedFiles = staged.trim() ? staged.trim().split('\n') : []
      status.staged = stagedFiles.length
      status.stagedHash = computeFileHash(stagedFiles)
    } catch (error) {
      // Silently fail and keep default value
    }

    // Modified files - use git command directly
    try {
      const { stdout: modified } = await execGitCommandSync(['diff', '--name-only'], worktreePath)
      const modifiedFiles = modified.trim() ? modified.trim().split('\n') : []
      status.modified = modifiedFiles.length
      status.modifiedHash = computeFileHash(modifiedFiles)
    } catch (error) {
      // Silently fail and keep default value
    }

    // Untracked files - use git command directly
    try {
      const { stdout: untracked } = await execGitCommandSync(['ls-files', '--others', '--exclude-standard'], worktreePath)
      const untrackedFiles = untracked.trim() ? untracked.trim().split('\n') : []
      status.untracked = untrackedFiles.length
      status.untrackedHash = computeFileHash(untrackedFiles)
      status.untrackedFiles = untrackedFiles
    } catch (error) {
      // Silently fail and keep default value
    }

    // Incoming/outgoing (upstream compare)
    try {
      const { stdout: upstream } = await execGitCommandSync(['rev-list', '--left-right', '--count', '@{u}...HEAD'], worktreePath)
      const [incoming, outgoing] = upstream.trim().split('\t').map(n => parseInt(n) || 0)
      status.incoming = incoming
      status.outgoing = outgoing
    } catch {
      // No upstream configured or command failed, set to 0
      status.incoming = 0
      status.outgoing = 0
    }
  } catch (error) {
    // If we can't get any status, just return defaults
  }

  return status
}

export function parseWorktreeList(output: string): Array<{
  path: string
  branch: string
  commit: string
  bare: boolean
}> {
  const worktrees: Array<{
    path: string
    branch: string
    commit: string
    bare: boolean
  }> = []

  const lines = output.split('\n')
  let current: any = {}

  for (const line of lines) {
    if (line.startsWith('worktree ')) {
      if (current.path) {
        worktrees.push(current)
      }
      current = {
        path: line.slice(9).trim(),
        branch: '',
        commit: '',
        bare: false
      }
    } else if (line.startsWith('HEAD ')) {
      current.commit = line.slice(5).trim()
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice(7).trim()
    } else if (line === 'bare') {
      current.bare = true
    }
  }

  if (current.path) {
    worktrees.push(current)
  }

  return worktrees
}
