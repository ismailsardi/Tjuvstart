using System.Text.Json;

namespace Tjuvstart.ContentCli;

public sealed record ValidationIssue(string File, string Message);

/// <summary>
/// Checks the content folder: every JSON file must parse, and item ids must be unique
/// across all files. Schema checks and descriptor coverage build on this in later milestones.
/// </summary>
public static class ContentValidator
{
    public static IReadOnlyList<ValidationIssue> Validate(string contentRoot)
    {
        if (!Directory.Exists(contentRoot))
        {
            return [new ValidationIssue(contentRoot, "Content folder not found.")];
        }

        var issues = new List<ValidationIssue>();
        var seenIds = new Dictionary<string, string>(StringComparer.Ordinal);

        var files = Directory
            .EnumerateFiles(contentRoot, "*.json", SearchOption.AllDirectories)
            .Order(StringComparer.Ordinal);

        foreach (var path in files)
        {
            var relative = Path.GetRelativePath(contentRoot, path);
            JsonDocument document;
            try
            {
                document = JsonDocument.Parse(File.ReadAllText(path));
            }
            catch (JsonException ex)
            {
                issues.Add(new ValidationIssue(relative, $"Invalid JSON: {ex.Message}"));
                continue;
            }

            using (document)
            {
                foreach (var id in ItemIds(document.RootElement))
                {
                    if (seenIds.TryGetValue(id, out var firstFile))
                    {
                        issues.Add(new ValidationIssue(relative, $"Duplicate item id '{id}' (first defined in {firstFile})."));
                    }
                    else
                    {
                        seenIds[id] = relative;
                    }
                }
            }
        }

        return issues;
    }

    private static IEnumerable<string> ItemIds(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object
            || !root.TryGetProperty("items", out var items)
            || items.ValueKind != JsonValueKind.Array)
        {
            yield break;
        }

        foreach (var item in items.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.Object
                && item.TryGetProperty("id", out var id)
                && id.ValueKind == JsonValueKind.String)
            {
                yield return id.GetString()!;
            }
        }
    }
}
