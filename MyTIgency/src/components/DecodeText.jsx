import { useEffect, useMemo, useRef, useState } from 'react'
import { useAsciiGlitch } from '../hooks/useAsciiGlitch'

export function DecodeText({
  value,
  as: Tag = 'span',
  className = '',
  animateOnMount = false,
  active: controlledActive,
  ...rest
}) {
  const text = String(value)
  const originalChars = useMemo(() => text.split(''), [text])
  const [displayChars, setDisplayChars] = useState(originalChars)
  const mounted = useRef(false)
  const [autoActive, setAutoActive] = useState(animateOnMount)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    if (controlledActive === undefined) setAutoActive(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  const active = controlledActive !== undefined ? controlledActive : autoActive

  useAsciiGlitch({
    active,
    originalChars,
    onUpdate: setDisplayChars,
  })

  return (
    <Tag className={className} aria-label={text} {...rest}>
      {displayChars.map((char, i) => (
        <span key={i} className="decode-char" aria-hidden="true">
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </Tag>
  )
}
