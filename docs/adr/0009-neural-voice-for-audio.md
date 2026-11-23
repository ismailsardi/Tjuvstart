# 0009. A neural voice for build-time audio

- Status: Accepted
- Date: 2026-11-23
- Supersedes the voice choice in [ADR 0007](0007-piper-audio-at-build-time.md); recording once at build time stays.

## Context

Learners reported that the listening audio sounded poor and foreign, close to Norwegian read with an English accent. Every clip came from the Piper voice `no_NO-talesyntese-medium`, not from a browser fallback. Piper turns text into sounds with espeak-ng's Norwegian rules, which get common words wrong (_og_ comes out as /uːɡ/ instead of /oː/), and the voice is trained on a small, old corpus. Slowing it down for beginners makes the artefacts worse. For a listening course this matters more than almost anything else, and no better free offline Norwegian voice is available.

## Decision

Record the audio with a neural voice, Azure AI Speech `nb-NO-PernilleNeural`, still once at build time.

- `tools/audio/generate_audio.py --engine azure` calls the Speech REST API and writes 24 kHz, 48 kbit/s mono MP3 directly. The key is a repository secret (`AZURE_SPEECH_KEY`) and the region a repository variable (`AZURE_SPEECH_REGION`). Neither ever reaches the app.
- The whole course is about 13,500 characters. The free F0 tier allows 500,000 a month, and the audio is cached per voice in CI, so only new or changed texts are recorded. Running cost stays at zero ([ADR 0002](0002-local-first-zero-cost.md)).
- Piper stays as the fallback engine. CI uses it when no key is set, for example on forks, and it remains the way to record without any account.
- The audio cache key includes the voice, so switching voices re-records everything once.

## Consequences

- Natural bokmål pronunciation and intonation, including at slower playback speeds.
- The build depends on an Azure account for the best voice; without it the app still has audio, only worse.
- Azure's terms allow using synthesized audio in an application. A different neural provider can replace it by adding another engine to the same script.
