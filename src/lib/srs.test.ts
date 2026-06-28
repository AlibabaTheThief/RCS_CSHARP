import { describe, it, expect } from 'vitest'
import {
  newCardState,
  schedule,
  review,
  describeInterval,
  cardsForMinutes,
  DAY,
  MINUTE,
  LEARNING_STEPS,
  LEECH_THRESHOLD,
  MIN_EASE,
} from './srs'
import type { CardState } from './types'

const T = 1_000_000_000_000 // a fixed "now"

describe('newCardState', () => {
  it('starts a card in learning with sane defaults', () => {
    const c = newCardState('x', 'deck', T)
    expect(c.learning).toBe(true)
    expect(c.learningStep).toBe(0)
    expect(c.reps).toBe(0)
    expect(c.ease).toBe(2.5)
    expect(c.due).toBe(T)
    expect(c.leech).toBe(false)
    expect(c.introduced).toBe(true)
  })
})

describe('learning phase', () => {
  it('advances through the learning steps on "good"', () => {
    const c = newCardState('x', 'deck', T)
    const s1 = schedule(c, 'good', T)
    expect(s1.learning).toBe(true)
    expect(s1.learningStep).toBe(1)
    expect(s1.due).toBe(T + LEARNING_STEPS[1] * MINUTE)
  })

  it('graduates to a 1-day interval after the last step', () => {
    let c = newCardState('x', 'deck', T)
    c = schedule(c, 'good', T) // -> step 1
    const grad = schedule(c, 'good', T) // -> graduate
    expect(grad.learning).toBe(false)
    expect(grad.reps).toBe(1)
    expect(grad.interval).toBe(1)
    expect(grad.due).toBe(T + DAY)
  })

  it('"again" resets to the first step (~1 min)', () => {
    let c = newCardState('x', 'deck', T)
    c = schedule(c, 'good', T)
    const again = schedule(c, 'again', T)
    expect(again.learning).toBe(true)
    expect(again.learningStep).toBe(0)
    expect(again.due).toBe(T + LEARNING_STEPS[0] * MINUTE)
  })

  it('"easy" graduates immediately with a 4-day interval', () => {
    const c = newCardState('x', 'deck', T)
    const easy = schedule(c, 'easy', T)
    expect(easy.learning).toBe(false)
    expect(easy.interval).toBe(4)
    expect(easy.due).toBe(T + 4 * DAY)
  })
})

describe('review phase', () => {
  const graduated = (over: Partial<CardState> = {}): CardState => ({
    ...newCardState('x', 'deck', T),
    learning: false,
    learningStep: 0,
    reps: 1,
    interval: 4,
    ...over,
  })

  it('grows the interval by the ease factor on mature "good"', () => {
    const c = graduated({ reps: 3, interval: 10, ease: 2.5 })
    const next = schedule(c, 'good', T)
    expect(next.interval).toBe(25) // round(10 * 2.5)
    expect(next.due).toBe(T + 25 * DAY)
    expect(next.reps).toBe(4)
  })

  it('"again" lapses the card back into learning and lowers ease', () => {
    const c = graduated({ ease: 2.5, lapses: 0 })
    const next = schedule(c, 'again', T)
    expect(next.learning).toBe(true)
    expect(next.reps).toBe(0)
    expect(next.lapses).toBe(1)
    expect(next.ease).toBeCloseTo(2.3)
    expect(next.due).toBe(T + LEARNING_STEPS[0] * MINUTE)
  })

  it('never lets ease fall below the floor', () => {
    let c = graduated({ ease: MIN_EASE })
    for (let i = 0; i < 5; i++) c = schedule(c, 'again', T)
    expect(c.ease).toBeGreaterThanOrEqual(MIN_EASE)
  })

  it('flags a leech after repeated lapses', () => {
    const c = graduated({ lapses: LEECH_THRESHOLD - 1 })
    const next = schedule(c, 'again', T)
    expect(next.lapses).toBe(LEECH_THRESHOLD)
    expect(next.leech).toBe(true)
  })
})

describe('review (marks introduction)', () => {
  it('marks a brand-new card as introduced with a timestamp', () => {
    const c = { ...newCardState('x', 'd', T), introduced: false }
    const next = review(c, 'good', T)
    expect(next.introduced).toBe(true)
    expect(next.introducedAt).toBe(T)
  })

  it('does not overwrite introducedAt on later reviews', () => {
    const c = { ...newCardState('x', 'd', T), introduced: true, introducedAt: T - 100000 }
    const next = review(c, 'good', T)
    expect(next.introduced).toBe(true)
    expect(next.introducedAt).toBe(T - 100000)
  })
})

describe('helpers', () => {
  it('sizes the queue to the time budget', () => {
    expect(cardsForMinutes(15)).toBeGreaterThan(0)
    expect(cardsForMinutes(30)).toBeGreaterThan(cardsForMinutes(15))
  })

  it('describes intervals readably', () => {
    expect(describeInterval({ ...newCardState('x', 'd', T) })).toBe('learning')
    expect(describeInterval({ ...newCardState('x', 'd', T), learning: false, interval: 1 })).toBe('1 day')
    expect(describeInterval({ ...newCardState('x', 'd', T), learning: false, interval: 10 })).toBe('10 days')
  })
})
