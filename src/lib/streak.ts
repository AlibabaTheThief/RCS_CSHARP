// Streak calculation with a forgiving one-day "freeze", so a single missed day
// doesn't wipe out weeks of work. Pure functions — easy to test.

/** Local-time day key, e.g. "2026-6-28". */
export function dayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export interface StreakResult {
  /** Current streak length in days (counts only days with activity). */
  current: number
  /** True if the one allowed freeze bridged a missed day within the streak. */
  bridged: boolean
}

/**
 * Compute the current streak from review timestamps, tolerating ONE missed day.
 * Not having studied *today* doesn't break the streak (the day isn't over).
 */
export function computeStreak(reviewTimes: number[], now = Date.now()): StreakResult {
  if (reviewTimes.length === 0) return { current: 0, bridged: false }
  const days = new Set(reviewTimes.map(dayKey))

  let streak = 0
  let freezes = 1
  let freezeUsed = false
  let activeAfterFreeze = 0

  const cursor = new Date(now)
  // Today not-yet-done shouldn't break a live streak — start from yesterday then.
  if (!days.has(dayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  for (;;) {
    const key = dayKey(cursor.getTime())
    if (days.has(key)) {
      streak += 1
      if (freezeUsed) activeAfterFreeze += 1
      cursor.setDate(cursor.getDate() - 1)
    } else if (freezes > 0) {
      freezes -= 1
      freezeUsed = true
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }

  return { current: streak, bridged: freezeUsed && activeAfterFreeze > 0 }
}
