namespace Tjuvstart.ContentCli.Tests;

public sealed class VocabularyTests : IDisposable
{
    private readonly ContentFixture _content = new();

    public VocabularyTests()
    {
        _content.WriteDescriptors(("A2-W-01", "writing"));
        _content.Write(Path.Combine(ContentLoader.LessonsFolder, "lesson-a.json"), $$"""
            { "id": "lesson-a", "level": "A2", "title": "T", "summary": "S", "text": "Sara har en jobb.",
              "items": [ {{ContentFixture.Gap("item-1")}} ] }
            """);
    }

    public void Dispose() => _content.Dispose();

    private ContentSet Load() => ContentLoader.Load(_content.Root);

    private void WriteDeck(string folder, string level, string cards) =>
        _content.Write(Path.Combine(ContentLoader.VocabFolder, folder, "work.json"),
            $$"""{ "level": "{{level}}", "topic": "work", "title": "Jobben", "cards": [ {{cards}} ] }""");

    private static string Card(string id, string forms, string pos = "verb") =>
        $$"""{ "id": "{{id}}", "nb": "{{id}}", "pos": "{{pos}}", "forms": [{{forms}}], "example": "Eksempel." }""";

    private void WritePack(string words) =>
        _content.Write(Path.Combine("l1", "en", ContentLoader.PackFileName), $$"""
            { "language": "en", "name": "English", "nativeName": "English", "direction": "ltr",
              "cognates": [], "falseFriends": [], "contrasts": [], "words": { {{words}} } }
            """);

    [Fact]
    public void Every_card_needs_a_meaning_in_every_pack()
    {
        WriteDeck("a2", "A2", Card("ha", "\"ha\", \"har\"") + "," + Card("jobb", "\"jobb\"", "noun").Replace("\"pos\": \"noun\"", "\"pos\": \"noun\", \"gender\": \"en\""));
        WritePack("""  "ha": { "meaning": "to have" }, "ghost": { "meaning": "?" } """);

        var issues = ContentValidator.Validate(Load());
        Assert.Contains(issues, i => i.Message == "No meaning for card 'jobb'.");
        Assert.Contains(issues, i => i.Message == "Meaning for unknown card 'ghost'.");
        Assert.Equal(2, issues.Count);
    }

    [Fact]
    public void Nouns_need_a_gender()
    {
        WriteDeck("a2", "A2", Card("jobb", "\"jobb\"", "noun"));

        Assert.Contains(ContentValidator.Validate(Load()), i => i.Message.StartsWith("Schema:"));
    }

    [Fact]
    public void Deck_level_must_match_its_folder()
    {
        WriteDeck("b1", "A2", Card("ha", "\"ha\""));
        WritePack("""  "ha": { "meaning": "to have" } """);

        Assert.Contains(ContentValidator.Validate(Load()), i => i.Message == "Deck level A2 does not match folder 'b1'.");
    }

    [Fact]
    public void Coverage_lists_lesson_words_without_a_card()
    {
        WriteDeck("a2", "A2", Card("ha", "\"ha\", \"har\""));
        _content.Write(Path.Combine(ContentLoader.VocabFolder, ContentLoader.IgnoreFileName), """{ "words": ["sara"] }""");

        var row = Assert.Single(VocabularyCoverage.Build(Load()));
        Assert.Equal(3, row.LessonWords);
        Assert.Equal(["en", "jobb"], row.Missing);
        Assert.Contains("| A2 | 1 | 1 of 3 | en, jobb |", VocabularyCoverage.ToMarkdown([row]));
    }
}
