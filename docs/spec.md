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
2. **Placement.** A five-minute check asks five questions per skill that has exercises (reading, listening and writing today). Each question is picked near the current estimate (50% expected success, so every answer says as much as possible) and moves the rating with a larger step than normal practice. The result is saved as the starting estimate.
3. **Continuous estimate.** Each answer updates a per-skill Elo-style rating: a correct answer on a hard item raises the rating more than one on an easy item (see [ADR 0003](adr/0003-elo-rating-before-irt.md)).
4. **Item selection.** The next item is chosen so the expected success rate is about 80%.
5. **Open answers.** With AI enabled, writing and speaking are scored against a CEFR-based rubric and the score feeds into the same rating. Without AI, learners self-assess against a model answer and a checklist, and the level for that skill is marked as self-assessed.
6. **Recalibration.** A periodic short practice exam checks the estimate against exam-style tasks.

### 7.4 Error memory and practice sessions

Exercises are tagged with the grammar points they test (V2 word order, noun gender, the place of _ikke_, and so on). Every wrong answer adds 2 to that point's score and every right answer takes 1 away, never below 0. A point with a score of 2 or more counts as a recurring mistake: it shows on the Today and Me pages, and it keeps coming back until enough right answers bring the score down again.

A practice session has eight exercises. Up to half target recurring mistakes, starting with the exercises the learner got wrong last time. The rest comes from the weakest skill, at the usual 80% target. Exercises answered correctly in the last 24 hours are left out.

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

## 10. Word cards and lesson progress

### 10.1 Word cards

The Words menu holds one card per word the learner needs for each level. A card shows:

- the Norwegian word with its article or infinitive marker (_en jobb_, _å jobbe_) and an example sentence from a work or everyday situation;
- the meaning in the learner's language;
- a short memory hook in the learner's language where one helps: a cognate, a false-friend warning, a picture to imagine or a word-building tip;
- audio of the word and the example, with a button to play it.

Cards are grouped by CEFR level and topic. The learner can browse them, and cards they have studied enter spaced repetition: a short daily review brings each card back just before it is likely to be forgotten. Words met in a lesson are added to the learner's deck when the lesson is finished.

The target is full coverage of the vocabulary each level needs. Two checks in the content CLI keep this measurable:

- every word in a lesson text should have a card (names and other listed exceptions aside), and the coverage report lists the words that do not;
- every card needs a meaning in every native-language pack, so a card is never shown half-empty.

The level word lists will come from an openly licensed frequency source, checked against the adult immigrant curriculum ([ADR 0006](adr/0006-vocabulary-sourcing.md)).

### 10.2 Lesson progress

A lesson is marked as completed when the learner reaches its end. The lesson list shows completed lessons with the best score, and the learner can redo any lesson.

### 10.3 Audio and shadowing

Every lesson sentence and every word card has audio, recorded once at build time with a neural Norwegian voice ([ADR 0007](adr/0007-piper-audio-at-build-time.md), [ADR 0009](adr/0009-neural-voice-for-audio.md)). Lesson texts have a button that reads the whole text, and word cards read the word on the front and the example on the back.

Shadowing trains pronunciation and listening together. The learner goes through a lesson text one sentence at a time:

1. hear the sentence, at normal speed or slower (75%, pitch kept);
2. say it out loud, at the same time as the model or right after;
3. record themselves and play back their own version, or play the model and their version one after the other to compare;
4. judge it: _sounded close_ moves on, _try again_ stays on the sentence.

The text can be hidden to practise by ear. Recordings stay in the page's memory and are never stored or uploaded; only the learner's verdict is saved, so the profile can show how many sentences they have said out loud. Speaking is not rated from these self-judgements: an estimate for speaking needs scored answers (with AI, step 7).

### 10.4 First weeks in Norway

A guided track follows the situations a newcomer meets first, in the order they usually come: the first workday, the tax card (_skattekort_), BankID, renting a flat, booking the doctor (_fastlege_) and small talk at lunch. Each scenario is an ordinary lesson with a text, exercises and word cards, so it feeds the level estimate, the error memory and the word review like any other lesson.

