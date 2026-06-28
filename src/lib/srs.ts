// SM-2 spaced-repetition scheduler (Anki-style) for Azeri for Dad.
//
// New cards pass through a couple of short "learning steps" (minutes) before
// graduating into day-scale intervals. After graduation we use the classic
// SM-2 ease-factor update. The aim is a daily queue that stays small enough to
// finish in ~10-15 minutes, so the learning steps are deliberately short.

import type { CardState, Grade } from './types'

export const MINUTE = 60 * 1000
export const DAY = 24 * 60 * MINUTE

/** Learning steps in minutes, applied before a card graduates to days. */
export const LEARNING_STEPS = [1, 10]

/** Ease factor floor, as in SM-2. */
export const MIN_EASE = 1.3

/** A card is flagged a leech once it lapses this many times. */
export const LEECH_THRESHOLD = 4

/** Build the initial state for a freshly introduced card. */
export function newCardState(id: string, deckId: string, now: number): CardState {
  return {
    id,
    deckId,
    ease: 2.5,
    interval: 0,
    reps: 0,
    lapses: 0,
    learning: true,
    learningStep: 0,
    due: now,
    lastReviewed: null,
    leech: false,
    introduced: true,
  }
}

/** Map an SM-2 grade (0-5) influence from our four buttons. */
function easeDelta(grade: Grade): number {
  switch (grade) {
    case 'again':
      return -0.2
    case 'hard':
      return -0.15
    case 'good':
      return 0
    case 'easy':
      return 0.15
  }
}

/**
 * Apply a review grade to a card and return the updated state.
 * Pure function — does not mutate the input.
 */
export function schedule(card: CardState, grade: Grade, now: number): CardState {
  const next: CardState = { ...card, lastReviewed: now }

  // --- Learning phase: short minute-scale steps before graduation. ---
  if (next.learning) {
    if (grade === 'again') {
      next.learningStep = 0
      next.due = now + LEARNING_STEPS[0] * MINUTE
      return next
    }

    if (grade === 'easy') {
      // Skip remaining steps, graduate immediately with a generous interval.
      return graduate(next, now, 4)
    }

    // hard -> repeat current step; good -> advance.
    const stepIndex = grade === 'hard' ? next.learningStep : next.learningStep + 1
    if (stepIndex >= LEARNING_STEPS.length) {
      return graduate(next, now, 1)
    }
    next.learningStep = stepIndex
    next.due = now + LEARNING_STEPS[stepIndex] * MINUTE
    return next
  }

  // --- Review phase: SM-2 on day-scale intervals. ---
  if (grade === 'again') {
    next.lapses += 1
    next.reps = 0
    next.ease = Math.max(MIN_EASE, next.ease - 0.2)
    next.learning = true
    next.learningStep = 0
    next.due = now + LEARNING_STEPS[0] * MINUTE
    if (next.lapses >= LEECH_THRESHOLD) next.leech = true
    return next
  }

  next.ease = Math.max(MIN_EASE, next.ease + easeDelta(grade))
  next.reps += 1

  let interval: number
  if (next.reps === 1) {
    interval = grade === 'hard' ? 1 : grade === 'easy' ? 4 : 1
  } else if (next.reps === 2) {
    interval = grade === 'hard' ? 3 : grade === 'easy' ? 7 : 4
  } else {
    const factor = grade === 'hard' ? 1.2 : next.ease
    interval = Math.round(next.interval * factor)
    if (grade === 'easy') interval = Math.round(interval * 1.3)
  }

  interval = Math.max(1, interval)
  next.interval = interval
  next.due = now + interval * DAY
  return next
}

/**
 * Apply a review and mark the card as introduced into the rotation on its first
 * study. Use this from the UI instead of `schedule` directly so the new-card
 * throttle and "started" counts stay correct.
 */
export function review(card: CardState, grade: Grade, now: number): CardState {
  const next = schedule(card, grade, now)
  if (!card.introduced) {
    next.introduced = true
    next.introducedAt = now
  }
  return next
}

/** Graduate a learning card into the review phase. */
function graduate(card: CardState, now: number, days: number): CardState {
  return {
    ...card,
    learning: false,
    learningStep: 0,
    reps: 1,
    interval: days,
    due: now + days * DAY,
  }
}

/**
 * Estimated seconds a single card review takes, used to size the daily queue
 * so it fits the user's time budget.
 */
export const SECONDS_PER_CARD = 8

/** How many cards roughly fit into a daily target of `minutes`. */
export function cardsForMinutes(minutes: number): number {
  return Math.round((minutes * 60) / SECONDS_PER_CARD)
}

/** Human-readable "next due" description, for the UI. */
export function describeInterval(card: CardState): string {
  if (card.learning) return 'learning'
  if (card.interval < 1) return 'today'
  if (card.interval === 1) return '1 day'
  if (card.interval < 30) return `${card.interval} days`
  if (card.interval < 365) return `${Math.round(card.interval / 30)} mo`
  return `${(card.interval / 365).toFixed(1)} yr`
}
