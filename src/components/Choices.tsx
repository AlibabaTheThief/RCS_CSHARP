import { useMemo } from 'react'
import type { SeedCard } from '../lib/types'
import { buildChoices } from '../lib/choices'

interface Props {
  card: SeedCard
  pool: SeedCard[]
  picked: string | null
  onPick: (option: string) => void
}

/**
 * Tappable multiple-choice answers. Before a pick, all options are active;
 * after, the correct one turns green and a wrong pick turns red.
 */
export default function Choices({ card, pool, picked, onPick }: Props) {
  const { options, correct } = useMemo(() => buildChoices(card, pool), [card, pool])
  const answered = picked !== null

  return (
    <div className="choices">
      {options.map((opt) => {
        let cls = 'choice'
        if (answered) {
          if (opt === correct) cls += ' correct'
          else if (opt === picked) cls += ' wrong'
          else cls += ' dim'
        }
        return (
          <button
            key={opt}
            className={cls}
            disabled={answered}
            onClick={() => onPick(opt)}
          >
            <span className="az">{opt}</span>
            {answered && opt === correct && <span className="mark">✓</span>}
            {answered && opt === picked && opt !== correct && <span className="mark">✗</span>}
          </button>
        )
      })}
    </div>
  )
}
