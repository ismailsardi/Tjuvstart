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
    public void Rejects_a_lesson_without_a_review_status()
    {
        _content.WriteDescriptors(("A2-W-01", "writing"));
        _content.Write(Path.Combine(ContentLoader.LessonsFolder, "lesson-a.json"),
            $$"""{ "id": "lesson-a", "level": "A2", "title": "T", "summary": "S", "items": [ {{ContentFixture.Gap("item-1")}} ] }""");

        var issues = ContentValidator.Validate(ContentLoader.Load(_content.Root));

        Assert.Contains(issues, i => i.File.EndsWith("lesson-a.json"));
    }
}
