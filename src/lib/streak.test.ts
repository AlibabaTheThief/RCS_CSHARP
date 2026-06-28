import { describe, it, expect } from 'vitest'
import { computeStreak, dayKey } from './streak'

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date(2026, 5, 28, 12, 0, 0).getTime() // fixed local noon

const daysAgo = (n: number) => NOW - n * DAY

describe('computeStreak', () => {
  it('is zero with no reviews', () => {
    expect(computeStreak([], NOW)).toEqual({ current: 0, bridged: false })
  })

  it('counts consecutive days including today', () => {
    const r = computeStreak([daysAgo(0), daysAgo(1), daysAgo(2)], NOW)
    expect(r.current).toBe(3)
    expect(r.bridged).toBe(false)
  })

  it('keeps the streak alive when today is not done yet', () => {
    const r = computeStreak([daysAgo(1), daysAgo(2)], NOW)
    expect(r.current).toBe(2)
  })

  it('forgives a single missed day with the freeze', () => {
    // active today, missed yesterday, active the 3 days before that
    const r = computeStreak([daysAgo(0), daysAgo(2), daysAgo(3), daysAgo(4)], NOW)
    expect(r.current).toBe(4)
    expect(r.bridged).toBe(true)
  })

  it('breaks after two consecutive missed days', () => {
    // active today, then a 2-day gap, then older activity
    const r = computeStreak([daysAgo(0), daysAgo(3), daysAgo(4)], NOW)
    expect(r.current).toBe(1)
  })

  it('dayKey is stable within a day and differs across days', () => {
    expect(dayKey(NOW)).toBe(dayKey(NOW + 1000))
    expect(dayKey(NOW)).not.toBe(dayKey(NOW - DAY))
  })
})
