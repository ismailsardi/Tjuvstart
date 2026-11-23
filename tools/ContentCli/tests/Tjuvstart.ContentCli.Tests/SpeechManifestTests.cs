namespace Tjuvstart.ContentCli.Tests;

public sealed class SpeechManifestTests : IDisposable
{
    private readonly ContentFixture _content = new();

    public void Dispose() => _content.Dispose();

    [Fact]
    public void Splits_sentences_but_not_dates_or_times()
    {
        var sentences = SpeechManifest.Sentences(
            "Fra mandag 3. mars går ikke trikken. Ta buss 31T!  Har du spørsmål?\nRing klokka 07.15.");

        Assert.Equal(
            ["Fra mandag 3. mars går ikke trikken.", "Ta buss 31T!", "Har du spørsmål?", "Ring klokka 07.15."],
            sentences);
    }

    [Fact]
    public void Keys_depend_only_on_the_normalized_text()
    {
        Assert.Equal(SpeechManifest.Key("Jeg har  en jobb. "), SpeechManifest.Key("Jeg har en jobb."));
        Assert.NotEqual(SpeechManifest.Key("Jeg har en jobb."), SpeechManifest.Key("Jeg har en bil."));
        Assert.Matches("^[0-9a-f]{16}$", SpeechManifest.Key("hei"));
    }

    [Fact]
    public void Lists_lesson_sentences_listening_messages_cards_and_examples_once_each()
    {
        _content.WriteDescriptors(("A2-W-01", "writing"));
        _content.Write(Path.Combine(ContentLoader.LessonsFolder, "lesson-a.json"), $$"""
            { "id": "lesson-a", "level": "A2", "title": "T", "summary": "S",
              "text": "Jeg har en jobb. Jeg har en jobb.", "items": [ {{ContentFixture.Gap("item-1")}},
                { "id": "item-2", "type": "dictation", "skill": "listening", "level": "A2", "descriptors": ["A2-W-01"],
                  "difficulty": 1000, "prompt": "Skriv det du hører.", "audio": "Hei. Jeg heter Sara." } ] }
            """);
        _content.Write(Path.Combine(ContentLoader.VocabFolder, "a2", "work.json"), """
            { "level": "A2", "topic": "work", "title": "Jobben", "cards": [
              { "id": "jobb", "nb": "jobb", "pos": "noun", "gender": "en", "forms": ["jobb"], "example": "Jeg har en jobb." } ] }
            """);

        var texts = SpeechManifest.Build(ContentLoader.Load(_content.Root)).Select(e => e.Text).Order();

        Assert.Equal(["en jobb", "Hei. Jeg heter Sara.", "Jeg har en jobb."], texts);
    }
}
