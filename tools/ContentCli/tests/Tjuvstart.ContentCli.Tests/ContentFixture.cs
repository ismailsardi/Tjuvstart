namespace Tjuvstart.ContentCli.Tests;

/// <summary>A temporary content folder that uses the repository's real JSON Schemas.</summary>
public sealed class ContentFixture : IDisposable
{
    public ContentFixture()
    {
        Root = Directory.CreateTempSubdirectory("tjuvstart-content-").FullName;
        var schemaTarget = Directory.CreateDirectory(Path.Combine(Root, ContentLoader.SchemaFolder)).FullName;
        foreach (var file in Directory.GetFiles(Path.Combine(RepoContentRoot, ContentLoader.SchemaFolder)))
        {
            File.Copy(file, Path.Combine(schemaTarget, Path.GetFileName(file)));
        }
    }

    public string Root { get; }

    public static string RepoContentRoot { get; } = FindRepoContentRoot();

    public void Write(string relativePath, string json)
    {
        var path = Path.Combine(Root, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, json);
    }

    public void WriteDescriptors(params (string Id, string Skill)[] descriptors)
    {
        var entries = descriptors.Select(d =>
            $$"""{ "id": "{{d.Id}}", "level": "{{d.Id[..2]}}", "skill": "{{d.Skill}}", "text": "Can do something." }""");
        Write(ContentLoader.DescriptorsFile, $$"""{ "source": "test", "descriptors": [ {{string.Join(",", entries)}} ] }""");
    }

    public void WriteLesson(string id, params string[] items) => WriteLessonWithReview(id, Lesson.Pending, items);

    public void WriteLessonWithReview(string id, string review, params string[] items) =>
        Write(Path.Combine(ContentLoader.LessonsFolder, $"{id}.json"),
            $$"""{ "id": "{{id}}", "level": "A2", "title": "T", "summary": "S", "review": "{{review}}", "items": [ {{string.Join(",", items)}} ] }""");

    public static string Gap(string id, string descriptor = "A2-W-01", string skill = "writing") =>
        $$"""{ "id": "{{id}}", "type": "gap-fill", "skill": "{{skill}}", "level": "A2", "descriptors": ["{{descriptor}}"], "difficulty": 1000, "prompt": "Jeg ___ i Oslo.", "answers": ["bor"] }""";

    public void Dispose() => Directory.Delete(Root, recursive: true);

    private static string FindRepoContentRoot()
    {
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir is not null; dir = dir.Parent)
        {
            var candidate = Path.Combine(dir.FullName, "content", ContentLoader.SchemaFolder);
            if (Directory.Exists(candidate))
            {
                return Path.Combine(dir.FullName, "content");
            }
        }
        throw new InvalidOperationException("Could not find the repository's content folder.");
    }
}
