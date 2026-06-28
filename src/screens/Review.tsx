import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Flashcard from '../components/Flashcard'
import GradeButtons from '../components/GradeButtons'
import { buildQueue, type QueueItem } from '../lib/queue'
import { schedule } from '../lib/srs'
import { getSettings, logReview, putState } from '../lib/db'
import { playCard } from '../lib/audio'
import type { Grade } from '../lib/types'

export default function Review() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [done, setDone] = useState(0)
  const [overflow, setOverflow] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const [q, settings] = await Promise.all([buildQueue(), getSettings()])
    setAudioEnabled(settings.audioEnabled)
    setQueue(q.items)
    setOverflow(q.overflow)
    setIndex(0)
    setRevealed(false)
    setDone(0)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const current = queue[index]

  const reveal = useCallback(() => {
    if (!current) return
    setRevealed(true)
    // For production cards, play the answer audio on reveal to train the ear.
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

      setDone((d) => d + 1)
      // If the card lapsed/needs another learning step soon, it may reappear in
      // a freshly built queue; for this session we simply advance.
      if (index + 1 >= queue.length) {
        setIndex(queue.length) // triggers the done state
      } else {
        setIndex((i) => i + 1)
      }
      setRevealed(false)
    },
    [current, index, queue.length],
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
    const nothingToday = queue.length === 0 && done === 0
    return (
      <div className="screen">
        <div className="center-state">
          <div className="big-emoji">{nothingToday ? '☕' : '🎉'}</div>
          <h1>{nothingToday ? 'All caught up' : 'Session complete!'}</h1>
          <p className="muted">
            {nothingToday
              ? 'No cards are due right now. Come back later, or enable more decks.'
              : `You reviewed ${done} card${done === 1 ? '' : 's'} today. Sağ ol! 👏`}
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

  const total = queue.length
  const progressPct = Math.round((index / total) * 100)

  return (
    <div className="screen">
      <div className="row" style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: '1.2rem' }}>Review</h1>
        <span className="muted small">
          {index + 1} / {total}
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
