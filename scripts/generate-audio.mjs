#!/usr/bin/env node
/**
 * Generate the bundled Azerbaijani audio set from data/cards.seed.json.
 *
 * Writes public/audio/<cardId>.mp3 for every card that has Azerbaijani text
 * (and hasAudio !== false). The app plays these offline; nothing here runs on
 * the user's phone.
 *
 * Providers (set TTS_PROVIDER):
 *   azure  (default, best az-AZ quality) — needs AZURE_SPEECH_KEY, AZURE_SPEECH_REGION
 *   google                               — needs GOOGLE_TTS_KEY (API key)
 *
 * For a zero-credentials option, use the Python gTTS script instead:
 *   npm run audio:gtts
 *
 * Usage:
 *   AZURE_SPEECH_KEY=xxx AZURE_SPEECH_REGION=westeurope npm run audio
 *   npm run audio -- --force     # re-generate even if the mp3 already exists
 */
import { readFile, mkdir, writeFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SEED = join(ROOT, 'data', 'cards.seed.json')
const OUT_DIR = join(ROOT, 'public', 'audio')

const FORCE = process.argv.includes('--force')
const PROVIDER = (process.env.TTS_PROVIDER || 'azure').toLowerCase()

// Azure neural voices for Azerbaijani (Republic).
const AZURE_VOICE = process.env.AZURE_VOICE || 'az-AZ-BabekNeural'
const GOOGLE_VOICE = process.env.GOOGLE_VOICE || 'az-AZ-Standard-A'

async function exists(p) {
  try {
    await access(p, constants.F_OK)
    return true
  } catch {
    return false
  }
}

function xmlEscape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function synthAzure(text) {
  const key = process.env.AZURE_SPEECH_KEY
  const region = process.env.AZURE_SPEECH_REGION
  if (!key || !region) {
    throw new Error('Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION (e.g. westeurope).')
  }
  const ssml = `<speak version='1.0' xml:lang='az-AZ'><voice xml:lang='az-AZ' name='${AZURE_VOICE}'>${xmlEscape(
    text,
  )}</voice></speak>`
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'azeri-for-dad',
    },
    body: ssml,
  })
  if (!res.ok) throw new Error(`Azure TTS ${res.status}: ${await res.text()}`)
  return Buffer.from(await res.arrayBuffer())
}

async function synthGoogle(text) {
  const key = process.env.GOOGLE_TTS_KEY
  if (!key) throw new Error('Set GOOGLE_TTS_KEY (a Google Cloud TTS API key).')
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'az-AZ', name: GOOGLE_VOICE },
      audioConfig: { audioEncoding: 'MP3' },
    }),
  })
  if (!res.ok) throw new Error(`Google TTS ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return Buffer.from(data.audioContent, 'base64')
}

const synth = PROVIDER === 'google' ? synthGoogle : synthAzure

async function main() {
  const seed = JSON.parse(await readFile(SEED, 'utf8'))
  await mkdir(OUT_DIR, { recursive: true })

  const targets = seed.cards.filter((c) => c.az && c.hasAudio !== false)
  console.log(`Provider: ${PROVIDER} · ${targets.length} cards · out: ${OUT_DIR}`)

  let made = 0
  let skipped = 0
  for (const card of targets) {
    const out = join(OUT_DIR, `${card.id}.mp3`)
    if (!FORCE && (await exists(out))) {
      skipped++
      continue
    }
    try {
      const buf = await synth(card.az)
      await writeFile(out, buf)
      made++
      console.log(`  ✓ ${card.id}  ${card.az}`)
    } catch (err) {
      console.error(`  ✗ ${card.id}  ${card.az}\n    ${err.message}`)
      process.exitCode = 1
      return
    }
  }
  console.log(`Done. ${made} generated, ${skipped} already present.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
