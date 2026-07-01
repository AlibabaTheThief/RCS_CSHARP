// Audio playback for pre-generated, bundled Azerbaijani mp3s.
//
// Audio is generated at build time (see scripts/) and shipped under
// /public/audio/<cardId>.mp3 (and <cardId>.ex.mp3 for example sentences). The
// app degrades gracefully: if a file is missing (e.g. audio not generated yet,
// or user-added phrases), the play button simply does nothing visible rather
// than erroring.

import type { SeedCard } from './types'

const BASE = import.meta.env.BASE_URL || './'

const toUrl = (name: string): string =>
  `${BASE}audio/${name}.mp3`.replace(/\/\//g, '/').replace(':/', '://')

// Azerbaijani → ascii slug, kept byte-for-byte in sync with scripts/_slug.py so
// lesson-audio filenames match between the generator and the app.
const AZ_MAP: Record<string, string> = {
  ə: 'e', Ə: 'e', ı: 'i', ö: 'o', Ö: 'o', ü: 'u', Ü: 'u',
  ç: 'c', Ç: 'c', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g', İ: 'i',
}
export function azSlug(s: string): string {
  return s
    .replace(/[əƏıöÖüÜçÇşŞğĞİ]/g, (c) => AZ_MAP[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28) || 'x'
}

/** Play a standalone lesson audio clip (spoken theory example). */
export async function playLessonAudio(az: string, enabled: boolean): Promise<boolean> {
  if (!enabled || !az) return false
  return playUrl(toUrl(`lsn-${azSlug(az)}`))
}

/** Resolve the audio URL for a card, or null if it has no expected audio. */
export function audioUrlFor(card: SeedCard): string | null {
  if (card.hasAudio === false) return null
  if (!card.az) return null
  return toUrl(card.id)
}

/** Resolve the example-sentence audio URL for a card, or null if none. */
export function exampleAudioUrlFor(card: SeedCard): string | null {
  if (card.hasAudio === false) return null
  if (!card.ex) return null
  return toUrl(`${card.id}.ex`)
}

let current: HTMLAudioElement | null = null
const missing = new Set<string>()

async function playUrl(url: string | null): Promise<boolean> {
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

/**
 * Play a card's audio. Returns true if playback started, false if there was
 * no audio (missing file or disabled). Never throws.
 */
export async function playCard(card: SeedCard, enabled: boolean): Promise<boolean> {
  if (!enabled) return false
  return playUrl(audioUrlFor(card))
}

/** Play a card's example-sentence audio. */
export async function playExample(card: SeedCard, enabled: boolean): Promise<boolean> {
  if (!enabled) return false
  return playUrl(exampleAudioUrlFor(card))
}

/** Whether any audio file for this card is known to be missing. */
export function isAudioMissing(card: SeedCard): boolean {
  const url = audioUrlFor(card)
  return url ? missing.has(url) : true
}
