using System.Text.Json;
using Json.Schema;

namespace Tjuvstart.ContentCli;

/// <summary>
/// Loads <c>descriptors.json</c> and every lesson under <c>lessons/</c>, checking each file
/// against its JSON Schema in <c>schema/</c>. Files that fail parsing or schema checks are
/// reported and left out of the returned model.
/// </summary>
public static class ContentLoader
{
    public const string DescriptorsFile = "descriptors.json";
    public const string LessonsFolder = "lessons";
    public const string SchemaFolder = "schema";
    public const string PacksFolder = "l1";
    public const string PackFileName = "pack.json";
    public const string VocabFolder = "vocab";
    public const string IgnoreFileName = "ignore.json";
    public const string TracksFile = "tracks.json";

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public static ContentSet Load(string contentRoot)
    {
        var issues = new List<ValidationIssue>();
        contentRoot = Path.GetFullPath(contentRoot);
        if (!Directory.Exists(contentRoot))
        {
            return new ContentSet([], [], [], [new ValidationIssue(contentRoot, "Content folder not found.")]);
        }

        var descriptorSchema = LoadSchema(contentRoot, "descriptors.schema.json", issues);
        var lessonSchema = LoadSchema(contentRoot, "lesson.schema.json", issues);
        var packSchema = LoadSchema(contentRoot, "l1-pack.schema.json", issues);
        var deckSchema = LoadSchema(contentRoot, "vocab-deck.schema.json", issues);
        var tracksSchema = LoadSchema(contentRoot, "tracks.schema.json", issues);

        var descriptors = new List<Descriptor>();
        var descriptorsPath = Path.Combine(contentRoot, DescriptorsFile);
        if (!File.Exists(descriptorsPath))
        {
            issues.Add(new ValidationIssue(DescriptorsFile, "File not found."));
        }
        else if (ReadChecked(contentRoot, descriptorsPath, descriptorSchema, issues) is { } descriptorDoc)
        {
            using (descriptorDoc)
            {
                var file = descriptorDoc.RootElement.Deserialize<DescriptorFile>(JsonOptions)!;
                descriptors.AddRange(file.Descriptors);
            }
        }

        var lessons = new List<Lesson>();
        var lessonsRoot = Path.Combine(contentRoot, LessonsFolder);
        if (Directory.Exists(lessonsRoot))
        {
            var files = Directory
                .EnumerateFiles(lessonsRoot, "*.json", SearchOption.AllDirectories)
                .Order(StringComparer.Ordinal);

            foreach (var path in files)
            {
                if (ReadChecked(contentRoot, path, lessonSchema, issues) is not { } lessonDoc)
                {
                    continue;
                }

                using (lessonDoc)
                {
                    var raw = lessonDoc.RootElement.Deserialize<LessonFile>(JsonOptions)!;
                    var relative = Relative(contentRoot, path);
                    var items = raw.Items
                        .Select(i => new LessonItem(i.Id, i.Skill, i.Level, i.Descriptors, i.Audio))
                        .ToList();
                    lessons.Add(new Lesson(raw.Id, raw.Level, raw.Title, relative, items, raw.Text));
                    CheckItemAnswers(relative, lessonDoc.RootElement, issues);
                }
            }
        }

        var packs = new List<LanguagePack>();
        var packsRoot = Path.Combine(contentRoot, PacksFolder);
        if (Directory.Exists(packsRoot))
        {
            foreach (var folder in Directory.EnumerateDirectories(packsRoot).Order(StringComparer.Ordinal))
            {
                var path = Path.Combine(folder, PackFileName);
                if (!File.Exists(path))
                {
                    issues.Add(new ValidationIssue(Relative(contentRoot, folder), $"Missing {PackFileName}."));
                    continue;
                }

                if (ReadChecked(contentRoot, path, packSchema, issues) is not { } packDoc)
                {
                    continue;
                }

                using (packDoc)
                {
                    var raw = packDoc.RootElement.Deserialize<PackFile>(JsonOptions)!;
                    var forms = raw.Cognates.Concat(raw.FalseFriends).SelectMany(w => w.Forms).ToList();
                    var lessonRefs = raw.Contrasts.SelectMany(c => c.Lessons)
                        .Concat(raw.LessonSummaries?.Keys ?? Enumerable.Empty<string>())
                        .ToList();
                    packs.Add(new LanguagePack(
                        raw.Language,
                        Path.GetFileName(folder),
                        Relative(contentRoot, path),
                        forms,
                        raw.ItemNotes?.Keys.ToList() ?? [],
                        lessonRefs,
                        raw.Words?.Keys.ToList() ?? [],
                        raw.TrackSummaries?.Keys.ToList() ?? [],
                        raw.CanDo?.Keys.ToList() ?? []));
                }
            }
        }

        var (cards, ignored) = LoadVocabulary(contentRoot, deckSchema, issues);

        // Tracks are optional: a content folder without tracks.json simply has none.
        var tracks = new List<Track>();
        var tracksPath = Path.Combine(contentRoot, TracksFile);
        if (File.Exists(tracksPath) && ReadChecked(contentRoot, tracksPath, tracksSchema, issues) is { } tracksDoc)
        {
            using (tracksDoc)
            {
                var file = tracksDoc.RootElement.Deserialize<TracksFileModel>(JsonOptions)!;
                tracks.AddRange(file.Tracks.Select(t => new Track(t.Id, t.Title, t.Lessons)));
            }
        }

        return new ContentSet(descriptors, lessons, packs, issues)
        {
            Cards = cards,
            IgnoredWords = ignored,
            Tracks = tracks,
        };
    }

