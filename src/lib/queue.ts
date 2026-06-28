// Builds the daily review queue, capped to the user's time budget so it never
// balloons. Mixes due reviews (priority) with a small number of brand-new
// cards, drawn only from enabled decks and in curriculum (phase) order.

import { cardsForMinutes } from './srs'
import {
  getAllStates,
  getDecks,
  getCard,
  getSettings,
} from './db'
import type { CardState, SeedCard } from './types'

export interface QueueItem {
  card: SeedCard
  state: CardState
  isNew: boolean
}

export interface DailyQueue {
  items: QueueItem[]
  dueCount: number
  newCount: number
  /** Reviews already due but trimmed off because the budget was hit. */
  overflow: number
}

const startOfDay = (now: number): number => {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** How many new cards were first studied today (to honor newPerDay). */
function introducedToday(states: CardState[], now: number): number {
  const dayStart = startOfDay(now)
  return states.filter((s) => s.introducedAt !== undefined && s.introducedAt >= dayStart).length
}

export async function buildQueue(now = Date.now()): Promise<DailyQueue> {
  const [settings, decks, states] = await Promise.all([
    getSettings(),
    getDecks(),
    getAllStates(),
  ])

  const enabled = new Set(decks.filter((d) => d.enabled).map((d) => d.id))
  const phaseOf = new Map(decks.map((d) => [d.id, d.phase]))

  const budget = cardsForMinutes(settings.dailyTargetMinutes)

  // Due, already-introduced cards from enabled decks — highest priority.
  const due = states
    .filter((s) => s.introduced && enabled.has(s.deckId) && s.due <= now)
    .sort((a, b) => a.due - b.due)

  // Brand-new cards (never introduced), in phase order then deck order.
  const fresh = states
    .filter((s) => !s.introduced && enabled.has(s.deckId))
    .sort(
      (a, b) =>
        (phaseOf.get(a.deckId) ?? 99) - (phaseOf.get(b.deckId) ?? 99) ||
        a.id.localeCompare(b.id),
    )

  const newAllowance = Math.max(
    0,
    settings.newPerDay - introducedToday(states, now),
  )

  const dueCount = due.length
  // Reviews get first claim on the budget; new cards fill what remains.
  const dueSlice = due.slice(0, budget)
  const remaining = Math.max(0, budget - dueSlice.length)
  const newSlice = fresh.slice(0, Math.min(newAllowance, remaining))

  const items: QueueItem[] = []
  for (const s of dueSlice) {
    const card = await getCard(s.id)
    if (card) items.push({ card, state: s, isNew: false })
  }
  for (const s of newSlice) {
    const card = await getCard(s.id)
    if (card) items.push({ card, state: s, isNew: true })
  }

  // Interleave new cards among reviews so a session isn't front-loaded with
  // unfamiliar material, but keep the very first few as reviews for warm-up.
  interleave(items)

  return {
    items,
    dueCount,
    newCount: newSlice.length,
    overflow: Math.max(0, dueCount - dueSlice.length),
  }
}

/** Light interleave: spread new cards roughly evenly through the session. */
function interleave(items: QueueItem[]): void {
  const reviews = items.filter((i) => !i.isNew)
  const news = items.filter((i) => i.isNew)
  if (news.length === 0 || reviews.length === 0) return
  items.length = 0
  const gap = Math.max(1, Math.floor(reviews.length / (news.length + 1)))
  let ni = 0
  reviews.forEach((r, idx) => {
    items.push(r)
    if (ni < news.length && (idx + 1) % gap === 0) {
      items.push(news[ni++])
    }
  })
  while (ni < news.length) items.push(news[ni++])
}
