import { useState } from 'react'
import { FileText, Download, Loader2 } from 'lucide-react'

// Shows a candidate's uploaded resume/CV at the bottom of any details popup, with
// a download button. Downloads the stored file (Supabase Storage) when available,
// otherwise falls back to the extracted resume text as a .txt file.
interface ResumeAttachmentProps {
  candidateName?: string
  /** Storage path saved on the candidate (candidate.resumeUrl / resume_path). */
  resumeUrl?: string
  /** Extracted resume text (fallback when there is no stored file). */
  resumeText?: string
}

function deriveFilename(path?: string, fallbackName?: string): string {
  if (path) {
    const base = path.split('/').pop() ?? 'resume'
    return base.replace(/^\d+-/, '') // strip the timestamp prefix we add on upload
  }
  return `${(fallbackName || 'resume').replace(/[^a-zA-Z0-9._-]+/g, '_')}.txt`
}

export function ResumeAttachment({ candidateName, resumeUrl, resumeText }: ResumeAttachmentProps) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const hasFile = !!resumeUrl
  const hasText = !!resumeText?.trim()
  if (!hasFile && !hasText) return null

  const filename = deriveFilename(resumeUrl, candidateName)

  async function handleDownload() {
    setErr('')
    try {
      setBusy(true)
      if (hasFile) {
        const { storageService } = await import('@/services/storage.service')
        const url = await storageService.getSignedUrl(resumeUrl!, 3600, filename)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.target = '_blank'
        a.rel = 'noopener'
        document.body.appendChild(a)
        a.click()
        a.remove()
      } else {
        // No stored file — download the extracted text instead.
        const blob = new Blob([resumeText ?? ''], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not download the attachment')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Attachment</p>
      <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{filename}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{hasFile ? 'Resume / CV' : 'Extracted resume text'}</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={busy}
          title="Download attachment"
          className="shrink-0 p-2 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-50 transition-colors"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        </button>
      </div>
      {err && <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{err}</p>}
    </div>
  )
}