Today shows the track as numbered steps with the learner's progress, and suggests the next scenario as the next lesson. The Lessons tab shows the track first and the other lessons below it. Tracks live in `content/tracks.json` and the content CLI checks that every lesson they list exists. Facts in the scenarios (who issues ID numbers, the 50% tax without a tax card, the 113 and 116 117 numbers) are kept general and checked against public sources, since the texts teach real procedures.

### 10.5 Listening and dictation

Every lesson has listening exercises next to its reading and writing ones:

- **Listening questions:** a short voicemail, announcement or remark from the lesson's situation, with a question about it. The text is not shown until the learner has answered; then the transcript appears, so they can connect what they heard with the words.
- **Dictation:** the learner hears one sentence and types it. Case and punctuation do not count. After a wrong answer the sentence is shown with the missed or misspelled words marked.

Audio starts a little slower than natural speech (85%) and speeds up as the learner shows they can follow it: three right listening answers in a row move one step up, a wrong answer moves one step down, between 75% and 130%. A _slower_ replay is always there. Listening answers update the listening rating like any other skill, so the level check now covers reading, listening and writing (five questions each), and a listening practice session on Today mixes listening items from all lessons.

### 10.6 Real-world texts and my job

Learners in Norway read official letters and ads long before they can read a newspaper. A second track, _Ekte tekster_, has four texts written in the shape of real ones and simplified to A2: a letter from NAV about the _meldekort_, a used bike on Finn.no, a job ad and a _dugnad_ notice from the housing co-op. The lesson player shows them as documents, with a "real-world text, simplified to A2" label, the kind of document and who sent it. Exercises ask what readers of the real thing need to find: the deadline, the price, what to bring, who to call. The lesson schema has an optional `document` field (`kind` and `from`) for this.

Today shows only the track in progress, so the first-weeks track comes first and the real-texts track takes over when it is done. Every track is on the Lessons tab.

_My job_ adds a deck of twelve A2 words for the learner's line of work: IT, health and care, construction, or hotels and restaurants. The learner picks a field once on the Words tab, which then shows that deck at the top and hides the others; the choice is saved in the profile and can be changed on Words or from Me. Job decks use the optional `field` property of the deck schema.

### 10.7 Daily session, streak and can-do statements

**Ten minutes a day.** Today offers one session that takes about ten minutes: up to ten due word cards, then eight exercises picked the same way as a practice session (weak skills and recurring mistakes first). A learner with no cards due goes straight to the exercises.

**A forgiving streak.** A day counts once the learner has done eight things: answers, card reviews or shadowed sentences, wherever they did them. Missing one day does not break the streak; missing two in a row does. Only days with practice are counted, so a rest day keeps the streak without growing it. When yesterday was missed, Today says so once, without guilt, so the learner knows today matters. Days are counted in the learner's own time zone. The rule lives in the engine (`currentStreak`) and the counts come from the attempts, reviews and shadowing tables, so no new storage is needed.

**Can-do statements.** Every exercise is already tagged with CEFR descriptors. Me lists the descriptors that some exercise checks, grouped by level and skill, written in the first person in the learner's language ("I can find what I need in notices, timetables, menus and ads"). A statement is ticked once the learner has answered at least three different exercises for it and at least 80% of their latest answers are right; only the latest answer to each exercise counts. The end of the daily session shows any statement it just ticked. Speaking descriptors stay out of the list until there are exercises that check speaking. Packs hold the statements under `canDo`, and the content CLI rejects statements for unknown descriptors.

### 10.8 AI practice with the learner's own key

AI practice is optional and off until the learner adds an Anthropic API key on Me ([ADR 0008](adr/0008-ai-with-the-learners-own-key.md)). It has three parts:

