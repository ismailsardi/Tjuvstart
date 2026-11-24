namespace Tjuvstart.ContentCli.Tests;

public sealed class TrackTests : IDisposable
{
    private readonly ContentFixture _content = new();

    public TrackTests()
    {
        _content.WriteDescriptors(("A2-W-01", "writing"));
        _content.Write(Path.Combine(ContentLoader.LessonsFolder, "lesson-a.json"), $$"""
            { "id": "lesson-a", "level": "A2", "title": "T", "summary": "S", "review": "pending", "items": [ {{ContentFixture.Gap("item-1")}} ] }
            """);
    }

    public void Dispose() => _content.Dispose();

    private IReadOnlyList<ValidationIssue> Validate() => ContentValidator.Validate(ContentLoader.Load(_content.Root));

    private void WriteTracks(string tracks) =>
        _content.Write(ContentLoader.TracksFile, $$"""{ "tracks": [ {{tracks}} ] }""");

    [Fact]
    public void Loads_tracks_in_order()
    {
        WriteTracks("""{ "id": "first-weeks", "level": "A2", "title": "De første ukene", "summary": "S", "lessons": ["lesson-a"] }""");

        var content = ContentLoader.Load(_content.Root);

        Assert.Empty(ContentValidator.Validate(content));
        Assert.Equal(["lesson-a"], Assert.Single(content.Tracks).Lessons);
    }

    [Fact]
    public void Rejects_unknown_lessons_and_duplicate_tracks()
    {
        WriteTracks("""
            { "id": "t", "level": "A2", "title": "T", "summary": "S", "lessons": ["lesson-a", "ghost"] },
            { "id": "t", "level": "A2", "title": "T", "summary": "S", "lessons": ["lesson-a"] }
            """);

        var messages = Validate().Select(i => i.Message).ToList();

        Assert.Contains("Track 't' lists unknown lesson 'ghost'.", messages);
        Assert.Contains("Duplicate track id 't'.", messages);
    }

    [Fact]
    public void Rejects_a_track_that_lists_a_lesson_twice()
    {
        WriteTracks("""{ "id": "t", "level": "A2", "title": "T", "summary": "S", "lessons": ["lesson-a", "lesson-a"] }""");

        Assert.Contains(Validate(), i => i.File == ContentLoader.TracksFile);
    }

    [Fact]
    public void Rejects_pack_summaries_for_unknown_tracks()
    {
        _content.Write(Path.Combine("l1", "fr", ContentLoader.PackFileName), """
            { "language": "fr", "name": "French", "nativeName": "Français", "direction": "ltr",
              "cognates": [], "falseFriends": [], "contrasts": [], "trackSummaries": { "ghost": "?" } }
            """);

        Assert.Contains(Validate(), i => i.Message == "Summary for unknown track 'ghost'.");
    }
}
