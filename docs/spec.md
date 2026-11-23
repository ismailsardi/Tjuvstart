# Tjuvstart: product specification

|              |              |
| ------------ | ------------ |
| Status       | Draft, v0.1  |
| Last updated | 2026-11-23   |
| Owner        | Ismail Sardi |

## 1. Summary

Tjuvstart is an installable web app (PWA) that helps adults moving to Norway for work learn Norwegian bokmål, from roughly A1/A2 to CEFR level B2. It estimates the learner's level in each skill as they practise and adapts every lesson, text and exercise to that level. It also uses the learner's native language to decide what to teach and how to explain it.

The app runs at zero cost to host. All core features work offline in the browser. AI features are optional and use either the learner's own API key or models that run on the device.

## 2. Problem

Adults who move to Norway for work usually need to reach B1 or B2 quickly, both for the job and for daily life. Existing options tend to fall short in at least one of these ways:

- Generic courses move at a fixed pace, whatever the learner already knows.
- Gamified apps rarely go beyond A2 and give little practice in writing and speaking.
- Courses are written for one source language, or for none, and ignore what a French or Arabic speaker already brings.
- Learners have no reliable way to tell how close they are to B2 before they sit the official test.

## 3. Goals and non-goals

### Goals

1. Get learners from A1/A2 to B2 as efficiently as possible.
2. Give a continuous, per-skill level estimate that is honest about its confidence.
3. Cover every CEFR B2 descriptor for reading, listening, writing and speaking with at least one lesson and one assessed task, and check that coverage automatically.
4. Run at zero hosting cost, with core features available offline.

### Non-goals

- Nynorsk. The app teaches bokmål only.
- Exam drilling. The format of Norskprøven is used to measure level, not as the curriculum.
- Native mobile apps. The PWA is installable on phones; a store wrapper may come later.
- Teacher or classroom features.

## 4. Target users

**Primary:** adults relocating to Norway for work (Oslo first), with advanced A1 or A2 Norwegian, studying alone in short daily sessions.

**First supported native languages:** English, French, Arabic.

## 5. Success metrics

| Metric            | How it is measured                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Level progress    | Change in per-skill level estimate per hour of practice                                                                 |
| Estimate accuracy | Agreement between the app's estimate and a full practice exam or an official Norskprøven result reported by the learner |
| Retention         | Share of learners active 7 and 30 days after their first session                                                        |
| Coverage          | Share of in-scope CEFR descriptors with at least one lesson and one assessed task (target: 100%, enforced in CI)        |

## 6. Learning approach

The design follows well-established findings on adult language learning:

- **High-frequency material first:** the most-used words and patterns, plus the language adults need at work.
- **Retrieval practice:** learners produce answers rather than reread.
- **Spaced repetition:** words, grammar patterns and phrases come back just before they are likely to be forgotten.
- **Input just above the current level:** texts and audio are chosen so most of the content is understood.
- **Interleaving:** reviews mix topics and skills.
- **Short sessions:** about 10 to 15 minutes a day by default, with a clear end point.
- **Real situations:** work-life scenarios such as meetings, emails, small talk, the doctor and renting, from A2 upward.

## 7. Level model

### 7.1 What B2 requires

The CEFR global scale describes a B2 user as someone who can understand the main ideas of complex text on concrete and abstract topics, interact with native speakers with a degree of fluency and spontaneity, and produce clear, detailed text on a wide range of subjects, including explaining a viewpoint with the advantages and disadvantages of different options [1].

The app stores the detailed CEFR descriptors for each skill [2] in `content/descriptors.json`, each with a stable ID. Every lesson and task references the descriptors it covers.

### 7.2 Alignment with Norskprøven

Norskprøven, run by HK-dir, is the standard Norwegian test for adult immigrants. B2 can only be reached on its hardest track (B1–B2) [3].

| Part      | Format at B1–B2                                                                                                                                                                      | Mirrored in the app by                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Reading   | Computer-based, up to 75 minutes. Two short routing tests, then a main test of about 20 items [4]                                                                                    | Two-stage adaptive reading check                            |
| Listening | Computer-based, 30–60 minutes, same routing. No going back; B2 items are played once [5]                                                                                             | Listening practice that switches to single play at B2       |
| Writing   | Two tasks in 120 minutes, typed. Assessed on task completion, structure, spelling, punctuation, vocabulary and grammar [6]                                                           | Timed two-task writing practice scored on the same criteria |
| Speaking  | 20–25 minutes, usually in pairs: give and justify an opinion, discuss with a partner, take a position on a statement. Assessed on fluency, pronunciation, vocabulary and grammar [7] | Three matching speaking tasks                               |

