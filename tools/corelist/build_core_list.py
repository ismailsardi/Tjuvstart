"""Build the core vocabulary list (content/vocab/core-list.tsv).

Inputs (download them first, see README.md):
  * NB N-gram for Bokmål, unigrams by frequency (CC0), file 1gram_nob_f1_freq.frk
  * Norsk Ordbank bokmål 2005 (CC BY 4.0), files fullformsliste.txt and lemma.txt

The unigram counts are counts of word forms. Each form is credited to the
lemmas that Norsk Ordbank lists for it. When a form belongs to more than one
lemma (for example "var" from "være" and the noun "var"), its count is shared
in proportion to how often each lemma's unambiguous forms occur.
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

WORD = re.compile(r"^[a-zæøåé]+$")

# Ordbank part-of-speech tag -> card part of speech
POS = {
    "subst": "noun",
    "verb": "verb",
    "adj": "adjective",
    "adv": "adverb",
    "det": "determiner",
    "pron": "pronoun",
    "prep": "preposition",
    "konj": "conjunction",
    "sbu": "conjunction",
    "interj": "interjection",
    "i": "phrase",
}

NUMBERS = set(
    "null én to tre fire fem seks sju syv åtte ni ti elleve tolv tretten fjorten femten "
    "seksten sytten atten nitten tjue tretti førti femti seksti sytti åtti nitti hundre tusen".split()
)

# Rank cut-offs (cumulative number of lemmas) for the level tag.
LEVELS = [(700, "A1"), (1500, "A2"), (3000, "B1"), (5000, "B2")]


def read_frequencies(path: Path) -> dict[str, int]:
    counts: dict[str, int] = defaultdict(int)
    with path.open(encoding="latin-1") as f:
        for line in f:
            parts = line.split()
            if len(parts) != 2:
                continue
            # Only lower-case tokens: capitalised ones are mostly names ("Jan",
            # "Molde") or sentence starts, which say little about the word.
            form = parts[1]
            if WORD.match(form):
                counts[form] += int(parts[0])
    return counts


def read_lemma_bases(path: Path) -> dict[str, str]:
    bases = {}
    with path.open(encoding="latin-1") as f:
        next(f)
        for line in f:
            cols = line.rstrip("\r\n").split("\t")
            if len(cols) >= 3:
                bases[cols[1]] = cols[2]
    return bases


def read_ordbank(fullforms: Path, lemma_file: Path):
    """Return form -> set of lemma keys, and lemma key -> details."""
    form_lemmas: dict[str, set] = defaultdict(set)
    lemmas: dict[tuple, dict] = {}
    base_by_id = read_lemma_bases(lemma_file)
    rows = []
    with fullforms.open(encoding="latin-1") as f:
        next(f)
        for line in f:
            cols = line.rstrip("\r\n").split("\t")
            if len(cols) >= 4:
                rows.append((cols[1], cols[2], cols[3], None))
    for lemma_id, form, tag, _ in rows:
        words = tag.split()
        pos = POS.get(words[0])
        if pos is None or "prop" in words or "fork" in words:
            continue
        base = base_by_id.get(lemma_id)
        if base is None or not WORD.match(base.lower()):
            continue
        if pos == "determiner" and "kvant" in words and base.lower() in NUMBERS:
            pos = "number"
        key = (base.lower(), pos)
        entry = lemmas.setdefault(key, {"forms": set(), "genders": set()})
        lower = form.lower()
        if WORD.match(lower):
            entry["forms"].add(lower)
            form_lemmas[lower].add(key)
        if pos == "noun":
            for word, gender in (("mask", "en"), ("fem", "ei"), ("nøyt", "et")):
                if word in words:
                    entry["genders"].add(gender)
    return form_lemmas, lemmas


OPEN = {"noun", "verb", "adjective"}
CLOSED = {"preposition", "conjunction", "pronoun", "determiner", "adverb", "phrase", "interjection"}


def score(counts, form_lemmas, rounds: int = 2) -> dict[tuple, float]:
    # Initial weight of a lemma: how often its dictionary form occurs, plus the
    # forms that belong to it alone ("er" can only be "være"). When a function
    # word and a content word share a dictionary form ("i" the preposition and
    # "i" the letter, "under" and "et under" (a miracle)), the function word
    # starts far ahead.
    bases: dict[str, set] = defaultdict(set)
    for keys in form_lemmas.values():
        for key in keys:
            bases[key[0]].add(key)
    weight: dict[tuple, float] = defaultdict(lambda: 1.0)
    for base, keys in bases.items():
        closed = any(k[1] in CLOSED for k in keys)
        for key in keys:
            factor = 0.02 if closed and key[1] not in CLOSED else 1.0
            weight[key] += counts.get(base, 0) * factor
    for form, keys in form_lemmas.items():
        if len(keys) == 1:
            (key,) = keys
            if key[0] != form:
                weight[key] += counts.get(form, 0)
    totals: dict[tuple, float] = {}
    for _ in range(rounds):
        totals = defaultdict(float)
        for form, keys in form_lemmas.items():
            n = counts.get(form, 0)
            if not n:
                continue
            w = sum(weight[k] for k in keys)
            for key in keys:
                totals[key] += n * weight[key] / w
        weight = defaultdict(lambda: 1.0, {k: v + 1.0 for k, v in totals.items()})
    return totals


def homograph_noise(counts, form_lemmas, lemmas, totals, share: float = 0.05) -> set:
    """Lemmas that only rank because of a homograph. Participle adjectives
    filed under a verb's infinitive ("drepe" as an adjective) are dropped, as
    are verbs whose infinitive is also a form of a more frequent adjective
    ("hele", to heal, next to "hele", whole) and nouns whose dictionary form is
    also a form of a more frequent verb ("ligger" next to "ligge"). Such a
    lemma is dropped when its own forms, the ones the other word does not share
    ("heler", "helte"), make up less than `share` of its score. The same test
    applies to a content word that shares its dictionary form with a more
    frequent word of another class ("et spille" next to "spille")."""
    noise = set()
    for key, total in totals.items():
        base, pos = key
        if pos == "adjective" and (base, "verb") in totals:
            # participle adjectives filed under the verb's infinitive
            noise.add(key)
            continue
        if pos in OPEN:
            # same dictionary form, other word class: "spille" the noun next
            # to the verb, "neste" the verb next to the determiner
            twins = [
                (b, p) for p in OPEN | CLOSED
                if p != pos and (b := base, p) in totals and totals[(b, p)] > total
            ]
            if twins:
                shared = set().union(*(lemmas[t]["forms"] for t in twins))
                own = sum(counts.get(f, 0) for f in lemmas[key]["forms"] - shared)
                if own < share * total:
                    noise.add(key)
                    continue
        if pos == "verb":
            shadow_pos = ("adjective", "determiner", "number")
        elif pos == "noun":
            shadow_pos = ("verb",)
        else:
            continue
        shadow = [
            o for o in form_lemmas.get(base, set())
            if o[1] in shadow_pos and o[0] != base
            and (pos == "verb" or totals.get(o, 0) > total)
            # a noun that is also the imperative ("arbeid", "håp") is a real word
            and not (pos == "noun" and o[0] == base + "e")
        ]
        if not shadow:
            continue
        shared = set().union(*(lemmas[o]["forms"] for o in shadow))
        own = sum(counts.get(f, 0) for f in lemmas[key]["forms"] - shared)
        if own < share * total:
            noise.add(key)
    return noise


def gender_of(genders: set) -> str:
    if "et" in genders:
        return "et" if genders == {"et"} else "en" if "en" in genders else "et"
    if "ei" in genders:
        return "ei"
    return "en"


def level_for(rank: int) -> str:
    for cutoff, level in LEVELS:
        if rank <= cutoff:
            return level
    return ""


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("frequencies", type=Path, help="1gram_nob_f1_freq.frk")
    parser.add_argument("fullforms", type=Path, help="Norsk Ordbank fullformsliste.txt")
    parser.add_argument("lemmas", type=Path, help="Norsk Ordbank lemma.txt")
    parser.add_argument("--size", type=int, default=5000)
    parser.add_argument("--exclude", type=Path, default=Path(__file__).with_name("exclude.txt"))
    parser.add_argument("--out", type=Path, default=Path("content/vocab/core-list.tsv"))
    args = parser.parse_args(argv)

    exclude, keep = set(), set()
    if args.exclude.exists():
        for line in args.exclude.read_text(encoding="utf-8").splitlines():
            line = line.split("#", 1)[0].strip()
            if line.startswith("+"):
                keep.add(tuple(line[1:].split("\t")))
            elif line:
                exclude.add(tuple(line.split("\t")) if "\t" in line else line)

    counts = read_frequencies(args.frequencies)
    form_lemmas, lemmas = read_ordbank(args.fullforms, args.lemmas)
    totals = score(counts, form_lemmas)
    shadowed = homograph_noise(counts, form_lemmas, lemmas, totals) - keep
    total_tokens = sum(counts.values())

    ranked = sorted(totals.items(), key=lambda kv: (-kv[1], kv[0]))
    rows = []
    for (base, pos), n in ranked:
        if len(rows) >= args.size:
            break
        if base in exclude or (base, pos) in exclude or (base, pos) in shadowed:
            continue
        if len(base) == 1 and base not in {"i", "å", "ø"}:
            continue
        rank = len(rows) + 1
        gender = gender_of(lemmas[(base, pos)]["genders"]) if pos == "noun" else ""
        per_million = n * 1_000_000 / total_tokens
        rows.append(f"{rank}\t{base}\t{pos}\t{gender}\t{per_million:.1f}\t{level_for(rank)}")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8", newline="\n") as f:
        f.write("rank\tlemma\tpos\tgender\tper_million\tlevel\n")
        f.write("\n".join(rows) + "\n")
    print(f"wrote {len(rows)} lemmas to {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
