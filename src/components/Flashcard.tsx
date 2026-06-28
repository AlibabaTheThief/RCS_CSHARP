import { useEffect } from 'react'
import type { SeedCard } from '../lib/types'
import { playCard } from '../lib/audio'
import AudioButton from './AudioButton'

interface Props {
  card: SeedCard
  revealed: boolean
  isNew?: boolean
  audioEnabled: boolean
}

/**
 * Renders the front (prompt) or back (answer) of a card depending on `revealed`
 * and the card's type. Direction by type:
 *   sound     → letter + hook, then example word + audio
 *   listening → audio only (autoplays), then Azeri + English
 *   vocab / phrase / dad → English prompt, then Azeri + audio (production)
 */
export default function Flashcard({ card, revealed, isNew, audioEnabled }: Props) {
  const isSound = card.type === 'sound'
  const isListening = card.type === 'listening'

  // Listening cards autoplay on show and again on reveal.
  useEffect(() => {
    if (isListening) void playCard(card, audioEnabled)
  }, [card.id, revealed, isListening, card, audioEnabled])

  const promptLabel = isSound
    ? 'Letter'
    : isListening
      ? 'Listen — what does it mean?'
      : 'English → say it in Azerbaijani'

  return (
    <div className="flashcard">
      <span className="prompt-label">{promptLabel}</span>
      {isNew && <span className="new-badge">NEW</span>}

      {!revealed && <FrontSide card={card} isSound={isSound} isListening={isListening} audioEnabled={audioEnabled} />}
      {revealed && <BackSide card={card} isSound={isSound} audioEnabled={audioEnabled} />}
    </div>
  )
}

function FrontSide({
  card,
  isSound,
  isListening,
  audioEnabled,
}: {
  card: SeedCard
  isSound: boolean
  isListening: boolean
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
  return <div className="front-text">{card.en}</div>
}

function BackSide({
  card,
  isSound,
  audioEnabled,
}: {
  card: SeedCard
  isSound: boolean
  audioEnabled: boolean
}) {
  return (
    <>
      {isSound ? (
        <>
          <div className="back-az az">{card.az}</div>
          <div className="back-en">{card.en}</div>
        </>
      ) : (
        <>
          <div className="back-az az">{card.az}</div>
          <div className="back-en">{card.en}</div>
        </>
      )}

      <AudioButton card={card} enabled={audioEnabled} />

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
