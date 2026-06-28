// Shared data model for Azeri for Dad.

export type CardType =
  | 'sound' // alphabet / letter card (Phase 0)
  | 'vocab' // single word, Azeri <-> English
  | 'phrase' // whole useful sentence / chunk
  | 'listening' // hear Azeri audio -> recall meaning
  | 'dad' // user-added "Phrases for Dad"

/** A deck groups cards, usually by curriculum phase. */
export interface Deck {
  id: string
  name: string
  phase: number
  description: string
  /** Whether the deck is active in the daily queue by default on first launch. */
  enabledByDefault: boolean
}

/** Static card content as shipped in cards.seed.json. */
export interface SeedCard {
  id: string
  deckId: string
  type: CardType
  /** Azerbaijani text (Latin script). For sound cards this is the example word. */
  az: string
  /** English gloss / meaning shown to the user. */
  en: string
  /** Optional tags, e.g. "family", "greeting", "tricky". */
  tags?: string[]
  /** A short usage / grammar note shown on the back of the card. */
  note?: string
  /** Sound cards only: the letter being taught, e.g. "ə". */
  letter?: string
  /** Sound cards only: pronunciation hook (incl. Russian sound cues for Ali). */
  hook?: string
  /** If false, no audio is expected for this card. Defaults to true when `az` exists. */
  hasAudio?: boolean
}

export interface SeedFile {
  decks: Deck[]
  cards: SeedCard[]
}

/** Per-card scheduling + progress state, persisted in IndexedDB. */
export interface CardState {
  id: string
  deckId: string
  /** SM-2 ease factor (>= 1.3). */
  ease: number
  /** Current inter-repetition interval, in days. */
  interval: number
  /** Number of successful repetitions in a row. */
  reps: number
  /** Number of times this card has lapsed (failed after being learned). */
  lapses: number
  /** Whether the card is in the initial learning steps (not yet graduated). */
  learning: boolean
  /** Index into the learning steps array while `learning` is true. */
  learningStep: number
  /** Epoch ms when the card is next due. */
  due: number
  /** Epoch ms of the last review, or null if never reviewed. */
  lastReviewed: number | null
  /** Flagged as a leech (failed repeatedly) — surfaced gently. */
  leech: boolean
  /** True once the card has entered the user's study rotation. */
  introduced: boolean
}

/** The four Anki-style answer grades. */
export type Grade = 'again' | 'hard' | 'good' | 'easy'

export interface ReviewLog {
  id?: number
  cardId: string
  grade: Grade
  /** Epoch ms of the review. */
  at: number
  /** Interval (days) assigned by this review. */
  intervalAfter: number
}

export interface Settings {
  audioEnabled: boolean
  /** Target minutes per day; drives how many new cards/reviews are surfaced. */
  dailyTargetMinutes: number
  /** Max brand-new cards introduced per day. */
  newPerDay: number
  /** Whether the first-launch seed has been loaded. */
  seeded: boolean
}
