import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { execCommand, expandPath } from '@/lib/git'
import { CreateWorktreeRequest } from '@/types/worktrees'
import { promises as fs } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const { repoFullNameOrName, worktreeName, ref }: CreateWorktreeRequest = await request.json()

    if (!repoFullNameOrName || !worktreeName) {
      return NextResponse.json(
        { error: 'repoFullNameOrName and worktreeName are required' },
        { status: 400 }
      )
    }

    const config = await getConfig()
    
    // Find the repo in config
    const repoConfig = config.repos.find(r => 
      r.fullName === repoFullNameOrName || r.repoName === repoFullNameOrName
    )

    if (!repoConfig) {
      return NextResponse.json(
        { error: 'Repository not found in configuration' },
        { status: 404 }
      )
    }

    const repoName = repoConfig.repoName || repoConfig.fullName!.split('/')[1]
    const barePath = repoConfig.barePath || `${expandPath(config.paths.bareRoot)}/${repoName}.git`
    const worktreeRoot = expandPath(config.paths.worktreeRoot)
    const worktreePath = `${worktreeRoot}/${repoName}/${worktreeName}`

    // Determine the ref to use
    const targetRef = ref || repoConfig.defaultBranch || 'main'

    // Determine which git directory to use
    let gitDir = barePath
    let isBare = true

    // First try as bare repo
    try {
      await fs.access(barePath)
      // Bare repo exists, use it
    } catch {
      // Bare repo doesn't exist, try as regular repo
      const regularRepoPath = barePath.replace(/\.git$/, '')
      try {
        await fs.access(regularRepoPath)
        // Regular repo exists, use its .git directory
        gitDir = `${regularRepoPath}/.git`
        isBare = false
      } catch {
        // Neither bare nor regular repo exists
        return NextResponse.json(
          { error: `Repository not found at ${barePath} or ${regularRepoPath}` },
          { status: 404 }
        )
      }
    }

    // Create the worktree directory structure if it doesn't exist
    const repoWorktreeDir = `${worktreeRoot}/${repoName}`
    try {
      await fs.mkdir(repoWorktreeDir, { recursive: true })
    } catch (error) {
      console.warn(`Failed to create worktree directory: ${error}`)
    }

    // Check if the branch already exists
    let branchExists = false
    try {
      await execCommand(`git --git-dir "${gitDir}" rev-parse --verify "refs/heads/${worktreeName}"`)
      branchExists = true
    } catch {
      // Branch doesn't exist
    }

    if (branchExists) {
      // Branch exists, check it out in the new worktree
      await execCommand(`git --git-dir "${gitDir}" worktree add "${worktreePath}" "${worktreeName}"`)
    } else {
      // Branch doesn't exist, create it from the starting point
      await execCommand(`git --git-dir "${gitDir}" worktree add -b "${worktreeName}" "${worktreePath}" "${targetRef}"`)
    }

    return NextResponse.json({ 
      message: 'Worktree created successfully',
      path: worktreePath
    })
  } catch (error) {
    console.error('Failed to create worktree:', error)
    return NextResponse.json(
      { error: `Failed to create worktree: ${(error as Error).message}` },
      { status: 500 }
    )
  }
}
