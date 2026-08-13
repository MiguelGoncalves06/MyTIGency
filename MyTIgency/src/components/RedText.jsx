import { useMemo, useRef, useState } from 'react'
import { useAsciiGlitch } from '../hooks/useAsciiGlitch'

export function RedText({ children, className = '', block = false }) {
  const text = String(children)
  const originalChars = useMemo(() => text.split(''), [text])
  const [displayChars, setDisplayChars] = useState(originalChars)
  const cursorRef = useRef({ x: 0.5, y: 0.5 })
  const [hovered, setHovered] = useState(false)

  useAsciiGlitch({
    active: hovered,
    originalChars,
    cursorRef,
    onUpdate: setDisplayChars,
  })

  return (
    <span
      className={`red-text ${block ? 'red-text--block' : ''} ${hovered ? 'red-text--hovering' : ''} ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        cursorRef.current = { x: 0.5, y: 0.5 }
        setDisplayChars(originalChars)
      }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        cursorRef.current = {
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
        }
      }}
      aria-label={text}
    >
      {displayChars.map((char, i) => (
        <span key={i} className="red-text-char" aria-hidden="true">
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  )
}
