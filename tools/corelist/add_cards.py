"""Add word cards from a batch file to content/vocab and the language packs.

A batch file is plain text written by hand:

    @ A2 | business | Arbeidslivet
    selskap|noun|Hun jobber i et stort selskap.|company|société|Firma|empresa

A line starting with "@" opens a deck (level, topic, Norwegian title). Each card
line gives the dictionary form, part of speech, an example sentence and the
meaning in English, French, German and Spanish. Inflected forms and noun gender
come from Norsk Ordbank, so they are never typed by hand: infinitive, present,
past and participle for verbs (no imperative or passive), every inflection for
nouns and adjectives. When Ordbank has two words with the same spelling ("et
fly", a plane, and "ei fly", a bog), the one whose own forms are more frequent
in the N-gram counts is used. Lines starting with "#" are comments.

New decks are marked "review": "pending". Run prettier on content/ afterwards.
"""

from __future__ import annotations

import argparse
import json
import sys
import unicodedata
from pathlib import Path

from build_core_list import POS, WORD, read_frequencies, read_lemma_bases

LANGUAGES = ("en", "fr", "de", "es")
ROOT = Path(__file__).resolve().parents[2]


def slug(word: str) -> str:
    table = str.maketrans({"æ": "ae", "ø": "o", "å": "a", "é": "e", " ": "-"})
    text = unicodedata.normalize("NFC", word.lower()).translate(table)
    return "".join(ch for ch in text if ch.isalnum() or ch == "-")


def parse(path: Path):
    decks, current = [], None
    for number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("@"):
            level, topic, title = (part.strip() for part in line[1:].split("|"))
            current = {"level": level, "topic": topic, "title": title, "cards": []}
            decks.append(current)
            continue
        parts = [part.strip() for part in line.split("|")]
        if current is None or len(parts) != 3 + len(LANGUAGES):
            raise SystemExit(f"{path}:{number}: expected lemma|pos|example|{'|'.join(LANGUAGES)}")
        nb, pos, example, *meanings = parts
        current["cards"].append({"nb": nb, "pos": pos, "example": example, "meanings": dict(zip(LANGUAGES, meanings))})
    return decks


def ordered_forms(nb: str, forms: set[str]) -> list[str]:
    # dictionary form first, then by length and alphabet, like the hand-written cards
    rest = sorted(forms - {nb}, key=lambda f: (len(f), f))
    return [nb, *rest]


VERB_FORMS = {"inf", "pres", "pret", "perf-part"}


def keep_form(pos: str, tag: list[str]) -> bool:
    if pos != "verb":
        return True
    # the grammatical part of the tag ends where valency codes ("<trans1>") begin
    grammar = [t for t in tag[1:] if not t.startswith("<") and t != "normert"]
    return len(grammar) == 1 and grammar[0] in VERB_FORMS


def read_entries(fullforms: Path, lemma_file: Path) -> dict[tuple, list[dict]]:
    """(dictionary form, part of speech) -> one entry per Ordbank lemma id."""
    bases = read_lemma_bases(lemma_file)
    by_id: dict[tuple, dict] = {}
    with fullforms.open(encoding="latin-1") as f:
        next(f)
        for line in f:
            cols = line.rstrip("\r\n").split("\t")
            if len(cols) < 4:
                continue
            lemma_id, form, tag = cols[1], cols[2].lower(), cols[3].split()
            pos = POS.get(tag[0])
            if pos is None or "prop" in tag or lemma_id not in bases:
                continue
            # a verb's participle adjectives share its lemma id; keep them apart
            entry = by_id.setdefault(
                (lemma_id, pos), {"base": bases[lemma_id].lower(), "pos": pos, "forms": set(), "all": set(), "genders": set()}
            )
            if WORD.match(form):
                entry["all"].add(form)
                if keep_form(pos, tag):
                    entry["forms"].add(form)
            if pos == "noun":
                for word, gender in (("mask", "en"), ("fem", "ei"), ("nøyt", "et")):
                    if word in tag:
                        entry["genders"].add(gender)
    entries: dict[tuple, list[dict]] = {}
    for entry in by_id.values():
        entries.setdefault((entry["base"], entry["pos"]), []).append(entry)
    return entries


