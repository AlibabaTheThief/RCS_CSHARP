import { useEffect } from 'react'
import type { SeedCard } from '../lib/types'
import { exampleAudioUrlFor, playCard, playExample } from '../lib/audio'
import { toAzCyrillic } from '../lib/cyrillic'
import AudioButton from './AudioButton'

interface Props {
  card: SeedCard
  revealed: boolean
  isNew?: boolean
  audioEnabled: boolean
  showCyrillic?: boolean
}

/**
 * Renders the front (prompt) or back (answer) of a card depending on `revealed`
 * and the card's type. Direction by type:
 *   sound     → letter + hook, then example word + audio
 *   listening → audio only (autoplays), then Azeri + English
 *   cloze     → fill-in-the-blank prompt, then the full Azeri + audio
 *   vocab / phrase / dad → English prompt, then Azeri + audio (production)
 */
export default function Flashcard({ card, revealed, isNew, audioEnabled, showCyrillic }: Props) {
  const isSound = card.type === 'sound'
  const isListening = card.type === 'listening'
  const isCloze = card.type === 'cloze'

  // Listening cards autoplay on show and again on reveal.
  useEffect(() => {
    if (isListening) void playCard(card, audioEnabled)
  }, [card.id, revealed, isListening, card, audioEnabled])

  const promptLabel = isSound
    ? 'Letter'
    : isListening
      ? 'Listen — what does it mean?'
      : isCloze
        ? 'Fill the gap'
        : 'English → Azerbaijani'

  return (
    <div className="flashcard">
      <span className="prompt-label">{promptLabel}</span>
      {isNew && <span className="new-badge">NEW</span>}

      {!revealed ? (
        <FrontSide card={card} isSound={isSound} isListening={isListening} isCloze={isCloze} audioEnabled={audioEnabled} />
      ) : (
        <div className="card-face">
          <BackSide card={card} audioEnabled={audioEnabled} showCyrillic={showCyrillic} />
        </div>
      )}
    </div>
  )
}

function FrontSide({
  card,
  isSound,
  isListening,
  isCloze,
  audioEnabled,
}: {
  card: SeedCard
  isSound: boolean
  isListening: boolean
  isCloze: boolean
  audioEnabled: boolean
}) {
  if (isSound) {
    return (
      <>
        <div className="letter-big az">{card.letter}</div>
        {card.hook && <div className="hook">{card.hook}</div>}
      </>
    )
  }
  if (isListening) {
    return (
      <>
        <AudioButton card={card} enabled={audioEnabled} autoLabel />
        <div className="hook">Tap to hear it again</div>
      </>
    )
  }
  if (isCloze) {
    return (
      <>
        <div className="front-text az">{card.cloze}</div>
        <div className="hook">{card.en}</div>
      </>
    )
  }
  return <div className="front-text">{card.en}</div>
}

function BackSide({
  card,
  audioEnabled,
  showCyrillic,
}: {
  card: SeedCard
  audioEnabled: boolean
  showCyrillic?: boolean
}) {
  const hasExample = !!card.ex && exampleAudioUrlFor(card) !== null
  return (
    <>
      <div className="back-az az">{card.az}</div>
      {showCyrillic && <div className="cyrillic az">{toAzCyrillic(card.az)}</div>}
      {card.pron && <div className="pron">{card.pron}</div>}
      <div className="back-en">{card.en}</div>

      <AudioButton card={card} enabled={audioEnabled} />

      {card.ex && (
        <div className="example">
          <span className="example-label">In a sentence</span>
          <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
            <span className="example-az az">{card.ex}</span>
            {hasExample && (
              <button
                className="audio-btn small"
                onClick={() => void playExample(card, audioEnabled)}
                aria-label="Play example"
                title="Play example"
              >
                🔊
              </button>
            )}
          </div>
          {card.exEn && <div className="example-en">{card.exEn}</div>}
        </div>
      )}

      {card.note && <div className="note">{card.note}</div>}

      {card.tags && card.tags.length > 0 && (
        <div className="tag-row">
          {card.tags.map((t) => (
            <span key={t} className={`tag${t === 'heart' ? ' heart' : t === 'tricky' ? ' tricky' : ''}`}>
              {t}
            </span>
          ))}
        </div>
      )}
    </>
  )
}
