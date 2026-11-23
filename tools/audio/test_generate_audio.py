import json
import tempfile
import unittest
from pathlib import Path

from generate_audio import generate


class GenerateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.out = Path(self.tmp.name)
        self.spoken = []

    def tearDown(self):
        self.tmp.cleanup()

    def run_generate(self, entries):
        def synth(_voice, text, wav_path):
            self.spoken.append(text)
            wav_path.write_bytes(b"wav")

        def encode(wav_path, mp3_path):
            mp3_path.write_bytes(wav_path.read_bytes())

        return generate(entries, self.out, make_voice=lambda: object(), synth=synth, encode=encode)

    def test_creates_missing_files_and_an_index(self):
        created = self.run_generate([{"key": "a1", "text": "Hei!"}, {"key": "b2", "text": "Takk."}])

        self.assertEqual(created, 2)
        self.assertTrue((self.out / "a1.mp3").exists())
        index = json.loads((self.out / "index.json").read_text(encoding="utf-8"))
        self.assertEqual(index, {"Hei!": "a1", "Takk.": "b2"})

    def test_keeps_cached_files_and_removes_stale_ones(self):
        self.run_generate([{"key": "a1", "text": "Hei!"}, {"key": "old", "text": "Ha det."}])
        self.spoken.clear()

        created = self.run_generate([{"key": "a1", "text": "Hei!"}, {"key": "c3", "text": "Skål!"}])

        self.assertEqual(created, 1)
        self.assertEqual(self.spoken, ["Skål!"])
        self.assertFalse((self.out / "old.mp3").exists())

    def test_does_not_load_the_voice_when_nothing_is_missing(self):
        self.run_generate([{"key": "a1", "text": "Hei!"}])

        def fail():
            raise AssertionError("voice loaded")

        self.assertEqual(generate([{"key": "a1", "text": "Hei!"}], self.out, make_voice=fail), 0)


if __name__ == "__main__":
    unittest.main()
