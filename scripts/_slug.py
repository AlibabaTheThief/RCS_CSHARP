"""Azerbaijani → ascii slug, kept in sync with azSlug() in src/lib/audio.ts.
Used to name lesson-audio files (lsn-<slug>.mp3) identically in the generator
and the app."""
import re

AZ_MAP = {
    "ə": "e", "Ə": "e", "ı": "i", "ö": "o", "Ö": "o", "ü": "u", "Ü": "u",
    "ç": "c", "Ç": "c", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g", "İ": "i",
}


def az_slug(s: str) -> str:
    out = "".join(AZ_MAP.get(c, c) for c in s).lower()
    out = re.sub(r"[^a-z0-9]+", "-", out).strip("-")
    return out[:28] or "x"
