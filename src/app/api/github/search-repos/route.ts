import { NextRequest, NextResponse } from 'next/server'
import { searchGitHubRepos, checkGitHubAuth } from '@/lib/github'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
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

    const repos = await searchGitHubRepos(query)
    return NextResponse.json(repos)
  } catch (error) {
    console.error('Failed to search GitHub repos:', error)
    return NextResponse.json(
      { error: 'Failed to search repositories' },
      { status: 500 }
    )
  }
}
