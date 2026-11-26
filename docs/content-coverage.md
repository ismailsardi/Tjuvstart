# Content coverage map

What a learner moving to Oslo for work needs to handle in Norwegian, level by level, and which lessons cover it. It is the plan for writing lessons: a row marked **gap** is the next thing to write.

The map has three parts:

1. **Situations**: the practical situations of the first year in Norway, grouped by area of life.
2. **Grammar**: the grammar points expected at each level, with the `focus` tag that items use to practise them.
3. **Can-do statements**: the CEFR descriptors in [`content/descriptors.json`](../content/descriptors.json), with what is still thin.

Levels follow the CEFR. The situations come from the learner profile in the [spec](spec.md) (adults starting at advanced A1 or A2, working in Oslo) and from the public-service and workplace texts a newcomer actually receives. They are not copied from any textbook or exam syllabus.

The live numbers (items per descriptor, missing word cards, lessons waiting for review) come from the content CLI and are published in every CI run:

```bash
dotnet run --project tools/ContentCli/src/Tjuvstart.ContentCli -- coverage content
```

## 1. Situations

### Work

| Situation                                                     | Level | Lessons                | Status  |
| ------------------------------------------------------------- | ----- | ---------------------- | ------- |
| First day, meeting colleagues                                 | A2    | `a2-first-day-at-work` | covered |
| Lunch and small talk                                          | A2    | `a2-lunch-small-talk`  | covered |
| Calling in sick                                               | A2    | `a2-calling-in-sick`   | covered |
| Short written messages to colleagues (chat, Teams)            | A2    | `a2-work-chat`         | covered |
| Describing a colleague                                        | A2    | `a2-new-colleague`     | covered |
| Reading a job ad                                              | A2    | `a2-job-ad`            | covered |
| Job interview                                                 | A2    | `a2-job-interview`     | covered |
| Work contract: trial period, notice, hours, overtime          | B1    | `b1-work-contract`     | covered |
| Payslip, tax deduction, holiday pay                           | B1    | `b1-payslip`           | covered |
| Meeting minutes                                               | B1    | `b1-team-meeting`      | covered |
| Giving and defending an opinion in a meeting                  | B1    | `b1-opinion`           | covered |
| Yearly appraisal                                              | B1    | `b1-appraisal`         | covered |
| Health and safety rules (HMS), fire drill, reporting injuries | B1    | `b1-safety`            | covered |
| Asking for holiday, out-of-office reply                       | B1    | `b1-holiday-request`   | covered |
| Handling a customer on the phone                              | B1    | `b1-customer-call`     | covered |
| Christmas party and other workplace traditions                | B1    |                        | **gap** |

### Public services and paperwork

| Situation                                            | Level | Lessons              | Status  |
| ---------------------------------------------------- | ----- | -------------------- | ------- |
| Tax card                                             | A2    | `a2-tax-card`        | covered |
| BankID                                               | A2    | `a2-bankid`          | covered |
| Letter from NAV                                      | A2    | `a2-nav-letter`      | covered |
| GP appointment                                       | A2    | `a2-doctor`          | covered |
| Pharmacy                                             | A2    | `a2-pharmacy`        | covered |
| Emergencies: 113 and the emergency clinic (legevakt) | A2    | `a2-emergency`       | covered |
| Dentist                                              | A2    |                      | **gap** |
| Reporting a move to the National Registry            | A2    |                      | **gap** |
| Kindergarten place                                   | B1    | `b1-kindergarten`    | covered |
| Tax return (skattemeldingen)                         | B1    | `b1-tax-return`      | covered |
| Parent meeting at school                             | B1    | `b1-parents-meeting` | covered |
| Parental leave                                       | B1    |                      | **gap** |

### Home

| Situation                               | Level | Lessons             | Status  |
| --------------------------------------- | ----- | ------------------- | ------- |
| Renting a flat                          | A2    | `a2-renting-a-flat` | covered |
| Housing association notice, dugnad      | A2    | `a2-dugnad`         | covered |
| Sorting rubbish and recycling           | A2    | `a2-recycling`      | covered |
| Mobile and broadband subscription       | A2    |                     | **gap** |
| Writing to the landlord about a problem | B1    | `b1-landlord-email` | covered |
| A neighbour complains about noise       | B1    |                     | **gap** |

### Everyday life

