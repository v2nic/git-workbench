import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getConfig } from '@/lib/config'
import { execCommand, expandPath } from '@/lib/git'
import { Repo } from '@/types/repos'

export async function GET() {
  try {
    const config = await getConfig()
    const repos: Repo[] = []

    // Add tracked repos from config
    for (const repoConfig of config.repos) {
      const barePath = repoConfig.barePath || path.join(expandPath(config.paths.bareRoot), `${repoConfig.repoName || repoConfig.fullName!.split('/')[1]}.git`)
      
      // Check if repository exists
      let needsClone = false
      try {
        await fs.access(barePath)
      } catch {
        needsClone = true
      }

      const repo: Repo = {
        repoName: repoConfig.repoName || repoConfig.fullName!.split('/')[1],
        favorite: repoConfig.favorite,
        barePath,
        tracked: true,
        needsClone
      }

      if (repoConfig.fullName) {
        repo.fullName = repoConfig.fullName
      }

      if (repoConfig.httpsUrl || repoConfig.sshUrl) {
        const urls: string[] = []
        if (repoConfig.httpsUrl) {
          urls.push(repoConfig.httpsUrl)
        }
        if (repoConfig.sshUrl) {
          urls.push(repoConfig.sshUrl)
          // Also add the HTTPS version of the SSH URL for cloning
          const httpsFromSsh = repoConfig.sshUrl.replace('git@github.com:', 'https://github.com/')
          if (!repoConfig.httpsUrl && !urls.includes(httpsFromSsh)) {
            urls.push(httpsFromSsh)
          }
        }
        repo.remoteUrls = urls
      }

      repos.push(repo)
    }

    // Discover bare repos in bareRoot
    const bareRootPath = expandPath(config.paths.bareRoot)
    try {
      const entries = await fs.readdir(bareRootPath, { withFileTypes: true })
      
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.endsWith('.git')) {
          const barePath = path.join(bareRootPath, entry.name)
          const repoName = entry.name.slice(0, -4) // Remove .git suffix

          // Check if already tracked
          if (repos.some(r => r.barePath === barePath)) {
            continue
          }

          // Try to get remote URLs
          let remoteUrls: string[] = []
          try {
            const { stdout } = await execCommand('git remote get-url origin', barePath)
            remoteUrls = [stdout.trim()]
          } catch {
            // No remote, that's fine for local repos
          }

          repos.push({
            repoName,
            barePath,
            remoteUrls,
            tracked: false
          })
        }
      }
    } catch (error) {
      console.warn(`Could not scan bare root directory ${bareRootPath}:`, error)
    }

    return NextResponse.json(repos)
  } catch (error) {
    console.error('Failed to get repos:', error)
    return NextResponse.json(
      { error: 'Failed to get repositories' },
      { status: 500 }
    )
  }
}
