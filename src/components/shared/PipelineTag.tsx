import { Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

// A candidate's current custom pipeline stage, shown as a tag everywhere the
// candidate appears (Candidates list, ATS Evaluations, etc.). Colour is inferred
// from the stage name so e.g. a "Rejected" stage reads red consistently.
function toneFor(name: string): string {
  const n = name.toLowerCase()
  if (/reject|declin|drop|disqualif/.test(n)) return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
  if (/hire|offer|select|onboard/.test(n)) return 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
  if (/short|interview|screen|review/.test(n)) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
  if (/hold|wait|later/.test(n)) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
  return 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300'
}

export function PipelineTag({ stage, className }: { stage?: string | null; className?: string }) {
  if (!stage || !stage.trim()) return null
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', toneFor(stage), className)}>
      <Tag className="w-3 h-3" />
      {stage}
    </span>
  )
}
