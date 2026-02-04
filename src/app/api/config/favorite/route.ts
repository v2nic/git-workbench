import { NextRequest, NextResponse } from 'next/server'
import { toggleFavorite } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    const { repoNameOrId } = await request.json()

    if (!repoNameOrId) {
      return NextResponse.json(
        { error: 'repoNameOrId is required' },
        { status: 400 }
      )
    }

    const config = await toggleFavorite(repoNameOrId)
    return NextResponse.json(config)
  } catch (error) {
    console.error('Failed to toggle favorite:', error)
    return NextResponse.json(
      { error: 'Failed to toggle favorite' },
      { status: 500 }
    )
  }
}
