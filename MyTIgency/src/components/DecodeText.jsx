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
  // Compara com o texto anterior em vez de uma flag de "montado": o StrictMode
  // roda o efeito duas vezes no mount e a flag fazia o texto decodificar sem
  // ter mudado.
  const prevText = useRef(text)
  const [autoActive, setAutoActive] = useState(animateOnMount)

  useEffect(() => {
    if (prevText.current === text) return
    prevText.current = text
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
