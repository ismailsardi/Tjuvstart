namespace Tjuvstart.ContentCli.Tests;

public sealed class LanguagePackTests : IDisposable
{
    private readonly ContentFixture _content = new();

    public LanguagePackTests()
    {
        _content.WriteDescriptors(("A2-W-01", "writing"));
        _content.WriteLesson("lesson-a", ContentFixture.Gap("item-1"));
    }

    public void Dispose() => _content.Dispose();

    private IReadOnlyList<ValidationIssue> Validate() =>
        ContentValidator.Validate(ContentLoader.Load(_content.Root));

    private void WritePack(string folder, string language, string extra = "", string forms = "\"bor\"") =>
        _content.Write(Path.Combine("l1", folder, ContentLoader.PackFileName), $$"""
            {
              "language": "{{language}}", "name": "X", "nativeName": "X", "direction": "ltr",
              "cognates": [ { "nb": "bo", "forms": [{{forms}}], "meaning": "live" } ],
              "falseFriends": [], "contrasts": []{{extra}}
            }
            """);

    [Fact]
    public void Valid_pack_has_no_issues()
    {
        WritePack("en", "en", """, "itemNotes": { "item-1": "Note." }, "lessonSummaries": { "lesson-a": "S." }""");

        Assert.Empty(Validate());
        Assert.Single(ContentLoader.Load(_content.Root).Packs);
    }

    [Fact]
    public void Language_must_match_folder()
    {
        WritePack("en", "fr");

        Assert.Contains(Validate(), i => i.Message.Contains("does not match folder 'en'"));
    }

    [Fact]
    public void Notes_and_lessons_must_exist()
    {
        WritePack("en", "en", """, "itemNotes": { "nope": "Note." }, "lessonSummaries": { "missing": "S." }""");

        var issues = Validate();
        Assert.Contains(issues, i => i.Message == "Note for unknown item 'nope'.");
        Assert.Contains(issues, i => i.Message == "Reference to unknown lesson 'missing'.");
    }

    [Fact]
    public void Duplicate_forms_are_reported()
    {
        WritePack("en", "en", forms: "\"bor\", \"bor\"");

        Assert.Contains(Validate(), i => i.Message == "Word form 'bor' is listed more than once.");
    }

    [Fact]
    public void Forms_must_be_lower_case_words()
    {
        WritePack("en", "en", forms: "\"Bor\"");

        Assert.Contains(Validate(), i => i.Message.StartsWith("Schema:"));
    }
}
