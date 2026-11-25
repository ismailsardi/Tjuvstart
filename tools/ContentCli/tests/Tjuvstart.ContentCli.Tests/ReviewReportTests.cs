namespace Tjuvstart.ContentCli.Tests;

public sealed class ReviewReportTests : IDisposable
{
    private readonly ContentFixture _content = new();

    public void Dispose() => _content.Dispose();

    [Fact]
    public void Lists_lessons_that_still_need_a_native_review()
    {
        _content.WriteDescriptors(("A2-W-01", "writing"));
        _content.WriteLessonWithReview("lesson-a", Lesson.Approved, ContentFixture.Gap("item-1"));
        _content.WriteLesson("lesson-b", ContentFixture.Gap("item-2"));

        var content = ContentLoader.Load(_content.Root);
        var markdown = ReviewReport.ToMarkdown(content);

        Assert.Equal(["lesson-b"], ReviewReport.Pending(content).Select(l => l.Id));
        Assert.Contains("1 of 2 lessons approved.", markdown);
        Assert.Contains("| A2 | lesson-b |", markdown);
    }

    [Fact]
    public void Lists_language_packs_that_still_need_a_review()
    {
        _content.Write(Path.Combine("l1", "de", ContentLoader.PackFileName), """
            { "language": "de", "name": "German", "nativeName": "Deutsch", "direction": "ltr", "review": "pending",
              "cognates": [], "falseFriends": [], "contrasts": [] }
            """);
        _content.Write(Path.Combine("l1", "en", ContentLoader.PackFileName), """
            { "language": "en", "name": "English", "nativeName": "English", "direction": "ltr",
              "cognates": [], "falseFriends": [], "contrasts": [] }
            """);

        var content = ContentLoader.Load(_content.Root);

        Assert.Equal(["de"], ReviewReport.PendingPacks(content).Select(p => p.Language));
        Assert.Contains("Language packs waiting for review: de.", ReviewReport.ToMarkdown(content));
    }

    [Fact]
    public void Rejects_a_lesson_without_a_review_status()
    {
        _content.WriteDescriptors(("A2-W-01", "writing"));
        _content.Write(Path.Combine(ContentLoader.LessonsFolder, "lesson-a.json"),
            $$"""{ "id": "lesson-a", "level": "A2", "title": "T", "summary": "S", "items": [ {{ContentFixture.Gap("item-1")}} ] }""");

        var issues = ContentValidator.Validate(ContentLoader.Load(_content.Root));

        Assert.Contains(issues, i => i.File.EndsWith("lesson-a.json"));
    }

    [Fact]
    public void Lists_word_decks_that_still_need_a_review()
    {
        var deck = """
            { "level": "A2", "topic": "{0}", "title": "T", {1}
              "cards": [ { "id": "{0}", "nb": "{0}", "pos": "adverb", "forms": ["{0}"], "example": "Eksempel." } ] }
            """;
        _content.Write(Path.Combine(ContentLoader.VocabFolder, "a2", "new.json"), deck.Replace("{0}", "ofte").Replace("{1}", "\"review\": \"pending\","));
        _content.Write(Path.Combine(ContentLoader.VocabFolder, "a2", "old.json"), deck.Replace("{0}", "alltid").Replace("{1}", ""));

        var content = ContentLoader.Load(_content.Root);

        Assert.Equal([Path.Combine(ContentLoader.VocabFolder, "a2", "new.json")], content.PendingDecks);
        Assert.Contains("Word decks waiting for review: vocab/a2/new.json.", ReviewReport.ToMarkdown(content));
    }
}
