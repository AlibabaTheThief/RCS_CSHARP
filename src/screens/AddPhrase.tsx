import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addDadPhrase } from '../lib/db'

const AZ_CHARS = ['ə', 'ı', 'ö', 'ü', 'ç', 'ş', 'ğ', 'q', 'x', 'c', 'İ']

export default function AddPhrase() {
  const [az, setAz] = useState('')
  const [en, setEn] = useState('')
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  const insertChar = (ch: string) => setAz((v) => v + ch)

  const save = async () => {
    if (!az.trim() || !en.trim()) return
    await addDadPhrase(az, en, note)
    setAz('')
    setEn('')
    setNote('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  return (
    <div className="screen">
      <h1>Add a phrase</h1>
      <p className="subtitle">
        Anything you want to say to Dad. It goes into your “Phrases for Dad” deck and starts showing
        up in Review.
      </p>

      {saved && <div className="banner">✅ Saved to Phrases for Dad.</div>}

      <label className="field">
        <span>Azerbaijani</span>
        <input
          type="text"
          value={az}
          onChange={(e) => setAz(e.target.value)}
          placeholder="Səni sevirəm, ata"
          autoCapitalize="off"
          spellCheck={false}
        />
      </label>

      <div className="tag-row" style={{ justifyContent: 'flex-start', marginTop: -6, marginBottom: 14 }}>
        {AZ_CHARS.map((ch) => (
          <button key={ch} className="tag az" onClick={() => insertChar(ch)} style={{ fontSize: '1rem', padding: '6px 10px' }}>
            {ch}
          </button>
        ))}
      </div>

      <label className="field">
        <span>English meaning</span>
        <input
          type="text"
          value={en}
          onChange={(e) => setEn(e.target.value)}
          placeholder="I love you, Dad"
        />
      </label>

      <label className="field">
        <span>Note (optional)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="When to use it, a grammar hint…" />
      </label>

      <button className="btn" disabled={!az.trim() || !en.trim()} onClick={save}>
        Save phrase
      </button>

      <p className="muted small" style={{ marginTop: 16 }}>
        Tip: mark a phrase as a goal in{' '}
        <Link to="/dad" style={{ color: 'var(--accent-2)' }}>
          Talk to Dad
        </Link>{' '}
        to drill it to fluency. New phrases have no audio until you regenerate the audio set.
      </p>
    </div>
  )
}
