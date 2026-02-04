import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { execCommand, expandPath } from '@/lib/git'
import { promises as fs } from 'fs'
import path from 'path'

export async function POST(request: Request) {
  try {
    const { repoName } = await request.json()

    if (!repoName) {
      return NextResponse.json(
        { error: 'Missing required field: repoName' },
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

    // Check if repository already exists
    const targetPath = repoConfig.barePath || `${expandPath(config.paths.bareRoot)}/${repoName}.git`
    
    try {
      await fs.access(targetPath)
      return NextResponse.json(
        { error: `Repository already exists at ${targetPath}` },
        { status: 409 }
      )
    } catch {
      // Repository doesn't exist, proceed with clone
    }

    // Get the remote URL - prefer HTTPS, fallback to SSH
    let remoteUrl = ''
    if (repoConfig.httpsUrl) {
      remoteUrl = repoConfig.httpsUrl
    } else if (repoConfig.sshUrl) {
      // Try to use HTTPS by converting SSH URL to HTTPS if no HTTPS URL is provided
      remoteUrl = repoConfig.sshUrl.replace('git@github.com:', 'https://github.com/')
    } else {
      return NextResponse.json(
        { error: `No remote URL found for repository '${repoName}'` },
        { status: 400 }
      )
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(targetPath)
    try {
      await fs.mkdir(parentDir, { recursive: true })
    } catch (error) {
      console.error('Failed to create parent directory:', error)
      return NextResponse.json(
        { error: 'Failed to create parent directory for repository' },
        { status: 500 }
      )
    }

    try {
      // Clone as bare repository
      await execCommand(`git clone --bare "${remoteUrl}" "${targetPath}"`)
      
      return NextResponse.json({
        success: true,
        message: `Repository '${repoName}' cloned successfully`,
        repoName,
        targetPath,
        remoteUrl
      })
    } catch (gitError) {
      console.error('Git clone failed:', gitError)
      return NextResponse.json(
        { error: `Failed to clone repository: ${gitError instanceof Error ? gitError.message : 'Unknown error'}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Clone operation failed:', error)
    return NextResponse.json(
      { error: 'Failed to clone repository' },
      { status: 500 }
    )
  }
}
