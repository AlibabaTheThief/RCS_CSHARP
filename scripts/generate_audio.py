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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _slug import az_slug  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED = os.path.join(ROOT, "data", "cards.seed.json")
LESSONS = os.path.join(ROOT, "data", "lessons.json")
OUT_DIR = os.path.join(ROOT, "public", "audio")

FORCE = "--force" in sys.argv


def lesson_jobs(seen):
    jobs = []
    try:
        with open(LESSONS, encoding="utf-8") as f:
            lessons = json.load(f)
    except FileNotFoundError:
        return jobs
    for lsn in lessons:
        for sec in lsn.get("theory", []):
            for a in sec.get("audio", []):
                name = "lsn-" + az_slug(a["az"])
                if name not in seen:
                    seen.add(name)
                    jobs.append((name, a["az"]))
    return jobs


def main() -> int:
    try:
        from gtts import gTTS
    except ImportError:
        print("gTTS is not installed. Run:  pip install gTTS", file=sys.stderr)
        return 1

    with open(SEED, encoding="utf-8") as f:
        seed = json.load(f)

    os.makedirs(OUT_DIR, exist_ok=True)
    # One clip per Azerbaijani text, plus one per example sentence (<id>.ex.mp3).
    jobs = []
    for c in seed["cards"]:
        if c.get("hasAudio") is False:
            continue
        if c.get("az"):
            jobs.append((c["id"], c["az"]))
        if c.get("ex"):
            jobs.append((f"{c['id']}.ex", c["ex"]))
    jobs += lesson_jobs({name for name, _ in jobs})
    print(f"gTTS · {len(jobs)} clips · out: {OUT_DIR}")

    made = skipped = failed = 0
    for name, text in jobs:
        out = os.path.join(OUT_DIR, f"{name}.mp3")
        if not FORCE and os.path.exists(out) and os.path.getsize(out) > 0:
            skipped += 1
            continue
        # Try Azerbaijani; Google Translate occasionally rate-limits, so retry
        # a few times with backoff. Keep going on persistent failure so one bad
        # word never blocks the whole (CI) run.
        ok = False
        for attempt in range(3):
            try:
                gTTS(text=text, lang="az", lang_check=False).save(out)
                ok = True
                break
            except Exception as err:  # noqa: BLE001
                wait = 1.5 * (attempt + 1)
                print(f"  … retry {name} in {wait:.1f}s ({err})", file=sys.stderr)
                time.sleep(wait)
        if ok:
            made += 1
            print(f"  ✓ {name}  {text}")
            time.sleep(0.4)  # be gentle on the endpoint
        else:
            failed += 1
            # Drop any empty/partial file so the app treats it as "no audio".
            if os.path.exists(out) and os.path.getsize(out) == 0:
                os.remove(out)
            print(f"  ✗ {name}  {text} (giving up)", file=sys.stderr)

    print(f"Done. {made} generated, {skipped} already present, {failed} failed.")
    # Succeed as long as we produced most of the audio; a few misses are fine.
    return 1 if jobs and made == 0 and failed > 0 else 0


if __name__ == "__main__":
    raise SystemExit(main())
