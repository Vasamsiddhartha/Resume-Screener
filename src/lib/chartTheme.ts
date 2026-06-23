import { useThemeStore } from '@/store/theme.store'

/**
 * Recharts renders raw SVG and cannot read Tailwind's `dark:` classes, so every
 * colour has to be supplied explicitly. The common dark-mode mistake is reusing
 * a light grid colour (e.g. slate-100 `#f1f5f9`) — on a dark surface that turns
 * into harsh bright lines. Well-built dark UIs instead use a grid that is only a
 * hair lighter than the background (a low-opacity white), so it reads as depth
 * rather than as lines. These tokens follow that rule and stay crisp in light.
 */
export function useChartTheme() {
  const isDark = useThemeStore(s => s.resolvedTheme) === 'dark'

  return {
    isDark,
    // Barely-there in dark, soft in light.
    grid: isDark ? 'rgba(148, 163, 184, 0.10)' : '#eef2f7',
    // Axis tick labels — a mid grey that's legible on both surfaces.
    tick: isDark ? '#64748b' : '#94a3b8',
    tooltip: {
      contentStyle: {
        background: isDark ? '#1e293b' : '#ffffff',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        borderRadius: '10px',
        boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.45)' : '0 8px 24px rgba(15,23,42,0.08)',
        color: isDark ? '#e2e8f0' : '#0f172a',
        fontSize: '12px',
      },
      labelStyle: { color: isDark ? '#e2e8f0' : '#0f172a' },
      itemStyle: { color: isDark ? '#cbd5e1' : '#334155' },
    },
  }
}