    /// <summary>Loads decks from <c>vocab/&lt;level&gt;/*.json</c> and the optional ignore list.</summary>
    private static (List<Card> Cards, HashSet<string> Ignored) LoadVocabulary(
        string contentRoot, JsonSchema? deckSchema, List<ValidationIssue> issues)
    {
        var cards = new List<Card>();
        var ignored = new HashSet<string>(StringComparer.Ordinal);
        var vocabRoot = Path.Combine(contentRoot, VocabFolder);
        if (!Directory.Exists(vocabRoot))
        {
            return (cards, ignored);
        }

        var deckFiles = Directory.EnumerateDirectories(vocabRoot)
            .SelectMany(folder => Directory.EnumerateFiles(folder, "*.json"))
            .Order(StringComparer.Ordinal);
        foreach (var path in deckFiles)
        {
            if (ReadChecked(contentRoot, path, deckSchema, issues) is not { } deckDoc)
            {
                continue;
            }

            using (deckDoc)
            {
                var deck = deckDoc.RootElement.Deserialize<DeckFile>(JsonOptions)!;
                var relative = Relative(contentRoot, path);
                var folder = Path.GetFileName(Path.GetDirectoryName(path))!;
                if (!string.Equals(folder, deck.Level, StringComparison.OrdinalIgnoreCase))
                {
                    issues.Add(new ValidationIssue(relative, $"Deck level {deck.Level} does not match folder '{folder}'."));
                }
                cards.AddRange(deck.Cards.Select(c => new Card(c.Id, deck.Level, c.Nb, c.Forms, relative, c.Example, c.Pos, c.Gender)));
            }
        }

        var ignorePath = Path.Combine(vocabRoot, IgnoreFileName);
        if (File.Exists(ignorePath))
        {
            try
            {
                var file = JsonSerializer.Deserialize<IgnoreFile>(File.ReadAllText(ignorePath), JsonOptions);
                ignored.UnionWith(file?.Words ?? []);
            }
            catch (JsonException ex)
            {
                issues.Add(new ValidationIssue(Relative(contentRoot, ignorePath), $"Invalid JSON: {ex.Message}"));
            }
        }

        return (cards, ignored);
    }

