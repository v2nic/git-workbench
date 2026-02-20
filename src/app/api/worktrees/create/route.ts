import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { execCommand, expandPath } from '@/lib/git'
import { extractRepoInfo } from '@/lib/gitRepoInfo'
import { CreateWorktreeRequest } from '@/types/worktrees'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

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
    let repoConfig = config.repos.find(r => 
      r.fullName === repoFullNameOrName || r.repoName === repoFullNameOrName
    )

    // If not found in config, check for untracked bare repositories
    if (!repoConfig) {
      const bareRootPath = expandPath(config.paths.bareRoot)
      const possibleBarePath = `${bareRootPath}/${repoFullNameOrName}.git`
      
      try {
        await fs.access(possibleBarePath)
        
        // Repository exists on disk but not in config
        // Extract repository information
        const repoInfo = await extractRepoInfo(possibleBarePath, repoFullNameOrName)
        
        // Create a temporary repo config for untracked repositories
        repoConfig = {
          repoName: repoFullNameOrName,
          fullName: repoInfo.fullName,
          httpsUrl: repoInfo.httpsUrl,
          sshUrl: repoInfo.sshUrl,
          defaultBranch: repoInfo.defaultBranch,
          favorite: false,
          barePath: possibleBarePath
        }
        
        console.log(`Found untracked repository: ${repoFullNameOrName}`)
      } catch {
        // Repository doesn't exist on disk
      }
    }

    if (!repoConfig) {
      return NextResponse.json(
        { error: 'Repository not found in configuration or on disk' },
        { status: 404 }
      )
    }

    const repoName = repoConfig.repoName || repoConfig.fullName!.split('/')[1]
    const barePath = repoConfig.barePath || `${expandPath(config.paths.bareRoot)}/${repoName}.git`
    const worktreeRoot = expandPath(config.paths.worktreeRoot)
    const worktreePath = `${worktreeRoot}/${repoName}/${worktreeName}`

    // Determine which git directory to use
    let gitDir = barePath
    let isBare = true
    let wasUntracked = false

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
        // Neither bare nor regular repo exists, try to clone it if we have a remote URL
        if (repoConfig.httpsUrl || repoConfig.sshUrl) {
          try {
            // Ensure parent directory exists
            await fs.mkdir(path.dirname(barePath), { recursive: true })
            
            // Get the remote URL - prefer HTTPS, fallback to SSH
            let remoteUrl = ''
            if (repoConfig.httpsUrl) {
              remoteUrl = repoConfig.httpsUrl
            } else if (repoConfig.sshUrl) {
              // Try to use HTTPS by converting SSH URL to HTTPS if no HTTPS URL is provided
              remoteUrl = repoConfig.sshUrl.replace('git@github.com:', 'https://github.com/')
            } else {
              return NextResponse.json(
                { error: `Repository not found at ${barePath} or ${regularRepoPath} and no remote URL available for cloning` },
                { status: 404 }
              )
            }
            
            // Clone as bare repository
            await execCommand(`git clone --bare "${remoteUrl}" "${barePath}"`)
            
            // Update repo config with the bare path
            repoConfig.barePath = barePath
            
            // Use the newly cloned bare repo
            gitDir = barePath
            isBare = true
          } catch (cloneError) {
            console.error('Failed to clone repository:', cloneError)
            return NextResponse.json(
              { error: `Repository not found at ${barePath} or ${regularRepoPath} and failed to clone: ${cloneError instanceof Error ? cloneError.message : 'Unknown error'}` },
              { status: 500 }
            )
          }
        } else {
          // Neither bare nor regular repo exists and no remote URL to clone from
          return NextResponse.json(
            { error: `Repository not found at ${barePath} or ${regularRepoPath}. Please clone the repository first.` },
            { status: 404 }
          )
        }
      }
    }

    // Check if this was an untracked repository and add it to config
    if (!config.repos.find(r => r.repoName === repoConfig.repoName || r.fullName === repoConfig.fullName)) {
      wasUntracked = true
      try {
        const { updateConfig } = await import('@/lib/config')
        const updatedRepos = [...config.repos, repoConfig]
        await updateConfig({ repos: updatedRepos })
        console.log(`Added untracked repository '${repoConfig.repoName}' to configuration`)
      } catch (configError) {
        console.error('Failed to add repository to configuration:', configError)
        // Don't fail the worktree creation if config update fails
      }
    }

    // Resolve the actual default branch from the repo's HEAD symref
    const resolveDefaultBranch = async (dir: string): Promise<string> => {
      try {
        const headContent = await fs.readFile(`${dir}/HEAD`, 'utf-8')
        const match = headContent.trim().match(/^ref: refs\/heads\/(.+)$/)
        if (match) return match[1]
      } catch { /* ignore */ }
      return 'main'
    }

    // Determine the ref to use, resolving from the repo if not explicitly provided
    let targetRef = ref || repoConfig.defaultBranch || ''
    if (!targetRef) {
      targetRef = await resolveDefaultBranch(gitDir)
    }

    // Verify the target ref actually exists in the repo; fall back to the HEAD branch
    const refExists = async (dir: string, refName: string): Promise<boolean> => {
      try {
        await execCommand(`git --git-dir "${dir}" rev-parse --verify "${refName}"`)
        return true
      } catch {
        return false
      }
    }

    if (!(await refExists(gitDir, targetRef))) {
      const headBranch = await resolveDefaultBranch(gitDir)
      if (headBranch !== targetRef && await refExists(gitDir, headBranch)) {
        console.log(`Target ref "${targetRef}" not found, falling back to HEAD branch "${headBranch}"`)
        targetRef = headBranch
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

    // Configure remote fetch setting and upstream tracking for proper branch tracking
    try {
      await execCommand(`git -C "${worktreePath}" config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"`)
      await execCommand(`git -C "${worktreePath}" fetch origin`)
      
      // Set up upstream branch tracking for push functionality
      // Only set upstream if the branch exists on the remote
      const upstreamExists = await execCommand(`git -C "${worktreePath}" rev-parse --verify "origin/${worktreeName}"`).then(() => true).catch(() => false)
      if (upstreamExists) {
        await execCommand(`git -C "${worktreePath}" branch --set-upstream-to="origin/${worktreeName}" "${worktreeName}"`)
      } else {
        // Branch doesn't exist remotely, configure push to go to origin/worktreeName by default
        await execCommand(`git -C "${worktreePath}" config push.default current`)
        await execCommand(`git -C "${worktreePath}" config branch."${worktreeName}".pushRemote origin`)
        await execCommand(`git -C "${worktreePath}" config branch."${worktreeName}".remote origin`)
        await execCommand(`git -C "${worktreePath}" config branch."${worktreeName}".merge refs/heads/${worktreeName}`)
        
        // If we created from a remote branch, set that as upstream for pull operations
        if (targetRef && targetRef.startsWith('origin/') && targetRef !== `origin/${worktreeName}`) {
          await execCommand(`git -C "${worktreePath}" branch --set-upstream-to="${targetRef}" "${worktreeName}"`)
        }
      }
    } catch (remoteConfigError) {
      console.warn('Failed to configure remote tracking:', remoteConfigError)
      // Don't fail the worktree creation, just log the warning
    }

    return NextResponse.json({ 
      message: 'Worktree created successfully',
      path: worktreePath,
      tracked: !wasUntracked
    })
  } catch (error) {
    console.error('Failed to create worktree:', error)
    return NextResponse.json(
      { error: `Failed to create worktree: ${(error as Error).message}` },
      { status: 500 }
    )
  }
}
