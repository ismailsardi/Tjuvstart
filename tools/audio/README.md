# Build-time audio

Every lesson sentence and word card is recorded with [Piper](https://github.com/OHF-Voice/piper1-gpl) and the Norwegian voice `no_NO-talesyntese-medium` (Språkbanken *Talesyntese* dataset, CC0). See [ADR 0007](../../docs/adr/0007-piper-audio-at-build-time.md) for why.

CI does this in the `generate-audio` action before every deploy, so nothing here needs to be committed. To record locally (Python 3.10+ and ffmpeg):

```bash
python -m venv .venv && .venv/bin/pip install -r tools/audio/requirements.txt
.venv/bin/python -m piper.download_voices no_NO-talesyntese-medium --download-dir .voices

dotnet run --project tools/ContentCli/src/Tjuvstart.ContentCli -- speech content --out .voices/speech.json
.venv/bin/python tools/audio/generate_audio.py --speech .voices/speech.json \
  --voice .voices/no_NO-talesyntese-medium.onnx --out apps/web/public/audio
```

The output folder gets one `<key>.mp3` per text and an `index.json` that maps each text to its key. Running the script again only records new or changed texts and removes audio for texts that are gone.

Tests: `python3 -m unittest discover -s tools/audio`.
