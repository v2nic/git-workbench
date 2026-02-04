import { NextRequest, NextResponse } from 'next/server'
import { getPullRequests, checkGitHubAuth } from '@/lib/github'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const repo = searchParams.get('repo')
    const branch = searchParams.get('branch')

    if (!repo || !branch) {
      return NextResponse.json(
        { error: 'Parameters "repo" and "branch" are required' },
        { status: 400 }
      )
    }

    // Check if authenticated
    const isAuthenticated = await checkGitHubAuth()
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'GitHub authentication required' },
        { status: 401 }
      )
    }

    const prs = await getPullRequests(repo, branch)
    return NextResponse.json(prs)
  } catch (error) {
    console.error('Failed to get pull requests:', error)
    return NextResponse.json(
      { error: 'Failed to get pull requests' },
      { status: 500 }
    )
  }
}
