import { execCommand } from './git'
import { GitHubRepo, GitHubPullRequest } from '@/types/github'

export async function checkGitHubAuth(): Promise<boolean> {
  try {
    await execCommand('gh auth status')
    return true
  } catch {
    return false
  }
}

export async function searchGitHubRepos(query: string): Promise<GitHubRepo[]> {
  try {
    const { stdout } = await execCommand(
      `gh search repos "${query}" --json id,name,fullName,description,url,sshUrl,httpUrl,isPrivate,defaultBranch,owner --limit 50`
    )
    
    const repos = JSON.parse(stdout)
    return repos.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.fullName,
      description: repo.description,
      url: repo.url,
      sshUrl: repo.sshUrl,
      httpsUrl: repo.httpUrl,
      isPrivate: repo.isPrivate,
      defaultBranch: repo.defaultBranch,
      owner: repo.owner
    }))
  } catch (error) {
    throw new Error(`Failed to search GitHub repos: ${(error as Error).message}`)
  }
}

export async function getPullRequests(repoFullName: string, branch: string): Promise<GitHubPullRequest[]> {
  try {
    const { stdout } = await execCommand(
      `gh pr list --repo "${repoFullName}" --head "${branch}" --json number,url,state,title,head --limit 10`
    )
    
    const prs = JSON.parse(stdout)
    return prs.map((pr: any) => ({
      number: pr.number,
      url: pr.url,
      state: pr.state,
      title: pr.title,
      head: pr.head
    }))
  } catch (error) {
    // If no PRs found or other error, return empty array
    return []
  }
}

export async function getGitHubAuthUrl(): Promise<string> {
  try {
    const { stdout } = await execCommand('gh auth login --web --with-token 2>&1 | head -1')
    // This is a fallback - in practice, we'd direct users to gh auth login
    return 'https://github.com/login/oauth/authorize'
  } catch {
    return 'https://github.com/login/oauth/authorize'
  }
}
