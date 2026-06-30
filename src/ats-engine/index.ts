/**
 * Local ATS engine facade.
 *
 * Wraps the Web-Worker-backed ATSEngine (ported from localATS) behind a small,
 * app-friendly API. The worker + models are created lazily on first use and
 * reused across every later evaluation, so the ~one-time model download/warmup
 * cost is paid once per browser session (weights then cache in IndexedDB).
 *
 * The heavy ML inference runs entirely in-browser — no network call per
 * evaluation, replacing the remote HuggingFace Space scoring endpoint.
 */

import { ATSWorkerClient } from './workers/ats-worker-client'
import type { ATSAnalysisResult } from './types'

export type { ATSAnalysisResult }

let client: ATSWorkerClient | null = null
let initPromise: Promise<ATSWorkerClient> | null = null
const statusListeners = new Set<(message: string) => void>()

/** Subscribe to model-loading / analysis progress messages (e.g. "Loading models…"). */
export function onLocalEngineStatus(cb: (message: string) => void): () => void {
  statusListeners.add(cb)
  return () => statusListeners.delete(cb)
}

function emitStatus(message: string) {
  statusListeners.forEach(cb => {
    try { cb(message) } catch { /* listener errors are non-fatal */ }
  })
}

/** Lazily create + initialize the worker engine exactly once. */
async function getClient(): Promise<ATSWorkerClient> {
  if (client) return client
  if (initPromise) return initPromise

  initPromise = (async () => {
    const c = new ATSWorkerClient()
    c.on('statusUpdate', (msg) => emitStatus(String(msg ?? '')))
    const result = await c.initialize({
      privacy: 'strict',
      enableRecommendations: true,
    })
    if (!result.success) {
      // Reset so a later attempt can retry from scratch.
      initPromise = null
      c.dispose()
      throw new Error('Local ATS engine failed to initialize (models could not be loaded)')
    }
    client = c
    return c
  })()

  return initPromise
}

/**
 * Score a resume against a job description fully in-browser.
 * Returns the engine's rich analysis result; the service layer maps it onto the
 * app's { score, label, similarity } shape.
 */
export async function scoreLocally(resumeText: string, jobDescription: string): Promise<ATSAnalysisResult> {
  const c = await getClient()
  return c.score(resumeText, jobDescription)
}

/** Whether the local engine has finished initializing (models loaded). */
export function isLocalEngineReady(): boolean {
  return client !== null && client.ready
}
