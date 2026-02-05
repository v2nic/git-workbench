import { NextRequest } from 'next/server'
import { getPullRequestsWorker } from '@/lib/pullRequestsWorker'

export const runtime = 'nodejs'

function formatSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function GET(request: NextRequest) {
  const worker = getPullRequestsWorker()
  worker.ensureStarted()

  // Ensure persisted cache is loaded before sending first snapshot
  await worker.whenReady()

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const snapshot = worker.getSnapshot()
      controller.enqueue(encoder.encode(formatSseEvent('snapshot', snapshot)))

      const unsubscribe = worker.onEvent(evt => {
        controller.enqueue(encoder.encode(formatSseEvent(evt.type, evt)))
      })

      const abort = () => {
        unsubscribe()
        try {
          controller.close()
        } catch {
          // ignore
        }
      }

      if (request.signal.aborted) {
        abort()
        return
      }

      request.signal.addEventListener('abort', abort, { once: true })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  })
}
