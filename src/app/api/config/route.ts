import { NextRequest, NextResponse } from 'next/server'
import { getConfig, updateConfig } from '@/lib/config'

export async function GET() {
  try {
    const config = await getConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error('Failed to get config:', error)
    return NextResponse.json(
      { error: 'Failed to get configuration' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const updates = await request.json()
    const config = await updateConfig(updates)
    return NextResponse.json(config)
  } catch (error) {
    console.error('Failed to update config:', error)
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    )
  }
}
