#!/usr/bin/env python3
"""Free, high-quality Azerbaijani audio via Microsoft Edge neural TTS (edge-tts).

No API key required. Uses the same az-AZ neural voices as paid Azure Speech
(Babek = male, Banu = female) through the free Edge "read aloud" endpoint, which
— unlike gTTS/Google Translate — is reliable from datacenter IPs like GitHub
Actions runners.

Reads data/cards.seed.json and writes public/audio/<cardId>.mp3 for every card
with Azerbaijani text (and hasAudio != false).

Setup:
    pip install edge-tts
    python3 scripts/generate_audio_edge.py            # skips files that exist
    python3 scripts/generate_audio_edge.py --force    # regenerate everything

Pick a voice with AZ_VOICE=az-AZ-BanuNeural (defaults to Babek, male).
"""
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _slug import az_slug  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED = os.path.join(ROOT, "data", "cards.seed.json")
LESSONS = os.path.join(ROOT, "data", "lessons.json")
OUT_DIR = os.path.join(ROOT, "public", "audio")


def lesson_jobs(seen):
    """(name, text) pairs for spoken theory examples in lessons.json."""
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

FORCE = "--force" in sys.argv
VOICE = os.environ.get("AZ_VOICE", "az-AZ-BabekNeural")


async def synth(edge_tts, text: str, out: str) -> bool:
    """Synthesize one clip with a few retries. Returns True on success."""
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, VOICE).save(out)
            if os.path.exists(out) and os.path.getsize(out) > 0:
                return True
        except Exception as err:  # noqa: BLE001
            wait = 1.5 * (attempt + 1)
            print(f"  … retry {os.path.basename(out)} in {wait:.1f}s ({err})", file=sys.stderr)
            await asyncio.sleep(wait)
    return False


async def main() -> int:
    try:
        import edge_tts
    except ImportError:
        print("edge-tts is not installed. Run:  pip install edge-tts", file=sys.stderr)
        return 1

    with open(SEED, encoding="utf-8") as f:
        seed = json.load(f)

    os.makedirs(OUT_DIR, exist_ok=True)
    # Each card yields one clip for its Azerbaijani text, plus one for its
    # example sentence (<id>.ex.mp3) when present.
    jobs = []
    for c in seed["cards"]:
        if c.get("hasAudio") is False:
            continue
        if c.get("az"):
            jobs.append((c["id"], c["az"]))
        if c.get("ex"):
            jobs.append((f"{c['id']}.ex", c["ex"]))
    jobs += lesson_jobs({name for name, _ in jobs})
    print(f"edge-tts ({VOICE}) · {len(jobs)} clips · out: {OUT_DIR}")

    made = skipped = failed = 0
    for name, text in jobs:
        out = os.path.join(OUT_DIR, f"{name}.mp3")
        if not FORCE and os.path.exists(out) and os.path.getsize(out) > 0:
            skipped += 1
            continue
        if await synth(edge_tts, text, out):
            made += 1
            print(f"  ✓ {name}  {text}")
        else:
            failed += 1
            if os.path.exists(out) and os.path.getsize(out) == 0:
                os.remove(out)
            print(f"  ✗ {name}  {text} (giving up)", file=sys.stderr)

    print(f"Done. {made} generated, {skipped} already present, {failed} failed.")
    # Fail only if we produced nothing at all (so the build can fall back).
    return 1 if jobs and made == 0 and failed > 0 else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
