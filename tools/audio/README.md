# Build-time audio

Every lesson sentence and word card is recorded once, at build time, with the Azure AI Speech neural voice `nb-NO-PernilleNeural`. When no Azure key is set, the open-source [Piper](https://github.com/OHF-Voice/piper1-gpl) voice `no_NO-talesyntese-medium` (Språkbanken *Talesyntese*, CC0) is used instead. See [ADR 0007](../../docs/adr/0007-piper-audio-at-build-time.md) and [ADR 0009](../../docs/adr/0009-neural-voice-for-audio.md).

CI does this in the `generate-audio` action before every deploy, so nothing here needs to be committed. The action reads the key from the `AZURE_SPEECH_KEY` repository secret and the region from the `AZURE_SPEECH_REGION` repository variable. A free F0 Speech resource is enough: the course is about 13,500 characters and only new texts are recorded.

To record locally with Azure (Python 3.10+, no extra packages):

```bash
dotnet run --project tools/ContentCli/src/Tjuvstart.ContentCli -- speech content --out .voices/speech.json
AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=westeurope \
  python tools/audio/generate_audio.py --speech .voices/speech.json --out apps/web/public/audio
```

Or with Piper (also needs ffmpeg):

```bash
python -m venv .venv && .venv/bin/pip install -r tools/audio/requirements.txt
.venv/bin/python -m piper.download_voices no_NO-talesyntese-medium --download-dir .voices
.venv/bin/python tools/audio/generate_audio.py --engine piper \
  --voice .voices/no_NO-talesyntese-medium.onnx --speech .voices/speech.json --out apps/web/public/audio
```

The output folder gets one `<key>.mp3` per text and an `index.json` that maps each text to its key. Running the script again only records new or changed texts and removes audio for texts that are gone. Switching voices needs an empty output folder (CI handles this by caching audio per voice).

Tests: `python3 -m unittest discover -s tools/audio`.
