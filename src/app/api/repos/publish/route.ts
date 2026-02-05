import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { writeFileSync, readFileSync } from 'fs'
import { join } from 'path'

interface PublishRequest {
  repoName: string
  organization: string
  visibility: 'public' | 'private'
  barePath?: string
}

interface PublishResponse {
  sshUrl: string
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const body: PublishRequest = await request.json()
    const { repoName, organization, visibility, barePath } = body

    if (!repoName || !organization) {
      return NextResponse.json(
        { error: 'Repository name and organization are required' },
        { status: 400 }
      )
    }

    const fullRepoName = `${organization}/${repoName}`

    // Check if repository already exists on GitHub
    try {
      const checkResult = execSync(
        `gh repo view ${fullRepoName} --json name,visibility`,
        { encoding: 'utf8', stdio: 'pipe' }
      )
      
      const existingRepo = JSON.parse(checkResult)
      
      // Check if visibility matches (case-insensitive comparison)
      if (existingRepo.visibility.toLowerCase() !== visibility.toLowerCase()) {
        return NextResponse.json(
          { 
            error: `Repository already exists as ${existingRepo.visibility} but you requested ${visibility}` 
          },
          { status: 409 }
        )
      }

      // Repository exists with correct visibility - proceed idempotently
      const sshUrl = `git@github.com:${fullRepoName}.git`
      
      // Update the configuration to include the SSH URL
      await updateRepoConfig(repoName, { sshUrl })

      return NextResponse.json<PublishResponse>({
        sshUrl,
        message: `Repository ${fullRepoName} already exists with correct visibility`
      })
    } catch (checkError: any) {
      // Repository doesn't exist, create it
      if (!checkError.message.includes('not found')) {
        throw checkError
      }

      // Create the repository on GitHub
      const visibilityFlag = visibility === 'private' ? '--private' : '--public'
      execSync(
        `gh repo create ${fullRepoName} ${visibilityFlag} --source ${barePath || '.'} --push`,
        { encoding: 'utf8', stdio: 'pipe' }
      )

      const sshUrl = `git@github.com:${fullRepoName}.git`

      // Update the configuration to include the SSH URL
      await updateRepoConfig(repoName, { sshUrl })

      return NextResponse.json<PublishResponse>({
        sshUrl,
        message: `Successfully published ${fullRepoName} to GitHub`
      })
    }
  } catch (error) {
    console.error('Failed to publish repository:', error)
    
    let errorMessage = 'Failed to publish repository'
    if (error instanceof Error) {
      if (error.message.includes('gh: command not found')) {
        errorMessage = 'GitHub CLI (gh) is not installed or not in PATH'
      } else if (error.message.includes('Authentication failed')) {
        errorMessage = 'GitHub authentication failed. Please run "gh auth login"'
      } else if (error.message.includes('already exists')) {
        errorMessage = 'Repository already exists with different visibility'
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

async function updateRepoConfig(repoName: string, updates: { sshUrl: string }) {
  try {
    const configPath = join(process.cwd(), 'data', 'repos-tracked.json')
    const configContent = readFileSync(configPath, 'utf8')
    const config = JSON.parse(configContent)

    const repoIndex = config.repos.findIndex((repo: any) => repo.repoName === repoName)
    
    if (repoIndex !== -1) {
      // Update existing repository
      config.repos[repoIndex] = {
        ...config.repos[repoIndex],
        ...updates
      }
    } else {
      // Add new repository entry
      config.repos.push({
        repoName,
        fullName: updates.sshUrl.replace('git@github.com:', '').replace('.git', ''),
        ...updates,
        defaultBranch: 'main',
        favorite: false
      })
    }

    writeFileSync(configPath, JSON.stringify(config, null, 2))
  } catch (error) {
    console.error('Failed to update repository configuration:', error)
    throw new Error('Failed to update repository configuration')
  }
}
