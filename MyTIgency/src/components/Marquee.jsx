import { useState } from 'react'

export function Marquee() {
  const [clients] = useState([
    '[CLIENTE A]',
    '[CLIENTE B]',
    '[CLIENTE C]',
    '[CLIENTE D]',
    '[CLIENTE E]',
    '[CLIENTE F]',
  ])

  // Repete o array 4 vezes para fazer o loop infinito do Marquee
  const repeatedClients = Array(4).fill(clients).flat()

  return (
    <div className="marquee">
      <div className="marquee-track" id="marqueeTrack">
        {repeatedClients.map((client, index) => (
          <span key={index}>
            <span>{client}</span> ·{' '}
          </span>
        ))}
      </div>
    </div>
  )
}