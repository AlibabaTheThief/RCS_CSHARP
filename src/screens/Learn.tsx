import { useEffect, useMemo, useState } from 'react'
import lessonsData from '../../data/lessons.json'
import type { Lesson, SeedCard } from '../lib/types'
import { getCard, getCardsByDeck, getSettings } from '../lib/db'
import { playCard } from '../lib/audio'
import AudioButton from '../components/AudioButton'

const LESSONS = lessonsData as Lesson[]

export default function Learn() {
  const [active, setActive] = useState<Lesson | null>(null)

  if (active) return <LessonPlayer lesson={active} onExit={() => setActive(null)} />

  return (
    <div className="screen">
      <h1>📖 Learn</h1>
      <p className="subtitle">
        Learn by whole phrases, then see the rules — how to stress words, where the quiet parts go,
        and how Azerbaijani puts sentences together.
      </p>
      {LESSONS.map((l) => (
        <button key={l.id} className="list-card lesson-card" onClick={() => setActive(l)}>
          <div className="row">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: '1.8rem' }} aria-hidden="true">{l.emoji}</span>
              <div style={{ textAlign: 'left' }}>
                <strong>{l.title}</strong>
                <div className="muted small">{l.intro.slice(0, 70)}…</div>
              </div>
            </div>
            <span className="muted" aria-hidden="true">›</span>
          </div>
        </button>
      ))}
    </div>
  )
}

type Step =
  | { kind: 'intro' }
  | { kind: 'phrase'; card: SeedCard }
  | { kind: 'theory'; index: number }

function LessonPlayer({ lesson, onExit }: { lesson: Lesson; onExit: () => void }) {
  const [cards, setCards] = useState<SeedCard[]>([])
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [i, setI] = useState(0)

  useEffect(() => {
    void (async () => {
      const settings = await getSettings()
      setAudioEnabled(settings.audioEnabled)
      let loaded: SeedCard[] = []
      if (lesson.cardIds?.length) {
        const got = await Promise.all(lesson.cardIds.map((id) => getCard(id)))
        loaded = got.filter((c): c is SeedCard => !!c)
      } else if (lesson.deckId) {
        loaded = await getCardsByDeck(lesson.deckId)
      }
      setCards(loaded)
    })()
  }, [lesson])

  const steps: Step[] = useMemo(() => {
    const s: Step[] = [{ kind: 'intro' }]
    cards.forEach((card) => s.push({ kind: 'phrase', card }))
    lesson.theory.forEach((_, index) => s.push({ kind: 'theory', index }))
    return s
  }, [cards, lesson])

  const step = steps[i]
  const atEnd = i >= steps.length - 1

  // Auto-play each phrase as it appears.
  useEffect(() => {
    if (step?.kind === 'phrase') void playCard(step.card, audioEnabled)
  }, [i, step, audioEnabled])

  const next = () => (atEnd ? onExit() : setI((n) => n + 1))
  const back = () => setI((n) => Math.max(0, n - 1))

  return (
    <div className="screen">
      <div className="row" style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: '1.2rem' }}>{lesson.emoji} {lesson.title}</h1>
        <button className="tag" onClick={onExit}>Close</button>
      </div>
      <div className="progress" style={{ marginBottom: 18 }}>
        <span style={{ width: `${Math.round(((i + 1) / steps.length) * 100)}%` }} />
      </div>

      {step?.kind === 'intro' && (
        <div className="lesson-pane">
          <div className="big-emoji" aria-hidden="true">{lesson.emoji}</div>
          <p style={{ fontSize: '1.05rem' }}>{lesson.intro}</p>
        </div>
      )}

      {step?.kind === 'phrase' && (
        <div className="flashcard">
          <span className="prompt-label">Listen &amp; repeat</span>
          <div className="back-az az">{step.card.az}</div>
          {step.card.pron && <div className="pron">{step.card.pron}</div>}
          <div className="back-en">{step.card.en}</div>
          <AudioButton card={step.card} enabled={audioEnabled} />
        </div>
      )}

      {step?.kind === 'theory' && (
        <div className="lesson-pane theory">
          <h2 style={{ marginTop: 0 }}>{lesson.theory[step.index].heading}</h2>
          {lesson.theory[step.index].body.split('\n').map((line, k) => (
            <p key={k} className={line.startsWith('•') ? 'bullet' : ''}>{line}</p>
          ))}
        </div>
      )}

      <div className="grade-row" style={{ gridTemplateColumns: '1fr 2fr', marginTop: 18 }}>
        <button className="btn secondary" disabled={i === 0} onClick={back}>◀ Back</button>
        <button className="btn" onClick={next}>{atEnd ? 'Finish ✓' : 'Next ▶'}</button>
      </div>
    </div>
  )
}