For context, Norwegian citizenship requires a pass at B1 or higher in the oral test [8]. Many employers ask for B2.

### 7.3 How the level is estimated

1. **Tagging.** Every item carries a CEFR level, a skill, descriptor IDs and a difficulty rating.
2. **Placement.** A short placement check per skill sets a starting estimate.
3. **Continuous estimate.** Each answer updates a per-skill Elo-style rating: a correct answer on a hard item raises the rating more than one on an easy item (see [ADR 0003](adr/0003-elo-rating-before-irt.md)).
4. **Item selection.** The next item is chosen so the expected success rate is about 80%.
5. **Open answers.** With AI enabled, writing and speaking are scored against a CEFR-based rubric and the score feeds into the same rating. Without AI, learners self-assess against a model answer and a checklist, and the level for that skill is marked as self-assessed.
6. **Recalibration.** A periodic short practice exam checks the estimate against exam-style tasks.

## 8. Curriculum scope

| Level | Grammar                                                                                                | Vocabulary and topics                                       | Pronunciation                                       |
| ----- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------- |
| A1    | Present tense, V2 word order, noun gender and definite forms, personal pronouns                        | Self, family, numbers, time, food, shopping                 | Vowel length, æ/ø/å                                 |
| A2    | Past and perfect tenses, modal verbs, adjective agreement, possessives, simple subordinate clauses     | Home, work, health, transport, appointments                 | Tonemes in common word pairs                        |
| B1    | Inversion after adverbials, _ikke_ in subordinate clauses, passive forms, reflexives, relative clauses | Workplace, public services, news, opinions                  | Connected speech, retroflex sounds                  |
| B2    | Complex sentences, modal particles (_jo, vel, nok_), register, nominalisation, cohesion                | Society, environment, work culture, debate, abstract topics | Understanding regional dialects, natural intonation |

The national curriculum for Norwegian and social studies for adult immigrants is the reference for this table before content production starts.

## 9. Native-language adaptation

At onboarding the learner selects their native language and any other languages they know well. Each supported language has a static content pack in `content/l1/<language>/`.

| Pack component      | Use in the app                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| Cognates            | Lower starting difficulty for words the learner probably already knows                            |
| False friends       | Flagged and practised explicitly (for example _rar_ means "strange", not "rare")                  |
| Grammar contrasts   | Extra practice where the learner's language differs, such as V2 word order or the definite suffix |
| Pronunciation notes | Focus on sounds that do not exist in the learner's language                                       |
| Explanations        | Grammar notes and hints in the learner's language                                                 |

Packs are drafted during development, reviewed by a teacher familiar with each language, and shipped as JSON, so they add no runtime cost.

## 10. Features and priorities

| Feature                      | Description                                                                                             | Release |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | ------- |
| Placement and level estimate | Per-skill placement check and continuous rating                                                         | MVP     |
| Lesson player                | Short lessons: explanation, examples, then exercises (gap fill, multiple choice, word order, dictation) | MVP     |
| Spaced repetition            | Flashcards for vocabulary and sentence patterns, scheduled with FSRS                                    | MVP     |
| Reading and listening        | Graded texts and audio with comprehension questions                                                     | MVP     |
| Native-language packs        | English and French                                                                                      | MVP     |
| Coverage view                | Proven and weak descriptors per skill                                                                   | MVP     |
| Writing feedback             | Rubric-based scoring with the learner's own API key; self-assessment otherwise                          | MVP     |
| Arabic pack                  | Including a right-to-left interface                                                                     | v2      |
| Speaking practice            | Recording, on-device speech-to-text, rubric feedback                                                    | v2      |
| Conversation practice        | Role-play of work-life scenarios with an AI partner                                                     | v2      |
| Practice exam                | Timed, Norskprøven-style, across all four parts                                                         | v2      |
| Sync API                     | ASP.NET Core API for account sync                                                                       | v2      |
| Dialect listening            | The same sentences recorded in several regional dialects                                                | v3      |

## 11. Architecture

```
┌──────────────────────┐   build   ┌──────────────────────────┐
│ Content (JSON)       │ ────────▶ │ PWA (React + TypeScript) │
│ .NET content CLI     │           │ level engine, IndexedDB  │
│ TTS audio at build   │           │ hosted on GitHub Pages   │
└──────────────────────┘           └────────────┬─────────────┘
                                                │ optional
                    ┌───────────────────────────┼───────────────────────────┐
                    ▼                           ▼                           ▼
          ┌──────────────────┐       ┌────────────────────┐      ┌────────────────────┐
          │ Sync (free tier) │       │ LLM, learner's key │      │ On-device models   │
          │ Supabase, later  │       │ writing/speaking   │      │ speech-to-text     │
          │ ASP.NET Core API │       │ scoring            │      │                    │
          └──────────────────┘       └────────────────────┘      └────────────────────┘
```

