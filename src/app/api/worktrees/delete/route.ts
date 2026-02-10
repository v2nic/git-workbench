import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { execCommand, expandPath } from '@/lib/git'
import { getWorktreeStatus } from '@/lib/worktree'
import { DeleteWorktreeRequest, WorktreeStatus } from '@/types/worktrees'

// Compare expected status with actual status
function compareStatus(expected: WorktreeStatus, actual: WorktreeStatus): {
  isValid: boolean
  mismatches: Array<{
    type: 'staged' | 'modified' | 'untracked'
    expected: number
    actual: number
    hashMismatch?: boolean
    newFiles?: string[]
  }>
} {
  const mismatches: Array<{
    type: 'staged' | 'modified' | 'untracked'
    expected: number
    actual: number
    hashMismatch?: boolean
    newFiles?: string[]
  }> = []

  // Check staged files
  if (expected.staged !== actual.staged) {
    mismatches.push({
      type: 'staged',
      expected: expected.staged,
      actual: actual.staged
    })
  } else if (expected.stagedHash && actual.stagedHash && expected.stagedHash !== actual.stagedHash) {
    mismatches.push({
      type: 'staged',
      expected: expected.staged,
      actual: actual.staged,
      hashMismatch: true
    })
  }

  // Check modified files
  if (expected.modified !== actual.modified) {
    mismatches.push({
      type: 'modified',
      expected: expected.modified,
      actual: actual.modified
    })
  } else if (expected.modifiedHash && actual.modifiedHash && expected.modifiedHash !== actual.modifiedHash) {
    mismatches.push({
      type: 'modified',
      expected: expected.modified,
      actual: actual.modified,
      hashMismatch: true
    })
  }

  // Check untracked files
  if (expected.untracked !== actual.untracked) {
    const newFiles = actual.untrackedFiles && expected.untrackedFiles
      ? actual.untrackedFiles.filter(f => !expected.untrackedFiles!.includes(f))
      : []
    
    mismatches.push({
      type: 'untracked',
      expected: expected.untracked,
      actual: actual.untracked,
      newFiles
    })
  } else if (expected.untrackedHash && actual.untrackedHash && expected.untrackedHash !== actual.untrackedHash) {
    mismatches.push({
      type: 'untracked',
      expected: expected.untracked,
      actual: actual.untracked,
      hashMismatch: true
    })
  }

  return {
    isValid: mismatches.length === 0,
    mismatches
  }
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { repo, worktreePath, force, expectedStatus }: DeleteWorktreeRequest = await request.json()

    if (!repo || !worktreePath) {
      return NextResponse.json(
        { error: 'repo and worktreePath are required' },
        { status: 400 }
      )
    }

    const config = await getConfig()
    
    // Find the repo in config
    const repoConfig = config.repos.find(r => 
      r.fullName === repo || r.repoName === repo
    )

    if (!repoConfig) {
      return NextResponse.json(
        { error: 'Repository not found in configuration' },
        { status: 404 }
      )
    }

    const repoName = repoConfig.repoName || repoConfig.fullName!.split('/')[1]
    const barePath = repoConfig.barePath || `${expandPath(config.paths.bareRoot)}/${repoName}.git`

    // Get worktree status to check if it's clean
    const status = await getWorktreeStatus(worktreePath)
    const isClean = status.staged === 0 && status.modified === 0 && status.untracked === 0 && status.outgoing === 0

    // Validate expected status if provided
    if (expectedStatus && !force) {
      const validation = compareStatus(expectedStatus, status)
      if (!validation.isValid) {
        return NextResponse.json({
          error: 'Worktree state has changed since you viewed it',
          expectedStatus,
          actualStatus: status,
          mismatches: validation.mismatches,
          requiresConfirmation: true
        }, { status: 409 })
      }
    }

    if (!isClean && !force) {
      return NextResponse.json({
        error: 'Worktree is not clean',
        status,
        requiresConfirmation: true
      }, { status: 409 })
    }

    // Delete the worktree (use --force flag if worktree is not clean)
    const forceFlag = !isClean ? '--force' : ''
    await execCommand(`git --git-dir "${barePath}" worktree remove ${forceFlag} "${worktreePath}"`)

    return NextResponse.json({ 
      message: 'Worktree deleted successfully',
      wasClean: isClean
    })
  } catch (error) {
    console.error('Failed to delete worktree:', error)
    return NextResponse.json(
      { error: `Failed to delete worktree: ${(error as Error).message}` },
      { status: 500 }
    )
  }
}
