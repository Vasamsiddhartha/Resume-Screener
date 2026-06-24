import { cn } from '@/lib/utils'

// Public asset — Vite prefixes the configured base path (e.g. /ATS-Scanner/).
// Wide wordmark (1XL), so it must be sized by HEIGHT with auto width — never
// forced into a square box, or it gets clipped/squished.
const LOGO_SRC = `${import.meta.env.BASE_URL}resume-screener-logo2.png`

interface BrandLogoProps {
  /** Height class for the logo, e.g. "h-7". Width is auto so the full mark shows. */
  imgClassName?: string
  /** Whether to render the "Resume Screener" product name beside the logo. */
  showName?: boolean
  /** Classes for the product-name text. */
  nameClassName?: string
  className?: string
}

export function BrandLogo({
  imgClassName = 'h-7',
  showName = true,
  nameClassName = 'text-slate-900 dark:text-slate-100 font-semibold',
  className,
}: BrandLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img src={LOGO_SRC} alt="Resume Screener" className={cn('w-auto object-contain shrink-0', imgClassName)} />
      {showName && <span className={nameClassName}>Resume Screener</span>}
    </div>
  )
}
