#!/usr/bin/env python3
"""Zero-credentials Azerbaijani audio generation using gTTS (Google Translate).

This is the easiest way to produce the bundled audio: no API key needed.
Quality is lower than Azure/Google Cloud neural voices, but it's perfectly
usable for a beginner learning pronunciation.

Reads data/cards.seed.json and writes public/audio/<cardId>.mp3 for every card
with Azerbaijani text (and hasAudio != false).

Setup:
    pip install gTTS
    python3 scripts/generate_audio.py            # skips files that exist
    python3 scripts/generate_audio.py --force    # regenerate everything

Note: gTTS calls Google Translate, so it needs internet access when you run it.
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED = os.path.join(ROOT, "data", "cards.seed.json")
OUT_DIR = os.path.join(ROOT, "public", "audio")

FORCE = "--force" in sys.argv


def main() -> int:
    try:
        from gtts import gTTS
    except ImportError:
        print("gTTS is not installed. Run:  pip install gTTS", file=sys.stderr)
        return 1

    with open(SEED, encoding="utf-8") as f:
        seed = json.load(f)

    os.makedirs(OUT_DIR, exist_ok=True)
    targets = [c for c in seed["cards"] if c.get("az") and c.get("hasAudio") is not False]
    print(f"gTTS · {len(targets)} cards · out: {OUT_DIR}")

    made = skipped = 0
    for card in targets:
        out = os.path.join(OUT_DIR, f"{card['id']}.mp3")
        if not FORCE and os.path.exists(out):
            skipped += 1
            continue
        try:
            # 'az' is Azerbaijani in Google Translate's TTS.
            gTTS(text=card["az"], lang="az").save(out)
            made += 1
            print(f"  ✓ {card['id']}  {card['az']}")
            time.sleep(0.4)  # be gentle on the endpoint
        except Exception as err:  # noqa: BLE001
            print(f"  ✗ {card['id']}  {card['az']}\n    {err}", file=sys.stderr)
            return 1

    print(f"Done. {made} generated, {skipped} already present.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
