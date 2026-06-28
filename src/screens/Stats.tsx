import { useEffect, useState } from 'react'
import { getAllReviews, getAllStates } from '../lib/db'
import type { CardState, ReviewLog } from '../lib/types'

interface Computed {
  due: number
  learned: number
  introduced: number
  total: number
  streak: number
  reviews7: number
  retention: number | null
  leeches: number
}

const dayKey = (ms: number): string => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function computeStreak(reviews: ReviewLog[]): number {
  if (reviews.length === 0) return 0
  const days = new Set(reviews.map((r) => dayKey(r.at)))
  let streak = 0
  const cursor = new Date()
  // If nothing today yet, the streak can still be alive from yesterday.
  if (!days.has(dayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1)
  }
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export default function Stats() {
  const [c, setC] = useState<Computed | null>(null)

  useEffect(() => {
    void (async () => {
      const [states, reviews] = await Promise.all([getAllStates(), getAllReviews()])
      const now = Date.now()
      const introduced = states.filter((s: CardState) => s.introduced)
      const due = introduced.filter((s) => s.due <= now).length
      const learned = states.filter((s) => !s.learning && s.reps > 0).length
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000
      const recent = reviews.filter((r) => r.at >= weekAgo)
      const matured = recent.filter((r) => r.intervalAfter >= 1 || r.grade !== 'again')
      const passed = recent.filter((r) => r.grade !== 'again')
      const retention = recent.length > 0 ? Math.round((passed.length / recent.length) * 100) : null
      void matured
      setC({
        due,
        learned,
        introduced: introduced.length,
        total: states.length,
        streak: computeStreak(reviews),
        reviews7: recent.length,
        retention,
        leeches: states.filter((s) => s.leech).length,
      })
    })()
  }, [])

  if (!c) {
    return (
      <div className="screen">
        <h1>Stats</h1>
        <p className="muted">Loading…</p>
      </div>
    )
  }

  return (
    <div className="screen">
      <h1>Stats</h1>
      <p className="subtitle">Small and steady wins. 10–15 minutes a day adds up fast.</p>

      <div style={{ marginBottom: 18 }}>
        <span className="streak-pill">🔥 {c.streak}-day streak</span>
      </div>

      <div className="stat-grid">
        <div className="stat-box">
          <div className="num">{c.due}</div>
          <div className="lbl">Due now</div>
        </div>
        <div className="stat-box">
          <div className="num">{c.learned}</div>
          <div className="lbl">Cards learned</div>
        </div>
        <div className="stat-box">
          <div className="num">{c.retention === null ? '—' : `${c.retention}%`}</div>
          <div className="lbl">7-day retention</div>
        </div>
        <div className="stat-box">
          <div className="num">{c.reviews7}</div>
          <div className="lbl">Reviews this week</div>
        </div>
        <div className="stat-box">
          <div className="num">{c.introduced}</div>
          <div className="lbl">Cards started</div>
        </div>
        <div className="stat-box">
          <div className="num">{c.total}</div>
          <div className="lbl">Cards total</div>
        </div>
      </div>

      {c.leeches > 0 && (
        <div className="banner" style={{ marginTop: 18 }}>
          🐢 {c.leeches} tricky card{c.leeches === 1 ? '' : 's'} flagged. They'll come up gently in
          Review — no rush.
        </div>
      )}
    </div>
  )
}
