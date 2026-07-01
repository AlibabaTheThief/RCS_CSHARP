import { describe, it, expect } from 'vitest'
import { azSlug } from './audio'

// These expected slugs are produced by scripts/_slug.py (the audio generator).
// If this test fails, the app and the generator would disagree on lesson-audio
// filenames — keep azSlug() and _slug.py identical.
const EXPECTED: Record<string, string> = {
  salam: 'salam',
  yaxşı: 'yaxsi',
  Necəsən: 'necesen',
  dağ: 'dag',
  'sağ ol': 'sag-ol',
  nənə: 'nene',
  əl: 'el',
  'Səni sevirəm': 'seni-sevirem',
  'Su istəyirəm': 'su-isteyirem',
  İstəyirəm: 'isteyirem',
  Sevirəm: 'sevirem',
  'Səninlə danışmaq istəyirəm': 'seninle-danismaq-isteyirem',
  atam: 'atam',
  evim: 'evim',
  pulum: 'pulum',
  kitab: 'kitab',
  kitabım: 'kitabim',
  istəyirəm: 'isteyirem',
  gəlirəm: 'gelirem',
  'Gəlirsənmi?': 'gelirsenmi',
  'Yaxşısan?': 'yaxsisan',
  'Harada yaşayırsan?': 'harada-yasayirsan',
}

describe('azSlug matches the Python generator slug', () => {
  for (const [az, slug] of Object.entries(EXPECTED)) {
    it(`${az} → ${slug}`, () => {
      expect(azSlug(az)).toBe(slug)
    })
  }
})