| Situation                                       | Level | Lessons                     | Status  |
| ----------------------------------------------- | ----- | --------------------------- | ------- |
| Letters and sounds, saying hello, numbers, time | A1    | `from-zero` track           | covered |
| Filling in your own details on a form           | A1    | `a1-about-me`               | covered |
| Supermarket and café                            | A1    | `a1-supermarket`, `a1-cafe` | covered |
| Signs and labels in the street and shops        | A1    | `a1-signs`                  | covered |
| Tram and bus                                    | A2    | `a2-getting-around`         | covered |
| Picking up a parcel                             | A2    | `a2-parcel`                 | covered |
| Weather and clothes                             | A2    | `a2-weather`                | covered |
| Booking a haircut                               | A2    | `a2-hairdresser`            | covered |
| Buying second-hand (Finn)                       | A2    | `a2-finn-ad`                | covered |
| Restaurant, ordering with an allergy            | A2    | `a2-restaurant`             | covered |
| Complaining about a faulty product              | B1    | `b1-complaint`              | covered |

### Social life and Norwegian society

| Situation                                            | Level | Lessons                            | Status  |
| ---------------------------------------------------- | ----- | ---------------------------------- | ------- |
| Dinner invitation                                    | A2    | `a2-invitation`                    | covered |
| Telling what you did at the weekend                  | B1    | `b1-weekend`                       | covered |
| Easter and the cabin                                 | B1    | `b1-easter`                        | covered |
| 17 May, the national day                             | B1    | `b1-national-day`                  | covered |
| Outdoor life and the right to roam (allemannsretten) | B1    | `b1-right-to-roam`                 | covered |
| Following a short news item                          | B1    | `b1-news-electricity`, `b1-easter` | covered |
| Christmas traditions                                 | B1    |                                    | **gap** |

## 2. Grammar

Each item can carry `focus` tags. The app counts repeated mistakes per tag and brings those items back, and the learner sees the tags they struggle with on their profile. The counts are items with that tag.

| Grammar point                                        | Level | `focus` tag           | Items |
| ---------------------------------------------------- | ----- | --------------------- | ----: |
| Sounds and spelling (æ, ø, å, long and short vowels) | A1    | `sounds-spelling`     |    24 |
| Numbers and prices                                   | A1    | `numbers`             |    26 |
| Question words                                       | A1    | `question-words`      |     9 |
| Present tense                                        | A1–A2 | `verb-present`        |    13 |
| Verb in second place                                 | A1–B1 | `v2-word-order`       |    36 |
| Where «ikke» goes                                    | A1–B1 | `ikke-placement`      |    15 |
| Modal verb + infinitive                              | A1–A2 | `modal-verbs`         |    15 |
| Time and dates                                       | A1–B1 | `time-expressions`    |    65 |
| Fixed expressions                                    | A1–B1 | `fixed-expressions`   |    36 |
| Prepositions (i, på, til, fra)                       | A1–B1 | `prepositions`        |     8 |
| en / ei / et                                         | A2    | `noun-gender`         |     1 |
| Definite form                                        | A2    | `definite-form`       |     3 |
| Object pronouns                                      | A2    | `object-pronouns`     |     5 |
| Adjective endings (stor, stort, store, den store)    | A2    | `adjective-agreement` |     7 |
| Possessives (min, mitt, mine, sin)                   | A2–B1 | `possessives`         |     5 |
| og, men, så, fordi, derfor                           | A2–B1 | `conjunctions`        |    11 |
| Word order after at, fordi, hvis, når                | A2–B1 | `subordinate-clause`  |    18 |
| Past tense and present perfect                       | A2–B1 | `verb-past`           |    12 |
| Comparing (større, størst, så … som)                 | A2–B1 | `comparison`          |     7 |
| Reflexive verbs (seg)                                | B1    | `reflexive`           |     4 |
| Future (skal, kommer til å)                          | B1    | `future`              |     2 |
| Relative clauses with «som»                          | B1    | `relative-clause`     |     5 |
| Passive (-s, ble + participle)                       | B1    | `passive`             |    10 |

Still thin: gender and the definite form, which every lesson uses but few items test directly, and the future. These are the next grammar points to write items for.

## 3. Can-do statements

| Descriptor                            | What is thin                                                                                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1-R-02 personal letters and messages | 24 items, half as many as B1-R-01                                                                                                                                                                             |
| B1-W-02 personal emails               | 21 items                                                                                                                                                                                                      |
| A1-W-02 writing about yourself        | 11 items                                                                                                                                                                                                      |
| A1-S, A2-S, B1-S speaking             | No scored items. Speaking is practised by shadowing each lesson text (hear, repeat, record and compare). A scored speaking item needs speech recognition and is out of scope while the app runs at zero cost. |

## Rules for new lessons

- Same lesson format and item types as the rest (`multiple-choice`, `gap-fill`, `word-order`, `dictation`). Gap-fills list every answer a native speaker would accept.
- Every word in a lesson text has a word card, with a meaning in every language pack.
- New lessons are `"review": "pending"` until a native speaker has read them.
- Texts are written for this project. Real documents (contracts, letters from NAV, notices) are imitated in form, simplified to the level, and never copied.
