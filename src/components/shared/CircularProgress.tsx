import { cn } from '@/lib/utils'
import { getScoreRingColor } from '@/lib/utils'
import type { ATSLabel } from '@/types'

interface CircularProgressProps {
  score: number
  label?: ATSLabel
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showScore?: boolean
  animate?: boolean
  className?: string
}

const sizes = {
  xs: { width: 44, stroke: 4, fontSize: 'text-xs', subFontSize: 'text-[8px]' },
  sm: { width: 80, stroke: 6, fontSize: 'text-lg', subFontSize: 'text-[9px]' },
  md: { width: 120, stroke: 8, fontSize: 'text-2xl', subFontSize: 'text-[10px]' },
  lg: { width: 160, stroke: 10, fontSize: 'text-3xl', subFontSize: 'text-xs' },
  xl: { width: 220, stroke: 12, fontSize: 'text-5xl', subFontSize: 'text-sm' },
}

export function CircularProgress({
  score,
  label,
  size = 'md',
  showScore = true,
  className,
}: CircularProgressProps) {
  const { width, stroke, fontSize, subFontSize } = sizes[size]
  const radius = (width - stroke * 2) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(100, score))
  const offset = circumference - (progress / 100) * circumference
  const color = getScoreRingColor(score)
  const cx = width / 2
  const cy = width / 2

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={width}
        height={width}
        viewBox={`0 0 ${width} ${width}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-slate-100 dark:text-slate-800"
        />
        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      {showScore && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold leading-none text-slate-900 dark:text-slate-100', fontSize)}>
            {score.toFixed(0)}
          </span>
          {label && (
            <span className={cn('text-slate-500 dark:text-slate-400 text-center leading-tight mt-1 px-2', subFontSize)}>
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
