# 0007. Piper audio at build time, browser voice as fallback

- Status: Accepted; voice superseded by [ADR 0009](0009-neural-voice-for-audio.md)
- Date: 2026-11-23

## Context

Learners need to hear every lesson sentence and every word card, both for listening and as a model for shadowing. The app has no server and must cost nothing to run ([ADR 0002](0002-local-first-zero-cost.md)). Browser speech synthesis is free, but whether a Norwegian voice exists depends on the device, and quality varies a lot. Cloud TTS sounds good but costs money per character.

## Decision

Record the audio once, at build time, with [Piper](https://github.com/OHF-Voice/piper1-gpl), an open-source TTS engine that runs on a CPU. The voice is `no_NO-talesyntese-medium`, trained on the Språkbanken _Talesyntese_ dataset (CC0).

- The content CLI lists every text to record (`speech` command): each lesson sentence, each card as labelled (_en jobb_, _å jobbe_) and each card example. A text's file name is a hash of the text, so unchanged texts keep their audio.
- `tools/audio/generate_audio.py` records the missing texts and encodes them as mono 48 kbit/s MP3. GitHub Actions caches the voice and the audio, so a deploy only records new or changed texts.
- The files are deployed with the app, not committed. The service worker caches each file the first time it plays, so installing the app does not download all audio up front.
- When a text has no recording, for example in local development, the app uses the browser's Norwegian voice if there is one.

## Consequences

- Same voice on every device, offline after first play, and no running cost.
- The voice is synthetic: good for rhythm and word stress, weaker on pitch accent (tonelag). Real recordings can replace single files later without changing the app.
- The first build after a content change spends a few seconds per new sentence on CI.
