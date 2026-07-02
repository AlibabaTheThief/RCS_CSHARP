import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { buildQueue } from '../lib/queue'
import { getAllReviews, getAllStates, updateBestStreak } from '../lib/db'
import { computeStreak } from '../lib/streak'

interface Today {
  queued: number
  dueNow: number
  streak: number
  bestStreak: number
  bridged: boolean
  learned: number
  started: number
  total: number
  reviews7: number
  retention: number | null
  leeches: number
  doneToday: number
}

function greeting(): { az: string; en: string } {
  const h = new Date().getHours()
  if (h < 12) return { az: 'Sabahın xeyir!', en: 'Good morning' }
  if (h < 18) return { az: 'Salam!', en: 'Hello' }
  return { az: 'Axşamın xeyir!', en: 'Good evening' }
}

const dayKey = (ms: number): string => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export default function Home() {
  const [t, setT] = useState<Today | null>(null)

  useEffect(() => {
    void (async () => {
      const now = Date.now()
      const [q, states, reviews] = await Promise.all([
        buildQueue(now),
        getAllStates(),
        getAllReviews(),
      ])
      const { current: streak, bridged } = computeStreak(reviews.map((r) => r.at), now)
      const bestStreak = await updateBestStreak(streak)
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000
      const recent = reviews.filter((r) => r.at >= weekAgo)
      const passed = recent.filter((r) => r.grade !== 'again')
      const today = dayKey(now)
      setT({
        queued: q.items.length,
        dueNow: q.dueCount,
        streak,
        bestStreak,
        bridged,
        learned: states.filter((s) => !s.learning && s.reps > 0).length,
        started: states.filter((s) => s.introduced).length,
        total: states.length,
        reviews7: recent.length,
        retention: recent.length > 0 ? Math.round((passed.length / recent.length) * 100) : null,
        leeches: states.filter((s) => s.leech).length,
        doneToday: new Set(reviews.filter((r) => dayKey(r.at) === today).map((r) => r.cardId)).size,
      })
    })()
  }, [])

  const g = greeting()

  return (
    <div className="screen">
      <h1 className="az" style={{ fontSize: '1.7rem' }}>{g.az}</h1>
      <p className="subtitle">{g.en} — here's your Azerbaijani today.</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <span className="streak-pill">🔥 {t ? t.streak : '…'}-day streak</span>
        {t && t.bestStreak > 0 && <span className="streak-pill">🏆 best {t.bestStreak}</span>}
      </div>
      {t?.bridged && (
        <div className="banner" style={{ marginBottom: 16 }}>
          ❄️ A streak freeze covered a missed day — you're still going!
        </div>
      )}

      <div className="hero-card">
        {t === null ? (
          <p className="muted">Checking today's queue…</p>
        ) : t.queued > 0 ? (
          <>
            <div className="hero-num">{t.queued}</div>
            <div className="muted">card{t.queued === 1 ? '' : 's'} in today's session</div>
            <Link to="/review" className="btn" style={{ marginTop: 14 }}>
              ▶ Start review
            </Link>
          </>
        ) : (
          <>
            <div className="hero-num">✓</div>
            <div className="muted">
              {t.doneToday > 0
                ? `All done — ${t.doneToday} card${t.doneToday === 1 ? '' : 's'} today. Sağ ol!`
                : 'Nothing due right now. Come back later!'}
            </div>
            <Link to="/learn" className="btn secondary" style={{ marginTop: 14 }}>
              📖 Read a lesson instead
            </Link>
          </>
        )}
      </div>

      <h2>Keep going</h2>
      <div className="quick-grid">
        <Link to="/learn" className="quick-card">
          <span className="icon" aria-hidden="true">📖</span>
          <strong>Learn</strong>
          <span className="muted small">Phrases &amp; theory</span>
        </Link>
        <Link to="/culture" className="quick-card">
          <span className="icon" aria-hidden="true">📜</span>
          <strong>Culture</strong>
          <span className="muted small">Dad's world</span>
        </Link>
        <Link to="/dad" className="quick-card">
          <span className="icon" aria-hidden="true">❤️</span>
          <strong>Talk to Dad</strong>
          <span className="muted small">Drill your goals</span>
        </Link>
        <Link to="/decks" className="quick-card">
          <span className="icon" aria-hidden="true">📚</span>
          <strong>Decks</strong>
          <span className="muted small">Choose content</span>
        </Link>
      </div>

      {t && (
        <>
          <h2>Progress</h2>
          <div className="stat-grid">
            <div className="stat-box">
              <div className="num">{t.learned}</div>
              <div className="lbl">Cards learned</div>
            </div>
            <div className="stat-box">
              <div className="num">{t.retention === null ? '—' : `${t.retention}%`}</div>
              <div className="lbl">7-day retention</div>
            </div>
            <div className="stat-box">
              <div className="num">{t.reviews7}</div>
              <div className="lbl">Reviews this week</div>
            </div>
            <div className="stat-box">
              <div className="num">{t.started} / {t.total}</div>
              <div className="lbl">Cards started</div>
            </div>
          </div>
          {t.leeches > 0 && (
            <div className="banner" style={{ marginTop: 14 }}>
              🐢 {t.leeches} tricky card{t.leeches === 1 ? '' : 's'} flagged — they'll come up gently.
            </div>
          )}
        </>
      )}
    </div>
  )
}
