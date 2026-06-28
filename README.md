# Azeri for Dad 🇦🇿❤️

A personal spaced-repetition flashcard app for learning **Azerbaijani** (North /
Republic, Latin script), built for one user — Ali — so he can have simple spoken
conversations with his Dad.

It's an **offline-first PWA**: install it to your phone's home screen and it works
with no network, like a real app.

- **Target language:** Azerbaijani · **App language:** English
- **~10–15 min/day**, total beginner → growing toward real conversation
- **SM-2** spaced repetition, daily queue auto-capped to your time budget
- **Listening-first** (the goal is *spoken* understanding), tap-to-reveal recall
- A user-editable **"Phrases for Dad"** deck + a **Talk to Dad** drill mode

## Get it on your phone (easiest path)

This repo deploys itself to **GitHub Pages** via GitHub Actions. One-time setup:

1. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Push to the `claude/azeri-learning-app-whv2tn` branch (or run the
   *Deploy Azeri for Dad to GitHub Pages* workflow manually). The Action builds
   and publishes the app.
3. Open the published URL **on your phone** (Settings → Pages shows it, e.g.
   `https://<you>.github.io/rcs_csharp/`).
4. **iPhone (Safari):** Share → *Add to Home Screen*.
   **Android (Chrome):** menu → *Install app* / *Add to Home screen*.

That's it — it now opens full-screen and works offline.

## Audio (run this locally to add pronunciation)

Audio is **pre-generated and bundled** (on-device `az-AZ` TTS is unreliable, so we
don't use it). The app works without audio — the play buttons just stay quiet
until you generate the files. To add audio, run **one** of these on your computer:

```bash
# Option A — zero credentials, easiest (Python). Lower quality but fine.
pip install gTTS
npm run audio:gtts

# Option B — best quality (Azure neural az-AZ voices). Needs an Azure Speech key.
TTS_PROVIDER=azure AZURE_SPEECH_KEY=xxx AZURE_SPEECH_REGION=westeurope npm run audio

# Option C — Google Cloud TTS. Needs a Google Cloud API key.
TTS_PROVIDER=google GOOGLE_TTS_KEY=xxx npm run audio
```

This reads `data/cards.seed.json` and writes `public/audio/<cardId>.mp3`. Commit
those mp3s and the next Pages deploy will ship them. Re-run with `-- --force` to
regenerate. (User-added "Phrases for Dad" have no audio until you re-run this.)

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # preview the production build
```

## How it works

```
/data        cards.seed.json      — all starter content (decks + cards)
/scripts     generate-audio.mjs   — Azure/Google TTS generator (Node)
             generate_audio.py    — gTTS generator (no key)
             generate-icons.mjs   — builds the PWA icons
/src/lib     srs.ts   — SM-2 scheduler + learning steps + leech flagging
             db.ts    — IndexedDB (cards, states, decks, reviews, settings)
             queue.ts — daily queue: due reviews + a few new cards, time-capped
             audio.ts — plays bundled mp3s, degrades gracefully if missing
/src/screens Review · Decks · AddPhrase · TalkToDad · Stats · Settings
```

- **First launch** loads `cards.seed.json` into IndexedDB. After that, all
  progress and your own phrases live on-device.
- **Daily queue** prioritises due reviews, then introduces up to *N* new cards,
  trimmed to fit your daily-minutes target so it never balloons.
- **Reset** (Settings) wipes everything and re-seeds.

## Curriculum (drives the cards)

- **Phase 0 — Sounds & alphabet:** every letter + example word, tricky letters
  tagged (`c`="j", `ə` schwa, `ı` dotless-i, `ö/ü`, `ç/ş/j/x`, `q`, `ğ`).
- **Phase 1 — Dad & family + heart phrases:** pronouns, "I am/you are", family,
  greetings, first phrases for Dad. (+ a Listening deck.)
- **Phase 2 — Everyday survival** (off by default): numbers, want/have, food,
  question words. Enable it in **Decks** when ready.

Phases 3–4 (his life, real conversation) are added as new cards over time —
either by editing `data/cards.seed.json` or via the in-app **Add a phrase**.

## Verifying Azerbaijani spelling

All seed cards were written with care for diacritics (`ə`, `ı`, `ö`, `ü`, `ç`,
`ş`, `ğ`). When you add cards, double-check `ə` vs `e` and `ı` vs `i` — those are
the easiest to mangle. The "Phrases for Dad" seed matches the spec exactly.
