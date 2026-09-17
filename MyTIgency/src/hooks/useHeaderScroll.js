import { useEffect, useState } from 'react'
import { getIntroScrollDistance } from '../scene/constants'

export function useHeaderScroll(threshold = 10) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > getIntroScrollDistance() + threshold)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  return scrolled
}
