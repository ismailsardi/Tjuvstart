"""Turn the speech manifest into MP3 files the web app can play.

Usage:
    # Neural voice (Azure AI Speech), the default when a key is set:
    AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=westeurope \\
        python tools/audio/generate_audio.py --speech speech.json --out apps/web/public/audio

    # Open-source fallback (Piper), no account needed:
    python tools/audio/generate_audio.py --engine piper --voice voice.onnx \\
        --speech speech.json --out apps/web/public/audio

The manifest comes from `tjuvstart-content speech`. Each entry becomes `<key>.mp3`. Files that
already exist are kept, so a cached output folder only gets the new or changed texts. The
script also writes `index.json`, which maps each text to its key: the app plays a recorded
file when the text is listed there.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path
from typing import Callable
from xml.sax.saxutils import escape

# Records one text into an MP3 file.
Recorder = Callable[[str, Path], None]

AZURE_VOICE = "nb-NO-PernilleNeural"


def azure_ssml(text: str, voice: str) -> str:
    return (
        "<speak version='1.0' xml:lang='nb-NO'>"
        f"<voice name='{escape(voice, {chr(39): '&apos;'})}'>{escape(text)}</voice>"
        "</speak>"
    )


def azure_recorder(key: str, region: str, voice: str = AZURE_VOICE, urlopen=urllib.request.urlopen) -> Recorder:
    """Neural text-to-speech over the Azure AI Speech REST API, straight to 48 kbit/s MP3."""
    url = f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1"

    def record(text: str, mp3_path: Path) -> None:
        request = urllib.request.Request(
            url,
            data=azure_ssml(text, voice).encode("utf-8"),
            method="POST",
            headers={
                "Ocp-Apim-Subscription-Key": key,
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
                "User-Agent": "tjuvstart-audio",
            },
        )
        # The free tier allows a limited number of requests per minute; back off when told to.
        for attempt in range(6):
            try:
                with urlopen(request, timeout=60) as response:
                    mp3_path.write_bytes(response.read())
                return
            except urllib.error.HTTPError as error:
                if error.code not in (429, 500, 502, 503) or attempt == 5:
                    raise
                time.sleep(2**attempt)

    return record


def piper_recorder(model: Path) -> Recorder:
    # Imported here so the Azure path and --help work without Piper installed.
    from piper import PiperVoice

    voice = PiperVoice.load(model)
    tmp = Path(tempfile.mkdtemp())

    def record(text: str, mp3_path: Path) -> None:
        wav_path = tmp / "speech.wav"
        with wave.open(str(wav_path), "wb") as wav_file:
            voice.synthesize_wav(text, wav_file)
        # Mono speech at 48 kbit/s is clear enough and keeps a sentence around 20 KB.
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav_path),
             "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "48k", str(mp3_path)],
            check=True,
        )

    return record


def voice_tag(voice: str) -> str:
    """A short, URL-safe name for the voice, e.g. "nb-no-pernilleneural"."""
    return re.sub(r"[^a-z0-9]+", "-", Path(voice).stem.lower()).strip("-")


def generate(entries: list[dict], out: Path, make_recorder: Callable[[], Recorder], tag: str = "") -> int:
    """Writes missing files and index.json. Returns how many files were created.

    File names start with the voice tag, so a new voice gets new URLs and installed apps do not
    keep playing recordings of the old voice from their cache.
    """
    out.mkdir(parents=True, exist_ok=True)
    name = (lambda key: f"{tag}-{key}") if tag else (lambda key: key)
    missing = [e for e in entries if not (out / f"{name(e['key'])}.mp3").exists()]
    if missing:
        record = make_recorder()
        for number, entry in enumerate(missing, start=1):
            record(entry["text"], out / f"{name(entry['key'])}.mp3")
            print(f"[{number}/{len(missing)}] {entry['text']}")

    # Drop audio for texts that are no longer in the content, and for other voices.
    names = {name(e["key"]) for e in entries}
    for stale in out.glob("*.mp3"):
        if stale.stem not in names:
            stale.unlink()

    index = {e["text"]: name(e["key"]) for e in entries}
    (out / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, sort_keys=True, indent=0), encoding="utf-8"
    )
    return len(missing)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--speech", type=Path, required=True, help="speech.json from the content CLI")
    parser.add_argument("--out", type=Path, required=True, help="output folder, e.g. apps/web/public/audio")
    parser.add_argument("--engine", choices=["azure", "piper"], default="azure")
    parser.add_argument("--voice", help=f"Azure voice name (default {AZURE_VOICE}) or Piper model (.onnx)")
    args = parser.parse_args()

    voice = args.voice or (AZURE_VOICE if args.engine == "azure" else "")
    if args.engine == "azure":
        key, region = os.environ.get("AZURE_SPEECH_KEY"), os.environ.get("AZURE_SPEECH_REGION")
        if not key or not region:
            print("Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION, or use --engine piper.", file=sys.stderr)
            return 1
        make_recorder = lambda: azure_recorder(key, region, voice)  # noqa: E731
    else:
        if not args.voice:
            print("--voice must point to a Piper model (.onnx).", file=sys.stderr)
            return 1
        if shutil.which("ffmpeg") is None:
            print("ffmpeg is required to encode MP3 files.", file=sys.stderr)
            return 1
        make_recorder = lambda: piper_recorder(Path(args.voice))  # noqa: E731

    entries = json.loads(args.speech.read_text(encoding="utf-8"))
    created = generate(entries, args.out, make_recorder, voice_tag(voice))
    print(f"{len(entries)} texts, {created} new audio files in {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
