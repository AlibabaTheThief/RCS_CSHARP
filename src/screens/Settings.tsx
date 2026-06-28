import { useEffect, useState } from 'react'
import { getSettings, resetAll, saveSettings } from '../lib/db'
import { cardsForMinutes } from '../lib/srs'
import type { Settings } from '../lib/types'

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    void getSettings().then(setSettings)
  }, [])

  const update = async (patch: Partial<Settings>) => {
    if (!settings) return
    const next = { ...settings, ...patch }
    setSettings(next)
    await saveSettings(next)
  }

  const doReset = async () => {
    await resetAll()
    // Reload so the seed re-loads on next launch.
    location.reload()
  }

  if (!settings) {
    return (
      <div className="screen">
        <h1>Settings</h1>
        <p className="muted">Loading…</p>
      </div>
    )
  }

  const targets = [5, 10, 15, 20, 30]

  return (
    <div className="screen">
      <h1>Settings</h1>
      <p className="subtitle">Tune the daily load so it always fits your time.</p>

      <div className="list-card">
        <div className="row">
          <div>
            <strong>Audio</strong>
            <div className="muted small">Play Azerbaijani pronunciation</div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.audioEnabled}
              onChange={(e) => update({ audioEnabled: e.target.checked })}
            />
            <span className="track" />
            <span className="thumb" />
          </label>
        </div>
      </div>

      <div className="list-card">
        <strong>Daily target</strong>
        <div className="muted small" style={{ marginBottom: 10 }}>
          ~{cardsForMinutes(settings.dailyTargetMinutes)} cards/day
        </div>
        <div className="grade-row" style={{ gridTemplateColumns: `repeat(${targets.length}, 1fr)`, marginTop: 0 }}>
          {targets.map((m) => (
            <button
              key={m}
              className="grade-btn"
              style={{
                background: settings.dailyTargetMinutes === m ? 'var(--accent)' : 'var(--bg-elev)',
                color: settings.dailyTargetMinutes === m ? '#04201f' : 'var(--text)',
              }}
              onClick={() => update({ dailyTargetMinutes: m })}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      <div className="list-card">
        <strong>New cards per day</strong>
        <div className="muted small" style={{ marginBottom: 10 }}>
          How many brand-new cards to introduce daily: {settings.newPerDay}
        </div>
        <input
          type="range"
          min={2}
          max={20}
          step={1}
          value={settings.newPerDay}
          onChange={(e) => update({ newPerDay: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      <div className="list-card">
        <strong>Reset everything</strong>
        <div className="muted small" style={{ marginBottom: 12 }}>
          Wipes all progress and your added phrases, then reloads the starter decks. This cannot be
          undone.
        </div>
        {!confirmReset ? (
          <button className="btn secondary" onClick={() => setConfirmReset(true)}>
            Reset…
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn secondary" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
            <button className="btn danger" onClick={doReset}>
              Yes, wipe it
            </button>
          </div>
        )}
      </div>

      <p className="muted small" style={{ textAlign: 'center', marginTop: 20 }}>
        Azeri for Dad · works fully offline · made with ❤️
      </p>
    </div>
  )
}
