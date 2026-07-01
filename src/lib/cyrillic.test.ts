import { describe, it, expect } from 'vitest'
import { toAzCyrillic } from './cyrillic'

describe('toAzCyrillic', () => {
  const cases: [string, string][] = [
    ['salam', 'салам'],
    ['ata', 'ата'],
    ['Necəsən', 'Неҹәсән'],
    ['yaxşı', 'јахшы'],
    ['Səni sevirəm', 'Сәни севирәм'],
    ['çay', 'чај'],
    ['Sumqayıt', 'Сумгајыт'],
    ['dağ', 'дағ'],
    ['gül', 'ҝүл'],
    ['öyrənirəm', 'өјрәнирәм'],
  ]
  for (const [latin, cyr] of cases) {
    it(`${latin} → ${cyr}`, () => {
      expect(toAzCyrillic(latin)).toBe(cyr)
    })
  }

  it('passes punctuation and spaces through', () => {
    expect(toAzCyrillic('Salam, ata!')).toBe('Салам, ата!')
  })
})
