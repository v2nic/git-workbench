import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { execCommand, expandPath } from '@/lib/git'
import { CreateFromBranchRequest } from '@/types/worktrees'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { repo, fromBranch, newBranchName, worktreeName }: CreateFromBranchRequest = await request.json()

    if (!repo || !fromBranch || !newBranchName) {
      return NextResponse.json(
        { error: 'repo, fromBranch, and newBranchName are required' },
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
    const finalWorktreeName = worktreeName || newBranchName
    const worktreePath = `${expandPath(config.paths.worktreeRoot)}/${repoName}/${finalWorktreeName}`

    // Create new branch from existing branch
    await execCommand(`git --git-dir "${barePath}" branch "${newBranchName}" "${fromBranch}"`)

    // Create worktree for the new branch
    await execCommand(`git --git-dir "${barePath}" worktree add "${worktreePath}" "${newBranchName}"`)

    // Configure remote fetch setting and upstream tracking for proper branch tracking
    try {
      await execCommand(`git -C "${worktreePath}" config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"`)
      await execCommand(`git -C "${worktreePath}" fetch origin`)
      
      // Set up upstream branch tracking for push functionality
      // If fromBranch is a remote branch, use it as upstream; otherwise use origin/newBranchName
      const upstreamBranch = fromBranch.startsWith('origin/') ? fromBranch : `origin/${newBranchName}`
      await execCommand(`git -C "${worktreePath}" branch --set-upstream-to="${upstreamBranch}" "${newBranchName}"`)
    } catch (remoteConfigError) {
      console.warn('Failed to configure remote tracking:', remoteConfigError)
      // Don't fail the worktree creation, just log the warning
    }

    return NextResponse.json({ 
      message: 'Worktree created from branch successfully',
      path: worktreePath,
      branch: newBranchName
    })
  } catch (error) {
    console.error('Failed to create worktree from branch:', error)
    return NextResponse.json(
      { error: `Failed to create worktree from branch: ${(error as Error).message}` },
      { status: 500 }
    )
  }
}
