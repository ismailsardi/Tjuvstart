namespace Tjuvstart.ContentCli.Tests;

public sealed class ContentValidatorTests : IDisposable
{
    private readonly string _root = Directory.CreateTempSubdirectory("tjuvstart-content-").FullName;

    public void Dispose() => Directory.Delete(_root, recursive: true);

    private void Write(string relativePath, string json)
    {
        var path = Path.Combine(_root, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, json);
    }

    [Fact]
    public void Valid_content_has_no_issues()
    {
        Write("a2/lesson.json", """{ "items": [ { "id": "a2-001" }, { "id": "a2-002" } ] }""");

        Assert.Empty(ContentValidator.Validate(_root));
    }

    [Fact]
    public void Invalid_json_is_reported()
    {
        Write("a2/broken.json", "{ \"items\": [ ");

        var issue = Assert.Single(ContentValidator.Validate(_root));
        Assert.Equal(Path.Combine("a2", "broken.json"), issue.File);
        Assert.StartsWith("Invalid JSON", issue.Message);
    }

    [Fact]
    public void Duplicate_ids_across_files_are_reported()
    {
        Write("a2/one.json", """{ "items": [ { "id": "dup" } ] }""");
        Write("a2/two.json", """{ "items": [ { "id": "dup" } ] }""");

        var issue = Assert.Single(ContentValidator.Validate(_root));
        Assert.Contains("Duplicate item id 'dup'", issue.Message);
    }

    [Fact]
    public void Missing_folder_is_reported()
    {
        var issue = Assert.Single(ContentValidator.Validate(Path.Combine(_root, "nope")));
        Assert.Equal("Content folder not found.", issue.Message);
    }
}
