import { execCommand, expandPath, pathRelativeToHome } from './git'
import { WorktreeStatus } from '@/types/worktrees'

export async function getWorktreeStatus(worktreePath: string): Promise<WorktreeStatus> {
  const status: WorktreeStatus = {
    staged: 0,
    modified: 0,
    untracked: 0,
    incoming: 0,
    outgoing: 0
  }

  try {
    // Staged files
    const { stdout: staged } = await execCommand('git diff --cached --name-only | wc -l', worktreePath)
    status.staged = parseInt(staged.trim()) || 0

    // Modified files
    const { stdout: modified } = await execCommand('git diff --name-only | wc -l', worktreePath)
    status.modified = parseInt(modified.trim()) || 0

    // Untracked files
    const { stdout: untracked } = await execCommand('git ls-files --others --exclude-standard | wc -l', worktreePath)
    status.untracked = parseInt(untracked.trim()) || 0

    // Incoming/outgoing (upstream compare)
    try {
      const { stdout: upstream } = await execCommand('git rev-list --left-right --count @{u}...HEAD', worktreePath)
      const [incoming, outgoing] = upstream.trim().split('\t').map(n => parseInt(n) || 0)
      status.incoming = incoming
      status.outgoing = outgoing
    } catch {
      // No upstream configured, set to 0
      status.incoming = 0
      status.outgoing = 0
    }
  } catch (error) {
    console.warn(`Failed to get status for ${worktreePath}:`, error)
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