| Component       | Technology                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Web app         | React 19, TypeScript, Vite, `vite-plugin-pwa`                                                                                      |
| Level engine    | TypeScript package (`packages/engine`), runs entirely in the browser                                                               |
| Local storage   | IndexedDB                                                                                                                          |
| Content tooling | .NET 10 console app (`tools/ContentCli`): validation and coverage checks in CI                                                     |
| Audio           | Generated at build time with an open-source TTS engine that has Norwegian voices                                                   |
| Sync            | Supabase free tier first; ASP.NET Core API on a free hosting tier later ([ADR 0004](adr/0004-dotnet-content-cli-then-sync-api.md)) |
| AI (optional)   | Browser calls the provider directly with the learner's own key; on-device speech-to-text                                           |
| CI/CD           | GitHub Actions; GitHub Pages for hosting                                                                                           |

## 12. Cost model

The app must not incur running costs ([ADR 0002](adr/0002-local-first-zero-cost.md)).

| Concern    | Approach                                 | Trade-off                                                       |
| ---------- | ---------------------------------------- | --------------------------------------------------------------- |
| Hosting    | Static files on GitHub Pages             | No server-side code in the core app                             |
| Content    | Authored and reviewed during development | Content grows only as fast as it is reviewed                    |
| Audio      | Generated once at build time             | Synthetic voice quality                                         |
| AI scoring | Learner's own API key, off by default    | Most learners will use self-assessment for writing and speaking |
| Sync       | Free tiers                               | Usage limits and inactivity pauses; local export as a fallback  |

## 13. Privacy and security

- Guest mode by default. No account is needed to learn.
- Progress stays on the device unless the learner signs in to sync.
- A learner's API key is stored only on their device and sent only to the provider they chose.
- No analytics or tracking beyond what is needed to run the app.

## 14. Milestones

| Milestone                | Scope                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| M1 Foundations           | Monorepo, CI, GitHub Pages deploy, content schema, descriptor map, .NET validator, engine v0, app shell, one offline A2 lesson |
| M2 Learning loop         | Placement check, adaptive item selection, lesson player, spaced repetition                                                     |
| M3 Reading and listening | Graded A2–B1 texts and audio with questions                                                                                    |
| M4 Native-language packs | English and French packs, onboarding                                                                                           |
| M5 Writing feedback      | Rubric scoring with the learner's key, evaluation set and results                                                              |
| M6 Release               | Coverage view, README with demo, public release                                                                                |

## 15. Risks and open questions

| Risk                                 | Mitigation                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| AI scores do not match human raters  | Keep a human-graded evaluation set and publish agreement figures; never use AI scores as the only signal |
| Content quality and volume           | Small, reviewed content set per level before expanding                                                   |
| Free tiers change or are withdrawn   | Local-first design; sync is optional and replaceable                                                     |
| Native-language notes contain errors | Review each pack with a teacher of that language before release                                          |

Open questions:

- Which open-source TTS voice gives the best bokmål quality at build time.
- How long the placement check can be before learners drop off.

## 16. References

1. [CEFR global scale](https://www.unibz.it/assets/Documents/Languages/unibz-languages-CEFR-Global-scale-EN.pdf), Council of Europe (copy hosted by unibz).
2. CEFR Companion Volume (Council of Europe, 2020), illustrative descriptor scales.
3. [Norskprøven A1–B2: about the test](https://prove.hkdir.no/norskprove-a1-b2/les-om-proven-norsk-A1-B2), HK-dir.
4. [Reading test](https://prove.hkdir.no/norskprove-a1-b2/les-om-proven-norsk-A1-B2/om-leseproven), HK-dir.
5. [Listening test](https://prove.hkdir.no/norskprove-a1-b2/les-om-proven-norsk-A1-B2/om-lytteproven), HK-dir.
6. [Writing test](https://prove.hkdir.no/norskprove-a1-b2/les-om-proven-norsk-A1-B2/om-skriveproven), HK-dir.
7. [Oral test](https://prove.hkdir.no/norskprove-a1-b2/les-om-proven-norsk-A1-B2/om-muntlig-prove), HK-dir.
8. [Test requirements for Norwegian citizenship](https://www.udi.no/ord-og-begreper/krav-om-prover-for-a-fa-norsk-statsborgerskap/), UDI.
