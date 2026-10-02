import { useEffect, useState } from 'react'
import { useAppReady } from '../hooks/useAppReady'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { useLanguage } from '../context/LanguageContext'

const FADE_MS = 400

export function LoadingScreen() {
  const isReady = useAppReady()
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(true)
  const [fading, setFading] = useState(false)

  useBodyScrollLock(mounted)

  useEffect(() => {
    if (!isReady) return undefined
    setFading(true)
    const timer = setTimeout(() => setMounted(false), FADE_MS)
    return () => clearTimeout(timer)
  }, [isReady])

  if (!mounted) return null

  return (
    <div
      className={`loading-screen${fading ? ' loading-screen--fading' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={t.loading.ariaLabel}
      aria-busy={!isReady}
    >
      <span className="loading-screen-label">
        {t.loading.label}
        <span className="loading-screen-cursor" aria-hidden="true">_</span>
      </span>
    </div>
  )
}
