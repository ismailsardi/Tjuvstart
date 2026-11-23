"""Turn the speech manifest into MP3 files the web app can play.

Usage:
    python tools/audio/generate_audio.py --speech speech.json --voice voice.onnx --out apps/web/public/audio

The manifest comes from `tjuvstart-content speech`. Each entry becomes `<key>.mp3`. Files that
already exist are kept, so a cached output folder only gets the new or changed texts. The
script also writes `index.json`, which maps each text to its key: the app plays a recorded
file when the text is listed there and falls back to the browser's own voice otherwise.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path


def load_voice(model: Path):
    # Imported here so --help works without Piper installed.
    from piper import PiperVoice

    return PiperVoice.load(model)


def synthesize(voice, text: str, wav_path: Path) -> None:
    with wave.open(str(wav_path), "wb") as wav_file:
        voice.synthesize_wav(text, wav_file)


def to_mp3(wav_path: Path, mp3_path: Path) -> None:
    # Mono speech at 48 kbit/s is clear enough and keeps a sentence around 20 KB.
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav_path),
         "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "48k", str(mp3_path)],
        check=True,
    )


def generate(entries: list[dict], out: Path, make_voice, synth=synthesize, encode=to_mp3) -> int:
    """Writes missing files and index.json. Returns how many files were created."""
    out.mkdir(parents=True, exist_ok=True)
    missing = [e for e in entries if not (out / f"{e['key']}.mp3").exists()]
    if missing:
        voice = make_voice()
        with tempfile.TemporaryDirectory() as tmp:
            wav_path = Path(tmp) / "speech.wav"
            for number, entry in enumerate(missing, start=1):
                synth(voice, entry["text"], wav_path)
                encode(wav_path, out / f"{entry['key']}.mp3")
                print(f"[{number}/{len(missing)}] {entry['text']}")

    # Drop audio for texts that are no longer in the content.
    keys = {e["key"] for e in entries}
    for stale in out.glob("*.mp3"):
        if stale.stem not in keys:
            stale.unlink()

    index = {e["text"]: e["key"] for e in entries}
    (out / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, sort_keys=True, indent=0), encoding="utf-8"
    )
    return len(missing)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--speech", type=Path, required=True, help="speech.json from the content CLI")
    parser.add_argument("--voice", type=Path, required=True, help="Piper voice model (.onnx)")
    parser.add_argument("--out", type=Path, required=True, help="output folder, e.g. apps/web/public/audio")
    args = parser.parse_args()

    if shutil.which("ffmpeg") is None:
        print("ffmpeg is required to encode MP3 files.", file=sys.stderr)
        return 1

    entries = json.loads(args.speech.read_text(encoding="utf-8"))
    created = generate(entries, args.out, lambda: load_voice(args.voice))
    print(f"{len(entries)} texts, {created} new audio files in {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
