import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import seed from '../data/cards.seed.json'
import type { SeedFile } from './lib/types'
import { ensureSeeded, requestPersistentStorage } from './lib/db'
import Home from './screens/Home'
import Review from './screens/Review'
import Learn from './screens/Learn'
import Culture from './screens/Culture'
import Decks from './screens/Decks'
import AddPhrase from './screens/AddPhrase'
import SettingsScreen from './screens/Settings'
import TalkToDad from './screens/TalkToDad'

export default function App() {
  const [ready, setReady] = useState(false)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    // Ask for durable storage early so progress survives storage pressure.
    void requestPersistentStorage()
    ensureSeeded(seed as SeedFile)
      .catch((err) => console.error('Seeding failed', err))
      .finally(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="app">
        <div className="center-state">
          <div className="big-emoji">🌱</div>
          <p className="muted">Preparing your decks…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {needRefresh && (
        <div className="update-banner" role="status">
          <span>✨ Update ready</span>
          <button className="pill-btn" onClick={() => void updateServiceWorker(true)}>
            Reload
          </button>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/review" element={<Review />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/culture" element={<Culture />} />
        <Route path="/decks" element={<Decks />} />
        <Route path="/add" element={<AddPhrase />} />
        <Route path="/dad" element={<TalkToDad />} />
        {/* Old bookmarks: Stats now lives on Home. */}
        <Route path="/stats" element={<Navigate to="/" replace />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
      <BottomNav />
    </div>
  )
}

function BottomNav() {
  const items = [
    { to: '/', icon: '🏠', label: 'Home', end: true },
    { to: '/review', icon: '🔁', label: 'Review' },
    { to: '/learn', icon: '📖', label: 'Learn' },
    { to: '/dad', icon: '❤️', label: 'Dad' },
    { to: '/settings', icon: '⚙️', label: 'Settings' },
  ]
  return (
    <nav className="bottom-nav">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          aria-label={it.label}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="icon" aria-hidden="true">{it.icon}</span>
          <span>{it.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
