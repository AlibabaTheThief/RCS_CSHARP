import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import seed from '../data/cards.seed.json'
import type { SeedFile } from './lib/types'
import { ensureSeeded, requestPersistentStorage } from './lib/db'
import Review from './screens/Review'
import Learn from './screens/Learn'
import Culture from './screens/Culture'
import Decks from './screens/Decks'
import AddPhrase from './screens/AddPhrase'
import Stats from './screens/Stats'
import SettingsScreen from './screens/Settings'
import TalkToDad from './screens/TalkToDad'

export default function App() {
  const [ready, setReady] = useState(false)

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
      <Routes>
        <Route path="/" element={<Review />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/culture" element={<Culture />} />
        <Route path="/decks" element={<Decks />} />
        <Route path="/add" element={<AddPhrase />} />
        <Route path="/dad" element={<TalkToDad />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
      <BottomNav />
    </div>
  )
}

function BottomNav() {
  const items = [
    { to: '/', icon: '🔁', label: 'Review', end: true },
    { to: '/learn', icon: '📖', label: 'Learn' },
    { to: '/culture', icon: '📜', label: 'Culture' },
    { to: '/decks', icon: '📚', label: 'Decks' },
    { to: '/dad', icon: '❤️', label: 'Dad' },
    { to: '/stats', icon: '📈', label: 'Stats' },
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
