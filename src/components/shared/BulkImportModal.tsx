import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileDown, Sheet, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react'
import { Modal, Button, SearchableSelect, Spinner } from '@/components/ui'
import { cn } from '@/lib/utils'

export interface ImportField {
  key: string
  label: string
  required?: boolean
  aliases?: string[]
  /** Example value used in the downloadable template. */
  example?: string
}

interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  /** e.g. "job descriptions" — used in helper copy. */
  entityLabel: string
  fields: ImportField[]
  templateBaseName: string
  /** Receives the mapped rows; returns how many were imported. Should do ONE bulk query. */
  onImport: (rows: Record<string, string>[]) => Promise<number>
}

type Step = 'upload' | 'map' | 'preview'
const STEPS: { id: Step; label: string }[] = [
  { id: 'upload', label: 'Upload File' },
  { id: 'map', label: 'Map Columns' },
  { id: 'preview', label: 'Preview & Import' },
]

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_-]+/g, '')

export function BulkImportModal({ isOpen, onClose, title, entityLabel, fields, templateBaseName, onImport }: BulkImportModalProps) {
  const [step, setStep] = useState<Step>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function reset() {
    setStep('upload'); setHeaders([]); setRows([]); setMapping({})
    setFileName(''); setError(''); setResult(null); setImporting(false)
  }
  function close() { reset(); onClose() }

  function autoMap(hdrs: string[]): Record<string, string> {
    const m: Record<string, string> = {}
    for (const f of fields) {
      const candidates = [f.label, f.key, ...(f.aliases ?? [])].map(norm)
      const found = hdrs.find(h => candidates.includes(norm(h)))
      if (found) m[f.key] = found
    }
    return m
  }

  async function handleFile(file: File) {
    setError(''); setFileName(file.name)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false })
      if (json.length === 0) { setError('That file has no data rows.'); return }
      const hdrs = Object.keys(json[0])
      const data = json.map(r =>
        Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? '').trim()]))
      ) as Record<string, string>[]
      setHeaders(hdrs); setRows(data); setMapping(autoMap(hdrs)); setStep('map')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file.')
    }
  }

  function downloadTemplate(kind: 'csv' | 'xlsx') {
    const header = fields.map(f => f.label)
    const example = fields.map(f => f.example ?? '')
    if (kind === 'csv') {
      const csv = [header, example]
        .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = `${templateBaseName}.csv`; a.click()
      URL.revokeObjectURL(a.href)
    } else {
      const ws = XLSX.utils.aoa_to_sheet([header, example])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Template')
      XLSX.writeFile(wb, `${templateBaseName}.xlsx`)
    }
  }

  const requiredMissing = fields.filter(f => f.required && !mapping[f.key])

  function buildMappedRows(): Record<string, string>[] {
    return rows
      .map(r => {
        const o: Record<string, string> = {}
        for (const f of fields) o[f.key] = mapping[f.key] ? (r[mapping[f.key]] ?? '') : ''
        return o
      })
      // skip rows where every required field is blank
      .filter(r => fields.some(f => f.required && r[f.key]?.trim()))
  }

  async function doImport() {
    setImporting(true); setError('')
    try {
      const count = await onImport(buildMappedRows())
      setResult(count)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  const headerOptions = [{ value: '', label: '— Not mapped —' }, ...headers.map(h => ({ value: h, label: h }))]
  const previewRows = buildMappedRows().slice(0, 8)
  const totalToImport = buildMappedRows().length

  const stepIndex = STEPS.findIndex(s => s.id === step)

  const footer = result !== null ? (
    <div className="flex justify-end pt-4">
      <Button onClick={close}>Done</Button>
    </div>
  ) : (
    <div className="flex justify-between pt-4">
      <Button variant="ghost" onClick={close}>Cancel</Button>
      <div className="flex gap-2">
        {step !== 'upload' && (
          <Button variant="secondary" leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => setStep(step === 'preview' ? 'map' : 'upload')}>Back</Button>
        )}
        {step === 'map' && (
          <Button rightIcon={<ArrowRight className="w-4 h-4" />} disabled={requiredMissing.length > 0}
            onClick={() => setStep('preview')}>Next</Button>
        )}
        {step === 'preview' && (
          <Button isLoading={importing} disabled={totalToImport === 0} onClick={doImport}>
            Import {totalToImport} {totalToImport === 1 ? 'row' : 'rows'}
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <Modal isOpen={isOpen} onClose={close} title={title} size="xl" footer={footer}>
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <span className={cn(
              'text-xs font-medium px-3 py-1.5 rounded-full',
              i === stepIndex
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
                : i < stepIndex
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
            )}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Success */}
      {result !== null ? (
        <div className="text-center py-10">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Imported {result} {entityLabel}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">They’re available in the list now.</p>
        </div>
      ) : step === 'upload' ? (
        <div className="space-y-4">
          {/* Template download */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Download the template</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Use it to format your data, or upload your own CSV / Excel and map columns next.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="secondary" size="sm" leftIcon={<FileDown className="w-4 h-4" />} onClick={() => downloadTemplate('csv')}>CSV</Button>
              <Button variant="secondary" size="sm" leftIcon={<Sheet className="w-4 h-4" />} onClick={() => downloadTemplate('xlsx')}>Excel</Button>
            </div>
          </div>

          {/* Dropzone */}
          <div
            onClick={() => fileInput.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f) }}
            className={cn(
              'cursor-pointer rounded-xl border-2 border-dashed py-14 flex flex-col items-center justify-center text-center transition-colors',
              dragOver ? 'border-violet-400 bg-violet-50/50 dark:bg-violet-500/10' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
            )}
          >
            <Upload className="w-8 h-8 text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Drag &amp; drop or click to upload</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Supports .csv, .xlsx, .xls — columns auto-detected.</p>
            {fileName && <p className="text-xs text-violet-600 dark:text-violet-400 mt-2">{fileName}</p>}
            <input ref={fileInput} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
        </div>
      ) : step === 'map' ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Match each field to a column from <span className="font-medium text-slate-700 dark:text-slate-300">{fileName}</span>. We auto-matched what we could.
          </p>
          <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1">
            {fields.map(f => (
              <div key={f.key} className="grid grid-cols-2 items-center gap-3">
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
                </div>
                <SearchableSelect
                  options={headerOptions}
                  value={mapping[f.key] ?? ''}
                  onChange={v => setMapping(m => ({ ...m, [f.key]: v }))}
                />
              </div>
            ))}
          </div>
          {requiredMissing.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Map the required field(s): {requiredMissing.map(f => f.label).join(', ')}
            </p>
          )}
        </div>
      ) : (
        // preview
        importing ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <Spinner /><p className="text-sm text-slate-500 dark:text-slate-400">Importing {totalToImport} {entityLabel}…</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              <span className="font-medium text-slate-700 dark:text-slate-300">{totalToImport}</span> {entityLabel} ready to import. Preview of the first {previewRows.length}:
            </p>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr>{fields.map(f => <th key={f.key} className="text-left font-medium text-slate-500 dark:text-slate-400 px-3 py-2 whitespace-nowrap">{f.label}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {previewRows.map((r, i) => (
                    <tr key={i}>
                      {fields.map(f => <td key={f.key} className="px-3 py-2 text-slate-700 dark:text-slate-300 max-w-[180px] truncate">{r[f.key] || <span className="text-slate-300 dark:text-slate-600">—</span>}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </Modal>
  )
}
