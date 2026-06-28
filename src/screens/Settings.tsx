import { useEffect, useRef, useState } from 'react'
import {
  exportData,
  getSettings,
  importData,
  requestPersistentStorage,
  resetAll,
  saveSettings,
} from '../lib/db'
import { cardsForMinutes } from '../lib/srs'
import type { Settings } from '../lib/types'

function todayStamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [persist, setPersist] = useState<'persisted' | 'prompt' | 'unsupported' | null>(null)
  const [dataMsg, setDataMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void getSettings().then(setSettings)
    void requestPersistentStorage().then(setPersist)
  }, [])

  const doExport = async () => {
    try {
      const backup = await exportData()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `azeri-for-dad-backup-${todayStamp()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setDataMsg('✅ Backup downloaded.')
    } catch (err) {
      setDataMsg(`⚠️ Export failed: ${(err as Error).message}`)
    }
    setTimeout(() => setDataMsg(null), 4000)
  }

  const doImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text())
      await importData(data)
      setDataMsg('✅ Restored. Reloading…')
      setTimeout(() => location.reload(), 900)
    } catch (err) {
      setDataMsg(`⚠️ Import failed: ${(err as Error).message}`)
      setTimeout(() => setDataMsg(null), 5000)
    }
  }

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
        <div className="row">
          <div>
            <strong>Multiple choice</strong>
            <div className="muted small">Tap from answer options instead of just revealing</div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.choiceMode}
              onChange={(e) => update({ choiceMode: e.target.checked })}
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
        <strong>Your data</strong>
        <div className="muted small" style={{ margin: '4px 0 12px' }}>
          Your progress and your “Phrases for Dad” live on this device. Back them up so you never
          lose them — keep the file somewhere safe (email it to yourself, save to cloud).
        </div>
        {dataMsg && <div className="banner" style={{ marginBottom: 12 }}>{dataMsg}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={doExport}>
            ⬇️ Back up
          </button>
          <button className="btn secondary" onClick={() => fileRef.current?.click()}>
            ⬆️ Restore
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void doImport(f)
            e.target.value = ''
          }}
        />
        <div className="muted small" style={{ marginTop: 10 }}>
          {persist === 'persisted'
            ? '🔒 Storage is persistent — the system won’t auto-clear your data.'
            : persist === 'prompt'
              ? '⚠️ Storage isn’t marked persistent yet. Backing up regularly is recommended.'
              : persist === 'unsupported'
                ? 'ℹ️ This browser can’t guarantee persistent storage — back up regularly.'
                : ''}
        </div>
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
