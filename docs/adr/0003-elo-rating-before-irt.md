# 0003. Elo-style rating before item response theory

- Status: Accepted
- Date: 2026-11-23

## Context

The app needs a per-skill estimate of learner ability that updates after every answer and works from the first session, before any calibration data exists.

## Decision

Use an Elo-style rating, with learner ability and item difficulty on the same scale. Item difficulties start from authored estimates tied to CEFR levels. The next item is chosen so the expected success rate is about 80%.

## Consequences

- Simple, transparent, and runs entirely on the device.
- Estimates are noisier than a calibrated IRT model. Once enough anonymous answer data exists, item difficulties can be calibrated and the engine moved to IRT behind the same interface.
