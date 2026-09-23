import { useState } from 'react'
import { DecodeText } from './DecodeText'

export function RedText({ children, className = '', block = false }) {
  const [hovered, setHovered] = useState(false)

  return (
    <DecodeText
      value={String(children)}
      active={hovered}
      className={`red-text ${block ? 'red-text--block' : ''} ${hovered ? 'red-text--hovering' : ''} ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    />
  )
}
