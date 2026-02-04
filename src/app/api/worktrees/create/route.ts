import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { execCommand, expandPath } from '@/lib/git'
import { CreateWorktreeRequest } from '@/types/worktrees'

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
    const worktreePath = `${expandPath(config.paths.worktreeRoot)}/${repoName}/${worktreeName}`

    // Determine the ref to use
    const targetRef = ref || repoConfig.defaultBranch || 'main'

    // Create the worktree
    await execCommand(`git --git-dir "${barePath}" worktree add "${worktreePath}" "${targetRef}"`)

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
