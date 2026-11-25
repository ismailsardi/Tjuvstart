import tempfile
import unittest
from pathlib import Path

import add_cards
import build_core_list as core

HEADER = "LOEPENR\tLEMMA_ID\tOPPSLAG\tTAG\tPARADIGME_ID\tBOY_NUMMER\tFRADATO\tTILDATO\tNORMERING\n"

# A tiny Norsk Ordbank: "være" (er, var), the rare noun "et var", the
# adjective "hel" (hele) and the verb "hele" (to heal), the preposition "i" and
# the letter "i", and two nouns "fly" (a plane, and a bog).
FULLFORMS = [
    ("1", "være", "verb inf normert"),
    ("1", "er", "verb pres normert"),
    ("1", "var", "verb pret normert"),
    ("2", "var", "subst nøyt appell ent ub normert"),
    ("2", "varet", "subst nøyt appell ent be normert"),
    ("3", "hel", "adj pos m/f ub ent normert"),
    ("3", "hele", "adj pos fl normert"),
    ("4", "hele", "verb inf normert"),
    ("4", "heler", "verb pres normert"),
    ("4", "hel", "verb imp normert"),
    ("4", "helende", "adj <pres-part> normert"),
    ("5", "i", "prep normert"),
    ("6", "i", "subst mask appell ent ub normert"),
    ("6", "ien", "subst mask appell ent be normert"),
    ("7", "fly", "subst nøyt appell ent ub normert"),
    ("7", "flyet", "subst nøyt appell ent be normert"),
    ("8", "fly", "subst fem appell ent ub normert"),
    ("8", "flya", "subst fem appell ent be normert"),
]
LEMMAS = {"1": "være", "2": "var", "3": "hel", "4": "hele", "5": "i", "6": "i", "7": "fly", "8": "fly"}
COUNTS = {"er": 900, "var": 800, "være": 300, "hele": 500, "hel": 50, "heler": 1, "i": 2000, "fly": 100, "flyet": 60, "flya": 1, "Oslo": 50}


class CoreListTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.fullforms = root / "fullformsliste.txt"
        rows = [f"{n}\t{lid}\t{form}\t{tag}\t000\t1\t1996\t4000\tnormert\n" for n, (lid, form, tag) in enumerate(FULLFORMS, 1)]
        self.fullforms.write_text(HEADER + "".join(rows), encoding="latin-1")
        self.lemmas = root / "lemma.txt"
        self.lemmas.write_text(
            "LOEPENR\tLEMMA_ID\tGRUNNFORM\t'BM_ORDBOK'\n"
            + "".join(f"{n}\t{lid}\t{base}\tBM_ORDBOK\n" for n, (lid, base) in enumerate(LEMMAS.items(), 1)),
            encoding="latin-1",
        )
        self.frequencies = root / "1gram.frk"
        self.frequencies.write_text("".join(f" {n} {w}\n" for w, n in COUNTS.items()), encoding="latin-1")

    def tearDown(self):
        self.tmp.cleanup()

    def ranked(self):
        counts = core.read_frequencies(self.frequencies)
        form_lemmas, lemmas = core.read_ordbank(self.fullforms, self.lemmas)
        totals = core.score(counts, form_lemmas)
        noise = core.homograph_noise(counts, form_lemmas, lemmas, totals)
        return counts, totals, noise

    def test_capitalised_tokens_are_not_counted(self):
        self.assertNotIn("oslo", core.read_frequencies(self.frequencies))

    def test_ambiguous_forms_go_mostly_to_the_frequent_lemma(self):
        _, totals, _ = self.ranked()
        self.assertGreater(totals[("være", "verb")], 10 * totals[("var", "noun")])

    def test_function_word_beats_content_word_with_the_same_spelling(self):
        _, totals, _ = self.ranked()
        self.assertGreater(totals[("i", "preposition")], 10 * totals[("i", "noun")])

    def test_verb_riding_on_an_adjective_form_is_noise(self):
        _, _, noise = self.ranked()
        self.assertIn(("hele", "verb"), noise)
        self.assertNotIn(("hel", "adjective"), noise)

    def test_card_forms_skip_imperative_and_participle_adjectives(self):
        entries = add_cards.read_entries(self.fullforms, self.lemmas)
        (verb,) = entries[("hele", "verb")]
        self.assertEqual({"hele", "heler"}, verb["forms"])

    def test_the_more_frequent_homograph_is_picked(self):
        entries = add_cards.read_entries(self.fullforms, self.lemmas)
        chosen = add_cards.pick(entries[("fly", "noun")], COUNTS)
        self.assertEqual({"et"}, chosen["genders"])

    def test_slug(self):
        self.assertEqual("kjokken", add_cards.slug("kjøkken"))
        self.assertEqual("saerlig", add_cards.slug("særlig"))
        self.assertEqual("pa-forhand", add_cards.slug("på forhånd"))


if __name__ == "__main__":
    unittest.main()
