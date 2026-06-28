import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Flashcard from '../components/Flashcard'
import GradeButtons from '../components/GradeButtons'
import Choices from '../components/Choices'
import { buildQueue, type QueueItem } from '../lib/queue'
import { review as applyReview, MINUTE } from '../lib/srs'
import { getAllCards, getSettings, logReview, putState } from '../lib/db'
import { playCard } from '../lib/audio'
import { answerText, supportsChoices } from '../lib/choices'
import type { Grade, SeedCard } from '../lib/types'

// A card answered "Again" (or still in its short learning steps and due within
// this window) is put back into the session a few cards later, rather than
// dropped — so the 1-min/10-min steps actually do their job for a beginner.
const REINSERT_WINDOW = 11 * MINUTE
const REINSERT_GAP = 3
const MAX_REINSERTS = 6

export default function Review() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [revealed, setRevealed] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [choiceMode, setChoiceMode] = useState(true)
  const [pool, setPool] = useState<SeedCard[]>([])
  const [total, setTotal] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [overflow, setOverflow] = useState(0)
  // How many times each card has been re-shown this session (leech guard).
  const reinserts = useRef<Map<string, number>>(new Map())
  // Pending auto-advance timer for multiple-choice (cleared on manual adjust).
  const autoAdvance = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const load = useCallback(async () => {
    setLoading(true)
    const [q, settings, allCards] = await Promise.all([buildQueue(), getSettings(), getAllCards()])
    setAudioEnabled(settings.audioEnabled)
    setChoiceMode(settings.choiceMode)
    setPool(allCards)
    setQueue(q.items)
    setTotal(q.items.length)
    setOverflow(q.overflow)
    setCompleted(0)
    setRevealed(false)
    setPicked(null)
    reinserts.current = new Map()
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const current = queue[0]
  const useChoices = !!current && choiceMode && supportsChoices(current.card)

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
      if (autoAdvance.current) clearTimeout(autoAdvance.current)
      const now = Date.now()
      const nextState = applyReview(current.state, g, now)
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
      setPicked(null)
    },
    [current],
  )

  // Multiple choice: picking an answer auto-grades (correct→good, wrong→again)
  // and advances on its own after a short pause. The adjust buttons cancel it.
  const pick = useCallback(
    (option: string) => {
      if (!current) return
      setPicked(option)
      setRevealed(true)
      void playCard(current.card, audioEnabled)
      const correct = option === answerText(current.card)
      if (autoAdvance.current) clearTimeout(autoAdvance.current)
      autoAdvance.current = setTimeout(() => void grade(correct ? 'good' : 'again'), correct ? 1000 : 2200)
    },
    [current, audioEnabled, grade],
  )

  const adjustGrade = useCallback(
    (g: Grade) => {
      if (autoAdvance.current) clearTimeout(autoAdvance.current)
      void grade(g)
    },
    [grade],
  )

  // Clear any pending auto-advance when leaving the screen.
  useEffect(() => () => { if (autoAdvance.current) clearTimeout(autoAdvance.current) }, [])

  // Keyboard: Space/Enter reveals, 1-4 grade (again/hard/good/easy).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (!current) return
      if (!revealed) {
        if ((e.key === ' ' || e.key === 'Enter') && !useChoices) {
          e.preventDefault()
          reveal()
        }
      } else {
        const map: Record<string, Grade> = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' }
        const g = map[e.key]
        if (g) {
          e.preventDefault()
          void grade(g)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, revealed, useChoices, reveal, grade])

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
  const isCorrect = picked !== null && picked === answerText(current.card)

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
        {useChoices ? (
          <>
            {/* Choices stay mounted after a pick so the correct/wrong colours show. */}
            <Choices card={current.card} pool={pool} picked={picked} onPick={pick} />
            {revealed && picked !== null && (
              <div style={{ marginTop: 14 }}>
                <div className={`feedback ${isCorrect ? 'ok' : 'no'}`}>
                  {isCorrect ? '✓ Correct!' : `✗ Answer: ${answerText(current.card)}`}
                </div>
                <div className="adjust-row">
                  <span className="muted small">Adjust:</span>
                  {isCorrect ? (
                    <>
                      <button className="tag" onClick={() => adjustGrade('hard')}>Hard</button>
                      <button className="tag" onClick={() => adjustGrade('easy')}>Easy</button>
                    </>
                  ) : (
                    <button className="tag" onClick={() => adjustGrade('good')}>I knew it</button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : !revealed ? (
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
