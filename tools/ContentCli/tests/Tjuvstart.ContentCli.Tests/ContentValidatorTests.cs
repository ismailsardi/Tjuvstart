namespace Tjuvstart.ContentCli.Tests;

public sealed class ContentValidatorTests : IDisposable
{
    private readonly ContentFixture _content = new();

    public void Dispose() => _content.Dispose();

    private IReadOnlyList<ValidationIssue> Validate() =>
        ContentValidator.Validate(ContentLoader.Load(_content.Root));

    [Fact]
    public void Repository_content_is_valid()
    {
        var issues = ContentValidator.Validate(ContentLoader.Load(ContentFixture.RepoContentRoot));

        Assert.Empty(issues);
    }

    [Fact]
    public void Valid_content_has_no_issues()
    {
        _content.WriteDescriptors(("A2-W-01", "writing"));
        _content.WriteLesson("lesson-a", ContentFixture.Gap("item-1"));

        Assert.Empty(Validate());
    }

    [Fact]
    public void Unknown_focus_points_are_rejected()
    {
        _content.WriteDescriptors(("A2-W-01", "writing"));
        var item = ContentFixture.Gap("item-1").Replace("\"difficulty\"", "\"focus\": [\"made-up\"], \"difficulty\"");
        _content.WriteLesson("lesson-a", item);

        Assert.Contains(Validate(), i => i.Message.StartsWith("Schema:"));
    }

    [Fact]
    public void Missing_folder_is_reported()
    {
        var issue = Assert.Single(ContentValidator.Validate(ContentLoader.Load(Path.Combine(_content.Root, "nope"))));
        Assert.Equal("Content folder not found.", issue.Message);
    }

    [Fact]
    public void Invalid_json_is_reported()
    {
        _content.WriteDescriptors(("A2-W-01", "writing"));
        _content.Write("lessons/broken.json", "{ \"items\": [ ");

        var issue = Assert.Single(Validate());
        Assert.Equal(Path.Combine("lessons", "broken.json"), issue.File);
        Assert.StartsWith("Invalid JSON", issue.Message);
    }

    [Fact]
    public void Schema_violations_are_reported()
    {
        _content.WriteDescriptors(("A2-W-01", "writing"));
        _content.Write("lessons/no-items.json", """{ "id": "no-items", "level": "A2", "title": "T", "summary": "S", "items": [] }""");

        var issues = Validate();
        Assert.NotEmpty(issues);
        Assert.All(issues, i => Assert.StartsWith("Schema:", i.Message));
    }

    [Fact]
    public void Unknown_descriptor_is_reported()
    {
        _content.WriteDescriptors(("A2-W-01", "writing"));
        _content.WriteLesson("lesson-a", ContentFixture.Gap("item-1", descriptor: "A2-W-09"));

        var issue = Assert.Single(Validate());
        Assert.Contains("unknown descriptor 'A2-W-09'", issue.Message);
    }

    [Fact]
    public void Skill_mismatch_with_descriptor_is_reported()
    {
        _content.WriteDescriptors(("A2-R-01", "reading"));
        _content.WriteLesson("lesson-a", ContentFixture.Gap("item-1", descriptor: "A2-R-01", skill: "writing"));

        var issue = Assert.Single(Validate());
        Assert.Contains("is a writing item but descriptor 'A2-R-01' is reading", issue.Message);
    }

    [Fact]
    public void Duplicate_item_ids_across_lessons_are_reported()
    {
        _content.WriteDescriptors(("A2-W-01", "writing"));
        _content.WriteLesson("lesson-a", ContentFixture.Gap("dup"));
        _content.WriteLesson("lesson-b", ContentFixture.Gap("dup"));

        var issue = Assert.Single(Validate());
        Assert.Contains("Duplicate item id 'dup'", issue.Message);
    }

    [Fact]
    public void Multiple_choice_answer_out_of_range_is_reported()
    {
        _content.WriteDescriptors(("A2-R-01", "reading"));
        _content.WriteLesson("lesson-a", """{ "id": "mc", "type": "multiple-choice", "skill": "reading", "level": "A2", "descriptors": ["A2-R-01"], "difficulty": 1000, "prompt": "?", "options": ["a", "b"], "answer": 2 }""");

        var issue = Assert.Single(Validate());
        Assert.Contains("answer index 2 is out of range", issue.Message);
    }

    [Fact]
    public void Word_order_answer_must_use_the_tokens()
    {
        _content.WriteDescriptors(("A2-W-02", "writing"));
        _content.WriteLesson("lesson-a", """{ "id": "wo", "type": "word-order", "skill": "writing", "level": "A2", "descriptors": ["A2-W-02"], "difficulty": 1000, "prompt": "?", "tokens": ["Jeg", "bor"], "answer": "Jeg bor i Oslo" }""");

        var issue = Assert.Single(Validate());
        Assert.Contains("must use exactly the given tokens", issue.Message);
    }
}
