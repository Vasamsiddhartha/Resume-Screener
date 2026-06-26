import { useEffect, useState } from 'react'

// Dennis-Snellenberg / Skiper-8 style preloader: a small pulsing dot + a word that
// cycles through brand phrases, then a curved curtain slides up to reveal the app.
const WORDS = ['Welcome', 'Hire smarter', 'Match better', 'Score with confidence', 'Resume Screener']
const STEP = 480       // ms per word
const HOLD = 520       // ms to hold the final word before the curtain lifts
const EXIT = 950       // ms for the curtain slide-up

export function Preloader({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const timers: number[] = []
    for (let i = 1; i < WORDS.length; i++) {
      timers.push(window.setTimeout(() => setIndex(i), i * STEP))
    }
    const startExit = WORDS.length * STEP + HOLD
    timers.push(window.setTimeout(() => setExiting(true), startExit))
    timers.push(window.setTimeout(onDone, startExit + EXIT))
    return () => timers.forEach(clearTimeout)
  }, [onDone])

  return (
    <div className={`preloader${exiting ? ' preloader--exit' : ''}`} aria-hidden="true">
      <div className="preloader__inner">
        <span className="preloader__dot" />
        <span key={index} className="preloader__word">{WORDS[index]}</span>
      </div>
    </div>
  )
}
