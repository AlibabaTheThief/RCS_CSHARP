import { useEffect, useState } from 'react'
import { getAllReviews, getAllStates, updateBestStreak } from '../lib/db'
import { computeStreak } from '../lib/streak'
import type { CardState } from '../lib/types'

interface Computed {
  due: number
  learned: number
  introduced: number
  total: number
  streak: number
  bestStreak: number
  bridged: boolean
  reviews7: number
  retention: number | null
  leeches: number
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
      const { current: streak, bridged } = computeStreak(reviews.map((r) => r.at), now)
      const bestStreak = await updateBestStreak(streak)
      setC({
        due,
        learned,
        introduced: introduced.length,
        total: states.length,
        streak,
        bestStreak,
        bridged,
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

      <div style={{ marginBottom: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span className="streak-pill">🔥 {c.streak}-day streak</span>
        {c.bestStreak > 0 && <span className="streak-pill">🏆 best {c.bestStreak}</span>}
      </div>
      {c.bridged && (
        <div className="banner" style={{ marginBottom: 18 }}>
          ❄️ A streak freeze covered a missed day — you're still going!
        </div>
      )}

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
