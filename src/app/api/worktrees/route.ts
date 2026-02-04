import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { execCommand, expandPath, pathRelativeToHome } from '@/lib/git'
import { parseWorktreeList, getWorktreeStatus } from '@/lib/worktree'
import { Worktree } from '@/types/worktrees'
import { promises as fs } from 'fs'

export async function GET() {
  try {
    const config = await getConfig()
    const worktrees: Worktree[] = []

    // Get worktrees for each tracked repo
    for (const repoConfig of config.repos) {
      const repoName = repoConfig.repoName || repoConfig.fullName!.split('/')[1]
      const barePath = repoConfig.barePath || `${expandPath(config.paths.bareRoot)}/${repoName}.git`

      // Determine if this is a bare repo or regular repo
      let gitDir = barePath
      let isBare = true

      // First try as bare repo
      try {
        await fs.access(barePath)
        // Bare repo exists, use it
      } catch {
        // Bare repo doesn't exist, try as regular repo
        const regularRepoPath = barePath.replace('.git$', '')
        try {
          await fs.access(regularRepoPath)
          // Regular repo exists, use its .git directory
          gitDir = `${regularRepoPath}/.git`
          isBare = false
        } catch {
          // Neither bare nor regular repo exists, skip
          continue
        }
      }

      try {
        const { stdout } = await execCommand(`git --git-dir "${gitDir}" worktree list --porcelain`)
        const parsedWorktrees = parseWorktreeList(stdout)

        for (const wt of parsedWorktrees) {
          if (wt.bare) continue // Skip the bare repo itself

          const worktree: Worktree = {
            path: wt.path,
            pathRelativeToHome: pathRelativeToHome(wt.path),
            branch: wt.branch.replace('refs/heads/', ''),
            repoName,
            repoFullName: repoConfig.fullName
          }

          // Get status (this could be cached in a real implementation)
          worktree.status = await getWorktreeStatus(wt.path)

          worktrees.push(worktree)
        }
      } catch (error) {
        // Only log errors that aren't "not a git repository" - those are expected for repos that aren't checked out yet
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        if (!errorMessage.includes('not a git repository') && !errorMessage.includes('fatal:')) {
          console.warn(`Failed to get worktrees for ${repoName}:`, error)
        }
        // For missing repos, we'll continue silently - they just won't show worktrees until cloned
      }
    }

    return NextResponse.json(worktrees)
  } catch (error) {
    console.error('Failed to get worktrees:', error)
    return NextResponse.json(
      { error: 'Failed to get worktrees' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { repoName, branchName, worktreeName, startPoint } = await request.json()

    if (!repoName || !branchName || !worktreeName) {
      return NextResponse.json(
        { error: 'Missing required fields: repoName, branchName, worktreeName' },
        { status: 400 }
      )
    }

    const config = await getConfig()
    
    // Find the repository configuration
    const repoConfig = config.repos.find(r => 
      r.repoName === repoName || r.fullName === repoName
    )
    
    if (!repoConfig) {
      return NextResponse.json(
        { error: `Repository '${repoName}' not found in configuration` },
        { status: 404 }
      )
    }

    // Determine the git directory to use
    const gitDir = repoConfig.barePath || `${expandPath(config.paths.bareRoot)}/${repoName}.git`
    
    // Create the worktree path
    const worktreePath = `${expandPath(config.paths.worktreeRoot)}/${worktreeName}`
    
    try {
      // If it's a remote reference, fetch it first
      let startPointToUse = startPoint || branchName
      const isRemoteRef = startPointToUse.includes('/') && !startPointToUse.startsWith('refs/')
      
      console.log(`Creating worktree with startPoint: ${startPointToUse}, isRemoteRef: ${isRemoteRef}`)
      
      if (isRemoteRef) {
        try {
          // Extract remote name and ref name (e.g., "origin/main" -> remote="origin", ref="main")
          const [remoteName, ...refParts] = startPointToUse.split('/')
          const refName = refParts.join('/')
          
          console.log(`Attempting to fetch ${remoteName} ${refName}`)
          await execCommand(`git --git-dir "${gitDir}" fetch "${remoteName}" "${refName}"`)
          console.log(`Successfully fetched ${remoteName} ${refName}`)
          
          // After fetching, check if the reference actually exists
          try {
            await execCommand(`git --git-dir "${gitDir}" rev-parse --verify "${startPointToUse}"`)
            console.log(`Reference ${startPointToUse} exists after fetch`)
          } catch (refError) {
            console.warn(`Reference ${startPointToUse} still doesn't exist after fetch:`, refError)
            
            // List available branches to see what we can use
            try {
              const branchesResult = await execCommand(`git --git-dir "${gitDir}" branch -r`)
              const availableBranches = branchesResult.stdout.trim().split('\n').filter(b => b.trim())
              console.log('Available remote branches:', availableBranches)
              
              if (availableBranches.length === 0 || (availableBranches.length === 1 && availableBranches[0] === '')) {
                console.log('No remote branches found, checking local branches')
                
                // Check for local branches
                try {
                  const localBranchesResult = await execCommand(`git --git-dir "${gitDir}" branch`)
                  const localBranches = localBranchesResult.stdout.trim().split('\n').filter(b => b.trim())
                  console.log('Available local branches:', localBranches)
                  
                  if (localBranches.length > 0) {
                    // Use the first local branch
                    const firstLocalBranch = localBranches[0].trim().replace('* ', '')
                    startPointToUse = firstLocalBranch
                    console.log(`Using first local branch: ${startPointToUse}`)
                  } else {
                    // No branches at all, create an orphan branch
                    console.log('No branches found, creating orphan branch')
                    startPointToUse = '--orphan'
                  }
                } catch (localError) {
                  console.log('Failed to check local branches, creating orphan branch')
                  startPointToUse = '--orphan'
                }
              } else {
                // Try to find a suitable branch (prefer main, then master, then first available)
                const mainBranch = availableBranches.find(b => b.includes('main'))
                const masterBranch = availableBranches.find(b => b.includes('master'))
                
                if (mainBranch) {
                  startPointToUse = mainBranch.trim().replace('* ', '').split('/').pop() || 'main'
                  console.log(`Using main branch: ${startPointToUse}`)
                } else if (masterBranch) {
                  startPointToUse = masterBranch.trim().replace('* ', '').split('/').pop() || 'master'
                  console.log(`Using master branch: ${startPointToUse}`)
                } else {
                  startPointToUse = availableBranches[0].trim().replace('* ', '').split('/').pop() || availableBranches[0].trim()
                  console.log(`Using first available branch: ${startPointToUse}`)
                }
              }
            } catch (listError) {
              console.warn('Failed to list branches:', listError)
              startPointToUse = '--orphan'
            }
          }
        } catch (fetchError) {
          console.warn(`Failed to fetch remote reference ${startPointToUse}:`, fetchError)
          // Fall back to default branch (usually 'main' or 'master')
          try {
            const defaultBranchResult = await execCommand(`git --git-dir "${gitDir}" symbolic-ref refs/remotes/origin/HEAD | sed 's@^.*/@@'`)
            startPointToUse = defaultBranchResult.stdout.trim()
            console.log(`Falling back to default branch: ${startPointToUse}`)
          } catch (defaultBranchError) {
            // If we can't get the default branch, try 'main' then 'master'
            try {
              await execCommand(`git --git-dir "${gitDir}" rev-parse --verify main`)
              startPointToUse = 'main'
            } catch {
              startPointToUse = 'master'
            }
            console.log(`Falling back to local branch: ${startPointToUse}`)
          }
        }
      }
      
      console.log(`Final startPoint to use: ${startPointToUse}`)
      
      // Check if the target branch already exists
      try {
        await execCommand(`git --git-dir "${gitDir}" rev-parse --verify "${branchName}"`)
        console.log(`Branch ${branchName} already exists, checking it out directly`)
        // Branch exists, create worktree from existing branch
        await execCommand(`git --git-dir "${gitDir}" worktree add "${worktreePath}" "${branchName}"`)
      } catch (branchCheckError) {
        console.log(`Branch ${branchName} doesn't exist, creating new branch from ${startPointToUse}`)
        
        // Create worktree from starting point (branch, tag, or commit)
        if (startPointToUse === '--orphan') {
          // Create an orphan worktree (no parent branch)
          await execCommand(`git --git-dir "${gitDir}" worktree add "${worktreePath}" --orphan`)
          // Initialize the new branch in the worktree
          await execCommand(`git -C "${worktreePath}" checkout -b "${branchName}"`)
        } else {
          // Create worktree from existing reference
          await execCommand(`git --git-dir "${gitDir}" worktree add "${worktreePath}" "${startPointToUse}" -b "${branchName}"`)
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Worktree '${worktreeName}' created successfully from '${startPointToUse}'`,
        worktreePath,
        worktreeName,
        branchName,
        startPoint: startPointToUse,
        repoName
      })
    } catch (gitError) {
      console.error('Git command failed:', gitError)
      return NextResponse.json(
        { error: `Failed to create worktree: ${gitError instanceof Error ? gitError.message : 'Unknown error'}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Worktree creation failed:', error)
    return NextResponse.json(
      { error: 'Failed to create worktree' },
      { status: 500 }
    )
  }
}
