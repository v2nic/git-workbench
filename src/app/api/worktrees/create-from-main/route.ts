import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { execCommand, expandPath } from '@/lib/git'
import { CreateFromMainRequest } from '@/types/worktrees'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { repo, newBranchName, worktreeName }: CreateFromMainRequest = await request.json()

    if (!repo || !newBranchName) {
      return NextResponse.json(
        { error: 'repo and newBranchName are required' },
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
    const defaultBranch = repoConfig.defaultBranch || 'main'

    // Fetch latest changes from origin
    try {
      await execCommand(`git --git-dir "${barePath}" fetch origin --prune`)
    } catch (error) {
      console.warn(`Failed to fetch from origin for ${repoName}:`, error)
    }

    // Create local branch from origin/defaultBranch
    await execCommand(`git --git-dir "${barePath}" branch "${newBranchName}" "origin/${defaultBranch}"`)

    // Create worktree for the new branch
    await execCommand(`git --git-dir "${barePath}" worktree add "${worktreePath}" "${newBranchName}"`)

    // Configure remote fetch setting and upstream tracking for proper branch tracking
    try {
      await execCommand(`git -C "${worktreePath}" config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"`)
      await execCommand(`git -C "${worktreePath}" fetch origin`)
      
      // Set up upstream branch tracking for push functionality
      await execCommand(`git -C "${worktreePath}" branch --set-upstream-to="origin/${newBranchName}" "${newBranchName}"`)
    } catch (remoteConfigError) {
      console.warn('Failed to configure remote tracking:', remoteConfigError)
      // Don't fail the worktree creation, just log the warning
    }

    return NextResponse.json({ 
      message: 'Worktree created from main successfully',
      path: worktreePath,
      branch: newBranchName
    })
  } catch (error) {
    console.error('Failed to create worktree from main:', error)
    return NextResponse.json(
      { error: `Failed to create worktree from main: ${(error as Error).message}` },
      { status: 500 }
    )
  }
}
