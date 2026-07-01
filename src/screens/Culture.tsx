import { useEffect, useState } from 'react'
import cultureData from '../../data/culture.json'
import type { Article } from '../lib/types'
import { getSettings } from '../lib/db'
import { playLessonAudio } from '../lib/audio'

const ARTICLES = cultureData as Article[]

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

export default function Culture() {
  const [active, setActive] = useState<Article | null>(null)
  const [audioEnabled, setAudioEnabled] = useState(true)

  useEffect(() => {
    void getSettings().then((s) => setAudioEnabled(s.audioEnabled))
  }, [])

  if (active) return <ArticleView article={active} audioEnabled={audioEnabled} onExit={() => setActive(null)} />

  return (
    <div className="screen">
      <h1>📜 Culture</h1>
      <p className="subtitle">
        A little of the world your dad grew up in — Azerbaijan's fire and food, music and Novruz, the
        Soviet years, and why he may write in a different alphabet.
      </p>
      {ARTICLES.length === 0 && <p className="muted">Articles are on their way…</p>}
      {ARTICLES.map((a) => (
        <button key={a.id} className="list-card lesson-card" onClick={() => setActive(a)}>
          <div className="row">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: '1.8rem' }} aria-hidden="true">{a.emoji}</span>
              <div style={{ textAlign: 'left' }}>
                <strong>{a.title}</strong>
                <div className="muted small">{a.subtitle}</div>
              </div>
            </div>
            <span className="muted" aria-hidden="true">›</span>
          </div>
        </button>
      ))}
    </div>
  )
}

function ArticleView({
  article,
  audioEnabled,
  onExit,
}: {
  article: Article
  audioEnabled: boolean
  onExit: () => void
}) {
  return (
    <div className="screen">
      <div className="row" style={{ marginBottom: 8 }}>
        <button className="tag" onClick={onExit}>‹ Back</button>
      </div>
      <h1 style={{ marginBottom: 2 }}>{article.emoji} {article.title}</h1>
      <p className="subtitle">{article.subtitle}</p>

      {article.sections.map((s, i) => (
        <div className="article-section" key={i}>
          <h2>{s.heading}</h2>
          {s.body.split('\n').map((line, k) => (
            <p key={k} className={line.startsWith('•') ? 'bullet' : ''}>{line}</p>
          ))}
        </div>
      ))}

      {article.terms && article.terms.length > 0 && (
        <div className="article-section">
          <h2>Words to know</h2>
          <div className="terms-grid">
            {article.terms.map((t) => (
              <button
                key={t.az}
                className="term-chip"
                onClick={() => void playLessonAudio(t.az, audioEnabled)}
                aria-label={`Play ${t.az}`}
              >
                <span className="az">🔊 {t.az}</span>
                <span className="muted small">{t.en}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {article.sources && article.sources.length > 0 && (
        <p className="muted small" style={{ marginTop: 18 }}>
          Sources:{' '}
          {article.sources.map((src, i) => (
            <span key={src}>
              {i > 0 && ' · '}
              <a href={src} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-2)' }}>
                {hostOf(src)}
              </a>
            </span>
          ))}
        </p>
      )}
    </div>
  )
}
