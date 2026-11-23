import io
import json
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

from generate_audio import azure_recorder, azure_ssml, generate, voice_tag


class GenerateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.out = Path(self.tmp.name)
        self.spoken = []

    def tearDown(self):
        self.tmp.cleanup()

    def run_generate(self, entries):
        def make_recorder():
            def record(text, mp3_path):
                self.spoken.append(text)
                mp3_path.write_bytes(b"mp3")

            return record

        return generate(entries, self.out, make_recorder)

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

    def test_does_not_set_up_a_voice_when_nothing_is_missing(self):
        self.run_generate([{"key": "a1", "text": "Hei!"}])

        def fail():
            raise AssertionError("voice loaded")

        self.assertEqual(generate([{"key": "a1", "text": "Hei!"}], self.out, fail), 0)


    def test_prefixes_files_with_the_voice_and_drops_other_voices(self):
        self.run_generate([{"key": "a1", "text": "Hei!"}])

        def make_recorder():
            return lambda text, path: path.write_bytes(b"new")

        generate([{"key": "a1", "text": "Hei!"}], self.out, make_recorder, tag="pernille")

        self.assertEqual(sorted(p.name for p in self.out.glob("*.mp3")), ["pernille-a1.mp3"])
        index = json.loads((self.out / "index.json").read_text(encoding="utf-8"))
        self.assertEqual(index, {"Hei!": "pernille-a1"})

    def test_voice_tags_are_url_safe(self):
        self.assertEqual(voice_tag("nb-NO-PernilleNeural"), "nb-no-pernilleneural")
        self.assertEqual(voice_tag(".voices/no_NO-talesyntese-medium.onnx"), "no-no-talesyntese-medium")


class AzureTests(unittest.TestCase):
    def test_ssml_is_norwegian_and_escaped(self):
        ssml = azure_ssml("Ost & kjeks <3", "nb-NO-PernilleNeural")
        self.assertIn("xml:lang='nb-NO'", ssml)
        self.assertIn("<voice name='nb-NO-PernilleNeural'>Ost &amp; kjeks &lt;3</voice>", ssml)

    def test_posts_ssml_with_the_key_and_writes_the_mp3(self):
        calls = []

        def urlopen(request, timeout):
            calls.append(request)
            return io.BytesIO(b"ID3audio")

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "a.mp3"
            azure_recorder("secret", "westeurope", urlopen=urlopen)("Hei!", path)
            self.assertEqual(path.read_bytes(), b"ID3audio")

        request = calls[0]
        self.assertEqual(request.full_url, "https://westeurope.tts.speech.microsoft.com/cognitiveservices/v1")
        self.assertEqual(request.get_header("Ocp-apim-subscription-key"), "secret")
        self.assertEqual(request.get_header("X-microsoft-outputformat"), "audio-24khz-48kbitrate-mono-mp3")
        self.assertIn(b"Hei!", request.data)

    def test_retries_when_rate_limited(self):
        attempts = []

        def urlopen(request, timeout):
            attempts.append(1)
            if len(attempts) < 3:
                raise urllib.error.HTTPError(request.full_url, 429, "Too Many Requests", {}, None)
            return io.BytesIO(b"ok")

        with tempfile.TemporaryDirectory() as tmp, mock.patch("generate_audio.time.sleep"):
            azure_recorder("k", "westeurope", urlopen=urlopen)("Hei!", Path(tmp) / "a.mp3")
        self.assertEqual(len(attempts), 3)


if __name__ == "__main__":
    unittest.main()
