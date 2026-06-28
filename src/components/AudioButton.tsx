import { useState } from 'react'
import type { SeedCard } from '../lib/types'
import { audioUrlFor, playCard } from '../lib/audio'

interface Props {
  card: SeedCard
  enabled: boolean
  small?: boolean
  autoLabel?: boolean
}

/**
 * Play button for a card's bundled audio. If audio is disabled or no file is
 * expected, it renders disabled rather than disappearing, so the layout is
 * stable and the user understands audio belongs there.
 */
export default function AudioButton({ card, enabled, small, autoLabel }: Props) {
  const [busy, setBusy] = useState(false)
  const hasAudio = enabled && audioUrlFor(card) !== null

  const handle = async () => {
    if (busy) return
    setBusy(true)
    await playCard(card, enabled)
    setBusy(false)
  }

  return (
    <button
      className={`audio-btn${small ? ' small' : ''}`}
      onClick={handle}
      disabled={!hasAudio}
      aria-label={autoLabel ? 'Play audio' : `Play ${card.az}`}
      title={hasAudio ? 'Play audio' : 'No audio yet'}
    >
      {busy ? '🔈' : '🔊'}
    </button>
  )
}
