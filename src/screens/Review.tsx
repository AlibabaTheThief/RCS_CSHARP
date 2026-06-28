import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Flashcard from '../components/Flashcard'
import GradeButtons from '../components/GradeButtons'
import { buildQueue, type QueueItem } from '../lib/queue'
import { schedule, MINUTE } from '../lib/srs'
import { getSettings, logReview, putState } from '../lib/db'
import { playCard } from '../lib/audio'
import type { Grade } from '../lib/types'

// A card answered "Again" (or still in its short learning steps and due within
// this window) is put back into the session a few cards later, rather than
// dropped — so the 1-min/10-min steps actually do their job for a beginner.
const REINSERT_WINDOW = 11 * MINUTE
const REINSERT_GAP = 3
const MAX_REINSERTS = 6

export default function Review() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [total, setTotal] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [overflow, setOverflow] = useState(0)
  // How many times each card has been re-shown this session (leech guard).
  const reinserts = useRef<Map<string, number>>(new Map())

  const load = useCallback(async () => {
    setLoading(true)
    const [q, settings] = await Promise.all([buildQueue(), getSettings()])
    setAudioEnabled(settings.audioEnabled)
    setQueue(q.items)
    setTotal(q.items.length)
    setOverflow(q.overflow)
    setCompleted(0)
    setRevealed(false)
    reinserts.current = new Map()
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const current = queue[0]

  const reveal = useCallback(() => {
    if (!current) return
    setRevealed(true)
    if (current.card.type !== 'listening') {
      void playCard(current.card, audioEnabled)
    }
  }, [current, audioEnabled])

  const grade = useCallback(
    async (g: Grade) => {
      if (!current) return
      const now = Date.now()
      const nextState = schedule(current.state, g, now)
      await putState(nextState)
      await logReview({ cardId: current.card.id, grade: g, at: now, intervalAfter: nextState.interval })

      const id = current.card.id
      const seen = reinserts.current.get(id) ?? 0
      const reinsert =
        nextState.learning && nextState.due <= now + REINSERT_WINDOW && seen < MAX_REINSERTS

      setQueue((prev) => {
        const next = prev.slice(1) // drop the current card from the front
        if (reinsert) {
          reinserts.current.set(id, seen + 1)
          const at = Math.min(REINSERT_GAP, next.length)
          next.splice(at, 0, { ...current, state: nextState, isNew: false })
        }
        return next
      })

      if (!reinsert) setCompleted((c) => c + 1)
      setRevealed(false)
    },
    [current],
  )

  if (loading) {
    return (
      <div className="screen">
        <div className="center-state">
          <div className="big-emoji">⏳</div>
          <p className="muted">Building today's queue…</p>
        </div>
      </div>
    )
  }

  // Finished (or nothing due).
  if (!current) {
    const nothingToday = total === 0
    return (
      <div className="screen">
        <div className="center-state">
          <div className="big-emoji">{nothingToday ? '☕' : '🎉'}</div>
          <h1>{nothingToday ? 'All caught up' : 'Session complete!'}</h1>
          <p className="muted">
            {nothingToday
              ? 'No cards are due right now. Come back later, or enable more decks.'
              : `You finished ${completed} card${completed === 1 ? '' : 's'} today. Sağ ol! 👏`}
          </p>
          {overflow > 0 && (
            <p className="muted small">
              {overflow} more were due but held back to keep today short. They'll roll over.
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <Link to="/decks" className="btn secondary">Decks</Link>
            <button className="btn" onClick={load}>Check again</button>
          </div>
        </div>
      </div>
    )
  }

  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="screen">
      <div className="row" style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: '1.2rem' }}>Review</h1>
        <span className="muted small">
          {completed} / {total}
        </span>
      </div>
      <div className="progress" style={{ marginBottom: 18 }}>
        <span style={{ width: `${progressPct}%` }} />
      </div>

      {current.state.leech && (
        <div className="banner">🐢 This one keeps slipping — take it slow, you've got it.</div>
      )}

      <Flashcard
        card={current.card}
        revealed={revealed}
        isNew={current.isNew}
        audioEnabled={audioEnabled}
      />

      <div style={{ marginTop: 18 }}>
        {!revealed ? (
          <button className="btn" onClick={reveal}>
            Show answer
          </button>
        ) : (
          <GradeButtons state={current.state} onGrade={grade} />
        )}
      </div>
    </div>
  )
}