def pick(candidates: list[dict], counts: dict[str, int]) -> dict:
    """The homograph whose forms occur most often in the N-gram counts."""
    return max(candidates, key=lambda e: (sum(counts.get(f, 0) for f in e["forms"]), len(e["forms"])))


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("batch", type=Path)
    parser.add_argument("frequencies", type=Path, help="NB N-gram 1gram_nob_f1_freq.frk")
    parser.add_argument("fullforms", type=Path, help="Norsk Ordbank fullformsliste.txt")
    parser.add_argument("lemmas", type=Path, help="Norsk Ordbank lemma.txt")
    parser.add_argument("--content", type=Path, default=ROOT / "content")
    args = parser.parse_args(argv)

    entries = read_entries(args.fullforms, args.lemmas)
    counts = read_frequencies(args.frequencies)
    by_base: dict[str, list] = {}
    for (base, _), group in entries.items():
        by_base.setdefault(base, []).extend(group)

    vocab = args.content / "vocab"
    existing_ids, existing_words, headwords = set(), set(), set()
    for deck_file in vocab.glob("*/*.json"):
        for card in json.loads(deck_file.read_text(encoding="utf-8"))["cards"]:
            existing_ids.add(card["id"])
            existing_words.add((card["nb"], card["pos"]))
            headwords.add(card["nb"])
    batch = parse(args.batch)
    headwords |= {card["nb"] for deck in batch for card in deck["cards"]}

    packs = {lang: args.content / "l1" / lang / "pack.json" for lang in LANGUAGES}
    pack_data = {lang: json.loads(p.read_text(encoding="utf-8")) for lang, p in packs.items()}

    problems, added = [], 0
    for deck in batch:
        path = vocab / deck["level"].lower() / f"{deck['topic']}.json"
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
        else:
            data = {
                "$schema": "../../schema/vocab-deck.schema.json",
                "level": deck["level"],
                "topic": deck["topic"],
                "title": deck["title"],
                "review": "pending",
                "cards": [],
            }
        for card in deck["cards"]:
            nb, pos = card["nb"], card["pos"]
            if (nb, pos) in existing_words:
                problems.append(f"{nb} ({pos}) already has a card")
                continue
            if (nb, pos) in entries:
                entry = pick(entries[(nb, pos)], counts)
                forms = entry["forms"] | {nb}
            elif nb in by_base:
                # Ordbank files some words under another class ("faktisk" as an
                # adjective); such cards keep the dictionary form only
                entry, forms = None, {nb}
            else:
                problems.append(f"{nb} ({pos}) is not in Norsk Ordbank")
                continue
            card_id = slug(nb)
            if card_id in existing_ids:
                card_id = f"{card_id}-{pos}"
            if card_id in existing_ids:
                problems.append(f"{nb} ({pos}): id {card_id} is taken")
                continue
            out = {"id": card_id, "nb": nb, "pos": pos}
            if pos == "noun":
                genders = entry["genders"] if entry else {"en"}
                out["gender"] = "ei" if "ei" in genders else "et" if genders == {"et"} else "en"
            # a rare form that is another card's headword would link the wrong
            # card in lesson texts: "lett" is the adjective, not a past of "lete"
            forms = {f for f in forms if f == nb or f not in headwords}
            out["forms"] = ordered_forms(nb, forms)
            out["example"] = card["example"]
            data["cards"].append(out)
            for lang in LANGUAGES:
                pack_data[lang]["words"][card_id] = {"meaning": card["meanings"][lang]}
            existing_ids.add(card_id)
            existing_words.add((nb, pos))
            added += 1
        if data["cards"]:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for lang, p in packs.items():
        p.write_text(json.dumps(pack_data[lang], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for problem in problems:
        print(f"skipped: {problem}", file=sys.stderr)
    print(f"added {added} cards", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
