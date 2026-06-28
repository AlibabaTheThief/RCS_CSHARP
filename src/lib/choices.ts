// Multiple-choice support: pick plausible distractors and build an options list.
// Pure functions so the logic is unit-testable and deterministic given a seed.

import type { SeedCard } from './types'

/** Which face of a card is the "answer" the user picks. */
export function answerText(card: SeedCard): string {
  // Listening cards are answered by meaning (English); everything else by Azeri.
  return card.type === 'listening' ? card.en : card.az
}

/** Card types that support a multiple-choice presentation. */
export function supportsChoices(card: SeedCard): boolean {
  return card.type === 'vocab' || card.type === 'phrase' || card.type === 'listening' || card.type === 'cloze'
}

// Small deterministic PRNG so a given (card, pool) yields a stable shuffle —
// avoids Math.random (also keeps option order stable across re-renders).
function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export interface ChoiceSet {
  /** The answer strings to show, including the correct one, shuffled. */
  options: string[]
  /** The correct answer string. */
  correct: string
}

/**
 * Build a multiple-choice set for `card` using `pool` as the distractor source.
 * Prefers distractors of the same type, then the same deck, then anything —
 * always returning unique option strings. Returns fewer options only if the
 * pool genuinely can't supply enough.
 */
export function buildChoices(card: SeedCard, pool: SeedCard[], count = 4): ChoiceSet {
  const correct = answerText(card)
  const rnd = mulberry32(hashSeed(card.id))

  const candidate = (c: SeedCard) => answerText(c)
  const isUsable = (c: SeedCard) =>
    c.id !== card.id && candidate(c) && candidate(c) !== correct

  const sameType = pool.filter((c) => isUsable(c) && c.type === card.type)
  const sameDeck = pool.filter((c) => isUsable(c) && c.deckId === card.deckId && c.type !== card.type)
  const rest = pool.filter((c) => isUsable(c))

  const seen = new Set<string>([correct])
  const distractors: string[] = []
  for (const group of [sameType, sameDeck, rest]) {
    for (const c of shuffle(group, rnd)) {
      const t = candidate(c)
      if (!seen.has(t)) {
        seen.add(t)
        distractors.push(t)
      }
      if (distractors.length >= count - 1) break
    }
    if (distractors.length >= count - 1) break
  }

  const options = shuffle([correct, ...distractors], rnd)
  return { options, correct }
}
