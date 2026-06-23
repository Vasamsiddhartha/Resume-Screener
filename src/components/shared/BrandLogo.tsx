import { cn } from '@/lib/utils'

// Public asset — Vite prefixes the configured base path (e.g. /ATS-Scanner/).
const LOGO_SRC = `${import.meta.env.BASE_URL}resume-screener-logo.png`

interface BrandLogoProps {
  /** Size classes for the logo image, e.g. "w-8 h-8". */
  imgClassName?: string
  /** Whether to render the "Resume Screener" wordmark. */
  showName?: boolean
  /** Classes for the wordmark text. */
  nameClassName?: string
  className?: string
}

export function BrandLogo({
  imgClassName = 'w-8 h-8',
  showName = true,
  nameClassName = 'text-slate-900 dark:text-slate-100 font-semibold',
  className,
}: BrandLogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img src={LOGO_SRC} alt="Resume Screener" className={cn('rounded-lg object-contain shrink-0', imgClassName)} />
      {showName && <span className={nameClassName}>Resume Screener</span>}
    </div>
  )
}
