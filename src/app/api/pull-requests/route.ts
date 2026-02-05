import { NextRequest, NextResponse } from 'next/server'
import { getPullRequestsWorker } from '@/lib/pullRequestsWorker'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const worker = getPullRequestsWorker()
  worker.ensureStarted()

  const snapshot = worker.getSnapshot()
  const rateLimited = snapshot.status.type === 'rate_limited'
  const now = Date.now()
  const isFresh = snapshot.asOf && now - snapshot.asOf < 30_000

  return NextResponse.json({
    pullRequests: snapshot.pullRequests,
    cached: !isFresh,
    rateLimited,
    timestamp: snapshot.asOf
  })
}
