import type { CardState, Grade } from '../lib/types'
import { schedule, describeInterval } from '../lib/srs'

interface Props {
  state: CardState
  onGrade: (grade: Grade) => void
}

const GRADES: { grade: Grade; label: string; cls: string }[] = [
  { grade: 'again', label: 'Again', cls: 'grade-again' },
  { grade: 'hard', label: 'Hard', cls: 'grade-hard' },
  { grade: 'good', label: 'Good', cls: 'grade-good' },
  { grade: 'easy', label: 'Easy', cls: 'grade-easy' },
]

/** The four answer buttons, each previewing the next interval it would set. */
export default function GradeButtons({ state, onGrade }: Props) {
  const now = Date.now()
  return (
    <div className="grade-row">
      {GRADES.map(({ grade, label, cls }) => {
        const preview = schedule(state, grade, now)
        return (
          <button key={grade} className={`grade-btn ${cls}`} onClick={() => onGrade(grade)}>
            {label}
            <small>{describeInterval(preview)}</small>
          </button>
        )
      })}
    </div>
  )
}
