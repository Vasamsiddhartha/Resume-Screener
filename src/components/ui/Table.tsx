import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'
import { Spinner } from './Spinner'

interface Column<T> {
  key: string
  label: string
  className?: string
  render?: (value: unknown, row: T) => React.ReactNode
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  emptyMessage?: string
  keyExtractor: (row: T) => string
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  isLoading,
  emptyMessage = 'No data found',
  keyExtractor,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-transparent">
            {columns.map(col => (
              <th
                key={col.key}
                className={cn(
                  'py-3 px-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap',
                  col.className
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center">
                <div className="flex justify-center">
                  <Spinner size="md" />
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr
                key={keyExtractor(row)}
                className="border-b border-slate-100 dark:border-transparent/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
              >
                {columns.map(col => (
                  <td key={col.key} className={cn('py-3 px-4 text-slate-700 dark:text-slate-300', col.className)}>
                    {col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

interface PaginationProps {
  page: number
  perPage: number
  total: number
  onPageChange: (page: number) => void
  /** When provided, shows a "Rows per page" selector. */
  onPerPageChange?: (perPage: number) => void
  perPageOptions?: number[]
}

// A small window of page numbers centred on the current page.
function pageWindow(page: number, totalPages: number, span = 5): number[] {
  if (totalPages <= span) return Array.from({ length: totalPages }, (_, i) => i + 1)
  let start = Math.max(1, page - Math.floor(span / 2))
  const end = Math.min(totalPages, start + span - 1)
  start = Math.max(1, end - span + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export function Pagination({ page, perPage, total, onPageChange, onPerPageChange, perPageOptions = [10, 25, 50] }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const start = total === 0 ? 0 : (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-transparent">
      <div className="flex items-center gap-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Showing <span className="font-medium text-slate-700 dark:text-slate-300">{start}–{end}</span> of{' '}
          <span className="font-medium text-slate-700 dark:text-slate-300">{total}</span> results
        </p>
        {onPerPageChange && (
          <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            Rows per page
            <select
              value={perPage}
              onChange={e => onPerPageChange(Number(e.target.value))}
              className="h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs px-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            >
              {perPageOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="h-8 w-8 p-0">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {pageWindow(page, totalPages).map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              'h-8 w-8 text-xs rounded-md font-medium transition-colors',
              p === page
                ? 'bg-violet-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            {p}
          </button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="h-8 w-8 p-0">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
