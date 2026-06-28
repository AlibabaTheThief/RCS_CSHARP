import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getCardsByDeck,
  getDadGoals,
  getSettings,
  toggleDadGoal,
} from '../lib/db'
import { playCard } from '../lib/audio'
import AudioButton from '../components/AudioButton'
import type { SeedCard } from '../lib/types'

type Mode = 'list' | 'drill'

export default function TalkToDad() {
  const [cards, setCards] = useState<SeedCard[]>([])
  const [goals, setGoals] = useState<string[]>([])
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [mode, setMode] = useState<Mode>('list')
  const [drillIdx, setDrillIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const load = async () => {
    const [dadCards, g, settings] = await Promise.all([
      getCardsByDeck('dad'),
      getDadGoals(),
      getSettings(),
    ])
    setCards(dadCards)
    setGoals(g)
    setAudioEnabled(settings.audioEnabled)
  }

  useEffect(() => {
    void load()
  }, [])

  const goalCards = useMemo(() => cards.filter((c) => goals.includes(c.id)), [cards, goals])

  const flip = async (id: string) => {
    setGoals(await toggleDadGoal(id))
  }

  // ---- Drill mode ----
  if (mode === 'drill' && goalCards.length > 0) {
    const card = goalCards[drillIdx % goalCards.length]
    const next = () => {
      setRevealed(false)
      setDrillIdx((i) => i + 1)
    }
    return (
      <div className="screen">
        <div className="row" style={{ marginBottom: 12 }}>
          <h1 style={{ fontSize: '1.2rem' }}>Talk to Dad — drill</h1>
          <button className="tag" onClick={() => setMode('list')}>
            Done
          </button>
        </div>
        <div className="flashcard">
          <span className="prompt-label">Say it to Dad</span>
          <div className="front-text">{card.en}</div>
          {revealed && (
            <>
              <div className="back-az az">{card.az}</div>
              <AudioButton card={card} enabled={audioEnabled} />
            </>
          )}
        </div>
        <div style={{ marginTop: 18 }}>
          {!revealed ? (
            <button
              className="btn"
              onClick={() => {
                setRevealed(true)
                void playCard(card, audioEnabled)
              }}
            >
              Show & hear it
            </button>
          ) : (
            <button className="btn" onClick={next}>
              Next ▶
            </button>
          )}
        </div>
        <p className="muted small" style={{ marginTop: 14, textAlign: 'center' }}>
          Repeat each one out loud until it feels automatic.
        </p>
      </div>
    )
  }

  return (
    <div className="screen">
      <h1>❤️ Talk to Dad</h1>
      <p className="subtitle">
        Flag the phrases you most want to say to Dad, then drill them to fluency.
      </p>

      {goalCards.length > 0 && (
        <button className="btn" style={{ marginBottom: 18 }} onClick={() => { setDrillIdx(0); setRevealed(false); setMode('drill') }}>
          🎯 Drill my {goalCards.length} goal{goalCards.length === 1 ? '' : 's'}
        </button>
      )}

      {cards.length === 0 && (
        <div className="list-card">
          <p className="muted">
            No phrases yet. Add some in{' '}
            <Link to="/add" style={{ color: 'var(--accent-2)' }}>
              Add a phrase
            </Link>
            .
          </p>
        </div>
      )}

      {cards.map((c) => {
        const isGoal = goals.includes(c.id)
        return (
          <div className="list-card" key={c.id}>
            <div className="row">
              <div>
                <div className="back-az az" style={{ fontSize: '1.3rem' }}>
                  {c.az}
                </div>
                <div className="muted small">{c.en}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <AudioButton card={c} enabled={audioEnabled} small />
                <button
                  className="tag"
                  onClick={() => flip(c.id)}
                  style={{ color: isGoal ? 'var(--heart)' : 'var(--muted)', borderColor: isGoal ? 'var(--heart)' : 'var(--line)', fontSize: '1.1rem' }}
                  aria-label={isGoal ? 'Remove goal' : 'Mark as goal'}
                >
                  {isGoal ? '★' : '☆'}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