    private static JsonSchema? LoadSchema(string contentRoot, string fileName, List<ValidationIssue> issues)
    {
        var path = Path.Combine(contentRoot, SchemaFolder, fileName);
        if (!File.Exists(path))
        {
            issues.Add(new ValidationIssue(Path.Combine(SchemaFolder, fileName), "Schema file not found."));
            return null;
        }

        // A fresh registry per load keeps repeated loads (tests, watch mode) from clashing on $id.
        var options = new BuildOptions { SchemaRegistry = new SchemaRegistry() };
        return JsonSchema.FromFile(path, options);
    }

    private static JsonDocument? ReadChecked(
        string contentRoot, string path, JsonSchema? schema, List<ValidationIssue> issues)
    {
        var relative = Relative(contentRoot, path);
        JsonDocument document;
        try
        {
            document = JsonDocument.Parse(File.ReadAllText(path));
        }
        catch (JsonException ex)
        {
            issues.Add(new ValidationIssue(relative, $"Invalid JSON: {ex.Message}"));
            return null;
        }

        if (schema is null)
        {
            document.Dispose();
            return null;
        }

        var result = schema.Evaluate(document.RootElement, new EvaluationOptions { OutputFormat = OutputFormat.List });
        if (result.IsValid)
        {
            return document;
        }

        var errors = (result.Details ?? [])
            .Where(d => d.Errors is { Count: > 0 })
            .SelectMany(d => d.Errors!.Select(e => $"{d.InstanceLocation}: {e.Value}"))
            .Distinct()
            .DefaultIfEmpty("does not match the schema");

        foreach (var error in errors)
        {
            issues.Add(new ValidationIssue(relative, $"Schema: {error}"));
        }

        document.Dispose();
        return null;
    }

    /// <summary>Checks answer keys that the schema cannot express.</summary>
    private static void CheckItemAnswers(string file, JsonElement lesson, List<ValidationIssue> issues)
    {
        foreach (var item in lesson.GetProperty("items").EnumerateArray())
        {
            var id = item.GetProperty("id").GetString();
            switch (item.GetProperty("type").GetString())
            {
                case "multiple-choice":
                    var count = item.GetProperty("options").GetArrayLength();
                    var answer = item.GetProperty("answer").GetInt32();
                    if (answer >= count)
                    {
                        issues.Add(new ValidationIssue(file, $"Item '{id}': answer index {answer} is out of range (only {count} options)."));
                    }
                    break;

                case "word-order":
                    var tokens = item.GetProperty("tokens").EnumerateArray()
                        .SelectMany(t => Words(t.GetString()!))
                        .Order(StringComparer.Ordinal);
                    var expected = Words(item.GetProperty("answer").GetString()!).Order(StringComparer.Ordinal);
                    if (!tokens.SequenceEqual(expected))
                    {
                        issues.Add(new ValidationIssue(file, $"Item '{id}': the answer must use exactly the given tokens."));
                    }
                    break;
            }
        }
    }

    private static string[] Words(string text) =>
        text.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    private static string Relative(string root, string path) => Path.GetRelativePath(root, path);

    private sealed record DescriptorFile(List<Descriptor> Descriptors);

    private sealed record ItemFile(string Id, string Skill, string Level, List<string> Descriptors, string? Audio);

    private sealed record LessonFile(string Id, string Level, string Title, List<ItemFile> Items, string? Text);

    private sealed record WordFile(List<string> Forms);

    private sealed record ContrastFile(List<string> Lessons);

    private sealed record PackFile(
        string Language,
        List<WordFile> Cognates,
        List<WordFile> FalseFriends,
        List<ContrastFile> Contrasts,
        Dictionary<string, string>? ItemNotes,
        Dictionary<string, string>? LessonSummaries,
        Dictionary<string, string>? TrackSummaries,
        Dictionary<string, string>? CanDo,
        Dictionary<string, JsonElement>? Words);

    private sealed record CardFile(
        string Id, string Nb, List<string> Forms, string? Example, string? Pos, string? Gender);

    private sealed record DeckFile(string Level, List<CardFile> Cards);

    private sealed record IgnoreFile(List<string> Words);

    private sealed record TrackFile(string Id, string Title, List<string> Lessons);

    private sealed record TracksFileModel(List<TrackFile> Tracks);
}
