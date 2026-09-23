import { useEffect, useRef, useState } from 'react'

export function useActiveSection(ids) {
  const [activeId, setActiveId] = useState(ids[0])
  const activeRef = useRef(activeId)
  const idsKey = ids.join(',')

  useEffect(() => {
    const elements = idsKey.split(',').map((id) => document.getElementById(id)).filter(Boolean)
    if (elements.length === 0) return undefined

    let observer

    function buildObserver() {
      const headerHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
        10
      ) || 0
      const bandTop = headerHeight + 1
      const bandBottom = Math.max(window.innerHeight - bandTop - 2, 0)

      return new IntersectionObserver(
        (entries) => {
          const intersecting = entries.filter((entry) => entry.isIntersecting)
          if (intersecting.length === 0) return

          const topmost = intersecting.reduce((a, b) =>
            a.boundingClientRect.top <= b.boundingClientRect.top ? a : b
          )

          if (topmost.target.id !== activeRef.current) {
            activeRef.current = topmost.target.id
            setActiveId(topmost.target.id)
          }
        },
        { rootMargin: `-${bandTop}px 0px -${bandBottom}px 0px`, threshold: 0 }
      )
    }

    function attach() {
      observer = buildObserver()
      elements.forEach((el) => observer.observe(el))
    }

    function onResize() {
      observer?.disconnect()
      attach()
    }

    attach()
    window.addEventListener('resize', onResize)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [idsKey])

  return activeId
}
