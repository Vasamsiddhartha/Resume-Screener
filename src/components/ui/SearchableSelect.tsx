import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  /** Width/spacing classes for the control wrapper. */
  className?: string
  /** Force the search box on/off. Defaults to showing it when there are >6 options. */
  searchable?: boolean
  disabled?: boolean
}

// Rounded, searchable dropdown (combobox) used app-wide instead of native <select>.
// The popup renders in a portal with fixed positioning so it's never clipped by a
// scrollable modal/table, and flips upward when there's not enough room below.
export function SearchableSelect({
  options, value, onChange, placeholder = 'Select…', label, error, className, searchable, disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [coords, setCoords] = useState<{ left: number; top: number; width: number; openUp: boolean } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const showSearch = searchable ?? options.length > 6

  const reposition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const openUp = spaceBelow < 300 && r.top > spaceBelow
    setCoords({ left: r.left, width: r.width, top: openUp ? r.top : r.bottom, openUp })
  }, [])

  useEffect(() => {
    if (!open) { setQuery(''); return }
    reposition()
    if (showSearch) setTimeout(() => inputRef.current?.focus(), 0)

    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !popupRef.current?.contains(t)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open, showSearch, reposition])

  const selected = options.find(o => o.value === value)
  const q = query.trim().toLowerCase()
  const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full h-9 flex items-center gap-2 rounded-lg border bg-white dark:bg-slate-900 px-3 text-sm text-left transition-colors',
          'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
          'focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500',
          error && 'border-red-500 dark:border-red-500',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className={cn('flex-1 truncate', selected ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-slate-400 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && coords && createPortal(
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            left: coords.left,
            width: coords.width,
            ...(coords.openUp ? { top: coords.top, transform: 'translateY(-100%)' } : { top: coords.top }),
          }}
          className={cn(
            'z-[60] min-w-[13rem] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden',
            coords.openUp ? 'mb-1' : 'mt-1'
          )}
        >
          {showSearch && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                />
              </div>
            </div>
          )}
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">No matches</p>
            ) : (
              filtered.map(o => {
                const isSel = o.value === value
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => { onChange(o.value); setOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                      isSel
                        ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 font-medium'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    )}
                  >
                    <span className="flex-1 truncate">{o.label}</span>
                    {isSel && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </div>,
        document.body
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
