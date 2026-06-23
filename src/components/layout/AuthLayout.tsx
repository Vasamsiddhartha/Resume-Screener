import { Outlet } from 'react-router-dom'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { Zap } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 relative overflow-hidden flex-col justify-between p-12">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/3 rounded-full" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-semibold text-lg">Resume Screener</span>
          </div>
        </div>

        <div className="relative">
          <blockquote className="text-white/90 text-2xl font-light leading-relaxed mb-8">
            "Hire smarter. Match better. Score with confidence."
          </blockquote>
          <div className="space-y-4">
            {[
              { label: 'AI-Powered Matching', desc: 'ML model trained on thousands of successful hires' },
              { label: 'Multi-Tenant Platform', desc: 'Manage multiple organizations from one place' },
              { label: 'Real-Time Scoring', desc: 'Instant ATS scores with detailed labels' },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{item.label}</p>
                  <p className="text-white/60 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-white/40 text-xs">
          © 2026 Resume Screener. All rights reserved.
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center p-6">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">Resume Screener</span>
          </div>
          <div className="lg:ml-auto">
            <ThemeToggle />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
