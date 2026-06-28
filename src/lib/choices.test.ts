import { describe, it, expect } from 'vitest'
import { buildChoices, answerText, supportsChoices } from './choices'
import type { SeedCard } from './types'

const vocab = (id: string, az: string, en: string): SeedCard => ({
  id, deckId: 'phase1', type: 'vocab', az, en,
})

const pool: SeedCard[] = [
  vocab('a', 'ata', 'father'),
  vocab('b', 'ana', 'mother'),
  vocab('c', 'qardaş', 'brother'),
  vocab('d', 'bacı', 'sister'),
  vocab('e', 'oğul', 'son'),
]

describe('answerText / supportsChoices', () => {
  it('uses Azeri for vocab and English for listening', () => {
    expect(answerText(vocab('x', 'su', 'water'))).toBe('su')
    expect(answerText({ ...vocab('x', 'su', 'water'), type: 'listening' })).toBe('water')
  })
  it('supports any card with a non-empty answer, including sound cards', () => {
    expect(supportsChoices(vocab('x', 'su', 'water'))).toBe(true)
    expect(supportsChoices({ ...vocab('x', 'su', 'water'), type: 'sound' })).toBe(true)
    expect(supportsChoices({ ...vocab('x', '', 'water') })).toBe(false)
  })
})

describe('buildChoices', () => {
  it('returns the requested number of unique options including the correct one', () => {
    const { options, correct } = buildChoices(pool[0], pool, 4)
    expect(options).toHaveLength(4)
    expect(new Set(options).size).toBe(4) // all unique
    expect(options).toContain(correct)
    expect(correct).toBe('ata')
    for (const o of options) expect(pool.some((c) => c.az === o)).toBe(true)
  })

  it('is deterministic for a given card', () => {
    expect(buildChoices(pool[0], pool, 4).options).toEqual(buildChoices(pool[0], pool, 4).options)
  })

  it('degrades gracefully when the pool is too small', () => {
    const { options } = buildChoices(pool[0], [pool[0], pool[1]], 4)
    expect(options).toHaveLength(2) // correct + 1 distractor available
    expect(options).toContain('ata')
    expect(options).toContain('ana')
  })

  it('never includes the correct answer as a distractor', () => {
    const dupPool = [...pool, vocab('dup', 'ata', 'dad (dup)')]
    const { options } = buildChoices(pool[0], dupPool, 4)
    expect(options.filter((o) => o === 'ata')).toHaveLength(1)
  })
})
