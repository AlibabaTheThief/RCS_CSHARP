// Audio playback for pre-generated, bundled Azerbaijani mp3s.
//
// Audio is generated at build time (see scripts/) and shipped under
// /public/audio/<cardId>.mp3. The app degrades gracefully: if a file is
// missing (e.g. audio not generated yet, or user-added phrases), the play
// button simply does nothing visible rather than erroring.

import type { SeedCard } from './types'

const BASE = import.meta.env.BASE_URL || './'

/** Resolve the audio URL for a card, or null if it has no expected audio. */
export function audioUrlFor(card: SeedCard): string | null {
  if (card.hasAudio === false) return null
  if (!card.az) return null
  return `${BASE}audio/${card.id}.mp3`.replace(/\/\//g, '/').replace(':/', '://')
}

let current: HTMLAudioElement | null = null
const missing = new Set<string>()

/**
 * Play a card's audio. Returns true if playback started, false if there was
 * no audio (missing file or disabled). Never throws.
 */
export async function playCard(card: SeedCard, enabled: boolean): Promise<boolean> {
  if (!enabled) return false
  const url = audioUrlFor(card)
  if (!url || missing.has(url)) return false

  try {
    if (current) {
      current.pause()
      current.currentTime = 0
    }
    const audio = new Audio(url)
    current = audio
    await audio.play()
    return true
  } catch {
    // 404 or autoplay rejection — remember misses so we don't retry forever.
    missing.add(url)
    return false
  }
}

/** Whether any audio file for this card is known to be missing. */
export function isAudioMissing(card: SeedCard): boolean {
  const url = audioUrlFor(card)
  return url ? missing.has(url) : true
}
