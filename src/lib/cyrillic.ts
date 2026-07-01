// Latin → Azerbaijani Cyrillic transliteration.
//
// Azerbaijani was written in Cyrillic from 1939 until 1991, so a person schooled
// in Soviet Azerbaijan learned this script. Someone who reads Russian can read
// almost all of it — only a handful of letters are special to Azerbaijani.
// This is a deterministic, reversible-enough mapping for display.

const MAP: Record<string, string> = {
  a: 'а', b: 'б', c: 'ҹ', ç: 'ч', d: 'д', e: 'е', ə: 'ә', f: 'ф', g: 'ҝ', ğ: 'ғ',
  h: 'һ', x: 'х', ı: 'ы', i: 'и', j: 'ж', k: 'к', q: 'г', l: 'л', m: 'м', n: 'н',
  o: 'о', ö: 'ө', p: 'п', r: 'р', s: 'с', ş: 'ш', t: 'т', u: 'у', ü: 'ү', v: 'в',
  y: 'ј', z: 'з',
}

function mapChar(c: string): string {
  // Azerbaijani's dotted/dotless I don't round-trip through toLowerCase cleanly.
  if (c === 'İ') return 'И'
  if (c === 'I') return 'Ы'
  const lower = c.toLowerCase()
  const m = MAP[lower]
  if (!m) return c // spaces, punctuation, digits pass through
  return c === lower ? m : m.toUpperCase()
}

/** Transliterate Azerbaijani Latin text into Azerbaijani Cyrillic. */
export function toAzCyrillic(latin: string): string {
  let out = ''
  for (const c of latin) out += mapChar(c)
  return out
}
