import { useEffect, useState } from 'react'
import {
  getAllStates,
  getCardsByDeck,
  getDecks,
  setDeckEnabled,
  type StoredDeck,
} from '../lib/db'
import type { CardState } from '../lib/types'

interface DeckRow extends StoredDeck {
  total: number
  introduced: number
  learned: number
}

export default function Decks() {
  const [rows, setRows] = useState<DeckRow[]>([])

  const load = async () => {
    const [decks, states] = await Promise.all([getDecks(), getAllStates()])
    const byDeck = new Map<string, CardState[]>()
    for (const s of states) {
      const arr = byDeck.get(s.deckId) ?? []
      arr.push(s)
      byDeck.set(s.deckId, arr)
    }
    const built: DeckRow[] = []
    for (const d of decks) {
      const cards = await getCardsByDeck(d.id)
      const st = byDeck.get(d.id) ?? []
      built.push({
        ...d,
        total: cards.length,
        introduced: st.filter((s) => s.introduced).length,
        learned: st.filter((s) => !s.learning && s.reps > 0).length,
      })
    }
    setRows(built)
  }

  useEffect(() => {
    void load()
  }, [])

  const toggle = async (id: string, enabled: boolean) => {
    await setDeckEnabled(id, enabled)
    await load()
  }

  return (
    <div className="screen">
      <h1>Decks</h1>
      <p className="subtitle">Enable a deck to bring its cards into your daily queue.</p>

      {rows.map((d) => {
        const pct = d.total > 0 ? Math.round((d.learned / d.total) * 100) : 0
        return (
          <div className="list-card" key={d.id}>
            <div className="row">
              <div>
                <strong>{d.name}</strong>
                <div className="muted small">Phase {d.phase}</div>
              </div>
              <Toggle checked={d.enabled} onChange={(v) => toggle(d.id, v)} />
            </div>
            <p className="muted small" style={{ margin: '8px 0 0' }}>
              {d.description}
            </p>
            <div className="progress">
              <span style={{ width: `${pct}%` }} />
            </div>
            <div className="muted small" style={{ marginTop: 6 }}>
              {d.learned} learned · {d.introduced} started · {d.total} total
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
      <span className="thumb" />
    </label>
  )
}
