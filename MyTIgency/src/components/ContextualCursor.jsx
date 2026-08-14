import { useRef } from 'react'
import { useContextualCursor } from '../hooks/useContextualCursor'

export function ContextualCursor() {
  const ringRef = useRef(null)
  const dotRef = useRef(null)
  const labelRef = useRef(null)

  useContextualCursor(ringRef, dotRef, labelRef)

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
      <div ref={labelRef} className="cursor-label" aria-hidden="true" />
    </>
  )
}
