namespace Tjuvstart.ContentCli.Tests;

public sealed class CoverageReportTests : IDisposable
{
    private readonly ContentFixture _content = new();

    public void Dispose() => _content.Dispose();

    [Fact]
    public void Counts_lessons_and_items_per_descriptor_and_finds_gaps()
    {
        _content.WriteDescriptors(("A2-W-01", "writing"), ("A2-W-02", "writing"), ("B1-W-01", "writing"));
        _content.WriteLesson("lesson-a", ContentFixture.Gap("item-1"), ContentFixture.Gap("item-2"));
        _content.WriteLesson("lesson-b", ContentFixture.Gap("item-3"));

        var report = CoverageReport.Build(ContentLoader.Load(_content.Root));

        var covered = report.Rows.Single(r => r.Descriptor.Id == "A2-W-01");
        Assert.Equal(2, covered.Lessons);
        Assert.Equal(3, covered.Items);

        var gap = Assert.Single(report.GapsAt(["A2"]));
        Assert.Equal("A2-W-02", gap.Descriptor.Id);
        Assert.Empty(report.GapsAt(["B2"]));
    }

    [Fact]
    public void Markdown_marks_gaps()
    {
        _content.WriteDescriptors(("A2-W-01", "writing"), ("A2-W-02", "writing"));
        _content.WriteLesson("lesson-a", ContentFixture.Gap("item-1"));

        var markdown = CoverageReport.Build(ContentLoader.Load(_content.Root)).ToMarkdown();

        Assert.Contains("### A2: 1 of 2 covered", markdown);
        Assert.Contains("| A2-W-02 (gap) |", markdown);
    }
}
