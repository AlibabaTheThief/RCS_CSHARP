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

type Mode = 'list' | 'drill' | 'scene'

export default function TalkToDad() {
  const [cards, setCards] = useState<SeedCard[]>([])
  const [dialogues, setDialogues] = useState<SeedCard[]>([])
  const [goals, setGoals] = useState<string[]>([])
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [mode, setMode] = useState<Mode>('list')
  const [drillIdx, setDrillIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [scene, setScene] = useState<string | null>(null)
  const [sceneIdx, setSceneIdx] = useState(0)

  const load = async () => {
    const [dadCards, dlg, g, settings] = await Promise.all([
      getCardsByDeck('dad'),
      getCardsByDeck('dialogues'),
      getDadGoals(),
      getSettings(),
    ])
    setCards(dadCards)
    setDialogues(dlg.sort((a, b) => a.id.localeCompare(b.id)))
    setGoals(g)
    setAudioEnabled(settings.audioEnabled)
  }

  useEffect(() => {
    void load()
  }, [])

  const goalCards = useMemo(() => cards.filter((c) => goals.includes(c.id)), [cards, goals])

  const scenes = useMemo(() => {
    const map = new Map<string, SeedCard[]>()
    for (const c of dialogues) {
      if (!c.scene) continue
      const arr = map.get(c.scene) ?? []
      arr.push(c)
      map.set(c.scene, arr)
    }
    return map
  }, [dialogues])

  const sceneCards = scene ? scenes.get(scene) ?? [] : []

  const flip = async (id: string) => {
    setGoals(await toggleDadGoal(id))
  }

  const startScene = (name: string) => {
    setScene(name)
    setSceneIdx(0)
    setMode('scene')
    const first = scenes.get(name)?.[0]
    if (first) setTimeout(() => void playCard(first, audioEnabled), 200)
  }

  // ---- Goal drill mode ----
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

  // ---- Conversation (scene) mode ----
  if (mode === 'scene' && sceneCards.length > 0) {
    const turn = sceneCards[sceneIdx]
    const isYou = turn.role === 'you'
    const atEnd = sceneIdx >= sceneCards.length - 1
    const go = (i: number) => {
      setSceneIdx(i)
      const t = sceneCards[i]
      if (t) setTimeout(() => void playCard(t, audioEnabled), 150)
    }
    return (
      <div className="screen">
        <div className="row" style={{ marginBottom: 12 }}>
          <h1 style={{ fontSize: '1.2rem' }}>📞 {scene}</h1>
          <button className="tag" onClick={() => setMode('list')}>
            Done
          </button>
        </div>
        <div className="muted small" style={{ marginBottom: 10 }}>
          Turn {sceneIdx + 1} / {sceneCards.length}
        </div>
        <div className={`flashcard${isYou ? ' you-turn' : ''}`}>
          <span className="prompt-label">{isYou ? '🗣️ Your line — say it!' : '👨 Dad says'}</span>
          <div className="back-az az">{turn.az}</div>
          <div className="back-en">{turn.en}</div>
          <AudioButton card={turn} enabled={audioEnabled} />
        </div>
        <div className="grade-row" style={{ gridTemplateColumns: '1fr 2fr', marginTop: 18 }}>
          <button
            className="btn secondary"
            disabled={sceneIdx === 0}
            onClick={() => go(sceneIdx - 1)}
          >
            ◀ Back
          </button>
          {atEnd ? (
            <button className="btn" onClick={() => setMode('list')}>
              Finish ✓
            </button>
          ) : (
            <button className="btn" onClick={() => go(sceneIdx + 1)}>
              Next ▶
            </button>
          )}
        </div>
        <p className="muted small" style={{ marginTop: 14, textAlign: 'center' }}>
          Play it through, saying your lines out loud — then call Dad and try it for real.
        </p>
      </div>
    )
  }

  return (
    <div className="screen">
      <h1>❤️ Talk to Dad</h1>
      <p className="subtitle">
        Flag the phrases you most want to say, drill them, and rehearse whole conversations.
      </p>

      <Link to="/add" className="btn secondary" style={{ marginBottom: 18 }}>
        ➕ Add a phrase
      </Link>

      {goalCards.length > 0 && (
        <button className="btn" style={{ marginBottom: 18 }} onClick={() => { setDrillIdx(0); setRevealed(false); setMode('drill') }}>
          🎯 Drill my {goalCards.length} goal{goalCards.length === 1 ? '' : 's'}
        </button>
      )}

      {scenes.size > 0 && (
        <>
          <h2>Conversations</h2>
          {[...scenes.entries()].map(([name, turns]) => (
            <div className="list-card" key={name}>
              <div className="row">
                <div>
                  <strong>📞 {name}</strong>
                  <div className="muted small">{turns.length} turns</div>
                </div>
                <button className="btn" style={{ width: 'auto', padding: '10px 16px' }} onClick={() => startScene(name)}>
                  ▶ Run
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      <h2>Your phrases</h2>
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
