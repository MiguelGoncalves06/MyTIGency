import { useEffect, useRef } from 'react'

const LABELS = {
  link: '→',
  case: 'OPEN',
  image: 'VIEW',
}

const CURSOR_LAYER_SELECTOR = '.cursor-ring, .cursor-dot, .cursor-label'

function resolveTarget(x, y) {
  return document.elementsFromPoint(x, y).find(
    (el) => !el.closest(CURSOR_LAYER_SELECTOR) && el !== document.documentElement,
  ) ?? null
}

function shouldHideCursor(element) {
  if (!element || element === document.body || element === document.documentElement) {
    return true
  }

  const root = document.getElementById('root')
  if (!root?.contains(element)) return true
  if (element.closest('[data-cursor="hidden"]')) return true

  return false
}

function getCursorKind(element) {
  if (shouldHideCursor(element)) return 'hidden'

  let el = element

  while (el && el !== document.documentElement) {
    const explicit = el.dataset?.cursor
    if (explicit) {
      if (explicit === 'hidden') return 'hidden'
      if (LABELS[explicit] || explicit === 'default') return explicit
    }

    const tag = el.tagName

    if (tag === 'A') return 'link'
    if (tag === 'BUTTON' || el.classList?.contains('btn')) return 'link'
    if (tag === 'IMG' || el.classList?.contains('work-thumb')) return 'image'
    if (el.classList?.contains('work-card')) return 'case'

    el = el.parentElement
  }

  return 'default'
}

export function useContextualCursor(ringRef, dotRef, labelRef) {
  const motionRef = useRef({ mx: -100, my: -100, cx: -100, cy: -100 })
  const kindRef = useRef('hidden')

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!finePointer || reduceMotion) return

    document.documentElement.classList.add('contextual-cursor-active')

    const ring = ringRef.current
    const dot = dotRef.current
    const label = labelRef.current
    if (!ring || !dot || !label) return

    function applyKind(kind) {
      kindRef.current = kind
      const visible = kind !== 'hidden'
      const expanded = kind === 'link' || kind === 'case' || kind === 'image'
      const text = LABELS[kind] ?? ''

      ring.classList.toggle('is-visible', visible)
      ring.classList.toggle('expanded', expanded)
      dot.classList.toggle('is-visible', visible)
      label.classList.toggle('is-visible', visible && text.length > 0)
      label.classList.toggle('is-label', text.length > 1)
      label.textContent = text
    }

    function handleMove(event) {
      motionRef.current.mx = event.clientX
      motionRef.current.my = event.clientY

      const target = resolveTarget(event.clientX, event.clientY)
      const kind = getCursorKind(target)
      if (kind !== kindRef.current) applyKind(kind)
    }

    function handleLeave() {
      applyKind('hidden')
    }

    let rafId = 0
    function animCursor() {
      const { mx, my, cx, cy } = motionRef.current
      motionRef.current.cx += (mx - cx) * 0.14
      motionRef.current.cy += (my - cy) * 0.14

      ring.style.left = `${motionRef.current.cx}px`
      ring.style.top = `${motionRef.current.cy}px`
      dot.style.left = `${mx}px`
      dot.style.top = `${my}px`
      label.style.left = `${mx + 18}px`
      label.style.top = `${my + 18}px`

      rafId = requestAnimationFrame(animCursor)
    }

    window.addEventListener('mousemove', handleMove, { passive: true })
    document.documentElement.addEventListener('mouseleave', handleLeave)
    rafId = requestAnimationFrame(animCursor)

    return () => {
      document.documentElement.classList.remove('contextual-cursor-active')
      window.removeEventListener('mousemove', handleMove)
      document.documentElement.removeEventListener('mouseleave', handleLeave)
      cancelAnimationFrame(rafId)
    }
  }, [ringRef, dotRef, labelRef])
}
