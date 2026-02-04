import { NextResponse } from 'next/server'
import { checkGitHubAuth } from '@/lib/github'

export async function GET() {
  try {
    const isAuthenticated = await checkGitHubAuth()
    return NextResponse.json({ authenticated: isAuthenticated })
  } catch (error) {
    console.error('Failed to check GitHub auth status:', error)
    return NextResponse.json(
      { error: 'Failed to check authentication status' },
      { status: 500 }
    )
  }
}
