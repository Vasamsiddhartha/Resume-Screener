import type { Job } from '@/types'

// The model returns exactly three labels.
export const LABEL_FILTER_OPTIONS = [
  { value: 'all', label: 'All Labels' },
  { value: 'Good Fit', label: 'Good Fit' },
  { value: 'Potential Fit', label: 'Potential Fit' },
  { value: 'No Fit', label: 'No Fit' },
]

// Builds the Job Description filter dropdown options from a job list.
export function buildJobFilterOptions(jobs: Job[]) {
  return [
    { value: 'all', label: 'All Jobs' },
    ...jobs.map(j => ({ value: j.id, label: j.title })),
  ]
}