- **Role-play.** A typed conversation in a situation from the first weeks: the first workday, calling the GP office, a flat viewing, returning something in a shop. The partner stays in role, keeps replies to a few sentences at the learner's level, and under each learner message shows a corrected sentence with a one-line reason when something important was wrong.
- **Writing feedback.** Four Norskprøven-style tasks at A2 and B1 (an email to the boss when sick, a note to the housing board, a text about your job, a reply to a Finn.no ad). The learner gets a CEFR level, a 1 to 5 score for task, structure, vocabulary and grammar, up to six corrections with explanations in their language, and their text rewritten one level up.
- **New reading texts.** A short text on a chosen topic, written at the learner's reading level, with four multiple-choice questions. It plays in the normal lesson player but changes no ratings and marks nothing completed.

Every request carries the estimated level, the interface language for explanations, the learner's line of work and their recurring grammar mistakes, and asks for JSON that matches a schema. AI scores are feedback only and do not move the ratings until they have been compared with human raters.

## 11. Features and priorities

| Feature                      | Description                                                                                             | Release |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | ------- |
| Placement and level estimate | Per-skill placement check and continuous rating                                                         | MVP     |
| Lesson player                | Short lessons: explanation, examples, then exercises (gap fill, multiple choice, word order, dictation) | MVP     |
| Word cards                   | Cards per level with meaning, example and memory hook in the learner's language                         | MVP     |
| Spaced repetition            | Daily review of studied cards, SM-2-style first, FSRS later ([ADR 0005](adr/0005-sm2-before-fsrs.md))   | MVP     |
| Lesson progress              | Completed lessons and best scores shown in the lesson list                                              | MVP     |
| Reading and listening        | Graded texts and audio with comprehension questions                                                     | MVP     |
| Native-language packs        | English and French                                                                                      | MVP     |
| Coverage view                | Proven and weak descriptors per skill                                                                   | MVP     |
| Writing feedback             | Rubric-based feedback with the learner's own API key (step 7); self-assessment otherwise                | MVP     |
| Arabic pack                  | Including a right-to-left interface                                                                     | v2      |
| Speaking practice            | Recording, on-device speech-to-text, rubric feedback                                                    | v2      |
| Conversation practice        | Typed role-play of work-life scenarios with an AI partner (step 7); spoken role-play in v2              | MVP     |
| Practice exam                | Timed, Norskprøven-style, across all four parts                                                         | v2      |
| Sync API                     | ASP.NET Core API for account sync                                                                       | v2      |
| Dialect listening            | The same sentences recorded in several regional dialects                                                | v3      |

## 12. Architecture

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

| Component       | Technology                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web app         | React 19, TypeScript, Vite, `vite-plugin-pwa`                                                                                                         |
| Level engine    | TypeScript package (`packages/engine`), runs entirely in the browser                                                                                  |
| Local storage   | IndexedDB                                                                                                                                             |
| Content tooling | .NET 10 console app (`tools/ContentCli`): validation and coverage checks in CI                                                                        |
| Audio           | Recorded at build time with Azure neural voice `nb-NO-PernilleNeural` (free tier), Piper as fallback ([ADR 0009](adr/0009-neural-voice-for-audio.md)) |
| Sync            | Supabase free tier first; ASP.NET Core API on a free hosting tier later ([ADR 0004](adr/0004-dotnet-content-cli-then-sync-api.md))                    |
| AI (optional)   | Browser calls the provider directly with the learner's own key; on-device speech-to-text                                                              |
| CI/CD           | GitHub Actions; GitHub Pages for hosting                                                                                                              |

## 13. Cost model

The app must not incur running costs ([ADR 0002](adr/0002-local-first-zero-cost.md)).

| Concern    | Approach                                 | Trade-off                                                       |
| ---------- | ---------------------------------------- | --------------------------------------------------------------- |
| Hosting    | Static files on GitHub Pages             | No server-side code in the core app                             |
| Content    | Authored and reviewed during development | Content grows only as fast as it is reviewed                    |
| Audio      | Generated once at build time             | Synthetic voice quality                                         |
| AI scoring | Learner's own API key, off by default    | Most learners will use self-assessment for writing and speaking |
| Sync       | Free tiers                               | Usage limits and inactivity pauses; local export as a fallback  |

