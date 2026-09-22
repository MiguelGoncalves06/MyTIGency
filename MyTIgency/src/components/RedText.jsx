import { useMemo, useState } from 'react'
import { useAsciiGlitch } from '../hooks/useAsciiGlitch'

export function RedText({ children, className = '', block = false }) {
  const text = String(children)
  const originalChars = useMemo(() => text.split(''), [text])
  const [displayChars, setDisplayChars] = useState(originalChars)
  const [hovered, setHovered] = useState(false)

  useAsciiGlitch({
    active: hovered,
    originalChars,
    onUpdate: setDisplayChars,
  })

  return (
    <span
      className={`red-text ${block ? 'red-text--block' : ''} ${hovered ? 'red-text--hovering' : ''} ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