## 14. Privacy and security

- Guest mode by default. No account is needed to learn.
- Progress stays on the device unless the learner signs in to sync.
- A learner's API key is stored only on their device and sent only to the provider they chose.
- No analytics or tracking beyond what is needed to run the app.

## 15. Milestones

| Milestone                | Scope                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| M1 Foundations           | Monorepo, CI, GitHub Pages deploy, content schema, descriptor map, .NET validator, engine v0, app shell, one offline A2 lesson |
| M2 Learning loop         | Placement check, adaptive item selection, lesson player, spaced repetition                                                     |
| M3 Reading and listening | Graded A2–B1 texts and audio with questions                                                                                    |
| M4 Native-language packs | English and French packs, onboarding                                                                                           |
| M5 Writing feedback      | Rubric scoring with the learner's key, evaluation set and results                                                              |
| M6 Release               | Coverage view, README with demo, public release                                                                                |

### 15.1 Roadmap

After the first milestones, features are built in this order, one pull request each:

| Step | Feature                     | Scope                                                                                                                                        |
| ---- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Adaptive engine             | Five-minute placement check, practice sessions built from weak skills, and an error memory that recycles repeated mistakes (V2, en/ei/et, …) |
| 2    | Shadowing and audio         | Build-time TTS audio for texts and cards (Piper), then hear, record and compare in the browser; fills the listening gap                      |
| 3    | First weeks in Norway       | Scenario track: BankID, tax card, renting, the doctor, the first workday, small talk at lunch                                                |
| 4    | Listening and dictation     | Listening at increasing speed, and dictation exercises                                                                                       |
| 5    | Real-world texts            | Authentic-style texts simplified to level (a NAV letter, a Finn.no ad), and a "my job" vocabulary mode                                       |
| 6    | Daily habit                 | Ten-minute daily sessions, "can do" progress statements and a forgiving streak                                                               |
| 7    | Optional AI (learner's key) | Role-play conversations, Norskprøven-style essay feedback and generated practice texts                                                       |

## 16. Risks and open questions

| Risk                                 | Mitigation                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| AI scores do not match human raters  | Keep a human-graded evaluation set and publish agreement figures; never use AI scores as the only signal |
| Content quality and volume           | Small, reviewed content set per level before expanding                                                   |
| Free tiers change or are withdrawn   | Local-first design; sync is optional and replaceable                                                     |
| Native-language notes contain errors | Review each pack with a teacher of that language before release                                          |
| Word list licence restricts reuse    | Use only sources whose licence allows redistribution; record the source and licence in the repository    |

Open questions:

- How long the placement check can be before learners drop off.
- Which openly licensed frequency list to build the level word lists from.

## 17. References

1. [CEFR global scale](https://www.unibz.it/assets/Documents/Languages/unibz-languages-CEFR-Global-scale-EN.pdf), Council of Europe (copy hosted by unibz).
2. CEFR Companion Volume (Council of Europe, 2020), illustrative descriptor scales.
3. [Norskprøven A1–B2: about the test](https://prove.hkdir.no/norskprove-a1-b2/les-om-proven-norsk-A1-B2), HK-dir.
4. [Reading test](https://prove.hkdir.no/norskprove-a1-b2/les-om-proven-norsk-A1-B2/om-leseproven), HK-dir.
5. [Listening test](https://prove.hkdir.no/norskprove-a1-b2/les-om-proven-norsk-A1-B2/om-lytteproven), HK-dir.
6. [Writing test](https://prove.hkdir.no/norskprove-a1-b2/les-om-proven-norsk-A1-B2/om-skriveproven), HK-dir.
7. [Oral test](https://prove.hkdir.no/norskprove-a1-b2/les-om-proven-norsk-A1-B2/om-muntlig-prove), HK-dir.
8. [Test requirements for Norwegian citizenship](https://www.udi.no/ord-og-begreper/krav-om-prover-for-a-fa-norsk-statsborgerskap/), UDI.
