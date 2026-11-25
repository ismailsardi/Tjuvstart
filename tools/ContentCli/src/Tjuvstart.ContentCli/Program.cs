using System.Text.Encodings.Web;
using System.Text.Json;
using Tjuvstart.ContentCli;

const string usage = """
    Usage:
      tjuvstart-content validate <content-folder>
      tjuvstart-content coverage <content-folder> [--summary <file>] [--enforce <levels>]
      tjuvstart-content speech <content-folder> --out <file>

    --summary   Append the coverage table as Markdown to a file (for example $GITHUB_STEP_SUMMARY).
    --enforce   Comma-separated CEFR levels that must have no coverage gaps, for example A2,B1.
    --out       Where to write the list of texts that need recorded audio (JSON).
    """;

if (args.Length < 2)
{
    Console.Error.WriteLine(usage);
    return 2;
}

var (command, contentRoot) = (args[0], args[1]);
var options = ParseOptions(args.Skip(2).ToArray());
if (options is null)
{
    Console.Error.WriteLine(usage);
    return 2;
}

var content = ContentLoader.Load(contentRoot);
var issues = ContentValidator.Validate(content);

switch (command)
{
    case "validate":
        foreach (var issue in issues)
        {
            Console.Error.WriteLine($"{issue.File}: {issue.Message}");
        }
        Console.WriteLine(issues.Count == 0
            ? $"Content is valid: {Plural(content.Descriptors.Count, "descriptor")}, {Plural(content.Lessons.Count, "lesson")}, {Plural(content.Lessons.Sum(l => l.Items.Count), "item")}, {Plural(content.Cards.Count, "word card")}, {Plural(content.Packs.Count, "language pack")}."
            : $"Found {issues.Count} problem(s).");
        return issues.Count == 0 ? 0 : 1;

    case "coverage":
        if (issues.Count > 0)
        {
            Console.Error.WriteLine("Content has validation problems. Run 'validate' first.");
            return 1;
        }

        var report = CoverageReport.Build(content);
        var markdown = report.ToMarkdown()
            + VocabularyCoverage.ToMarkdown(VocabularyCoverage.Build(content))
            + CoreListCoverage.ToMarkdown(CoreListCoverage.Build(content))
            + ReviewReport.ToMarkdown(content);
        Console.WriteLine(markdown);
        if (options.SummaryFile is { } summaryFile)
        {
            File.AppendAllText(summaryFile, markdown);
        }

        var gaps = report.GapsAt(options.EnforcedLevels);
        foreach (var gap in gaps)
        {
            Console.Error.WriteLine($"Coverage gap: {gap.Descriptor.Id} ({gap.Descriptor.Skill}) has no items.");
        }
        return gaps.Count == 0 ? 0 : 1;

    case "speech" when options.OutFile is { } outFile:
        if (issues.Count > 0)
        {
            Console.Error.WriteLine("Content has validation problems. Run 'validate' first.");
            return 1;
        }

        var entries = SpeechManifest.Build(content);
        File.WriteAllText(outFile, JsonSerializer.Serialize(entries, SpeechJson));
        Console.WriteLine($"Wrote {Plural(entries.Count, "text")} to {outFile}.");
        return 0;

    default:
        Console.Error.WriteLine(usage);
        return 2;
}

static string Plural(int count, string noun) => count == 1 ? $"1 {noun}" : $"{count} {noun}s";

static CliOptions? ParseOptions(string[] rest)
{
    string? summary = null;
    string? output = null;
    var levels = new List<string>();
    for (var i = 0; i < rest.Length; i++)
    {
        switch (rest[i])
        {
            case "--summary" when i + 1 < rest.Length:
                summary = rest[++i];
                break;
            case "--out" when i + 1 < rest.Length:
                output = rest[++i];
                break;
            case "--enforce" when i + 1 < rest.Length:
                levels.AddRange(rest[++i].Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
                break;
            default:
                return null;
        }
    }
    return new CliOptions(summary, levels, output);
}

internal sealed record CliOptions(string? SummaryFile, IReadOnlyList<string> EnforcedLevels, string? OutFile);

internal static partial class Program
{
    // Keep Norwegian letters readable in the output instead of \u escapes.
    private static readonly JsonSerializerOptions SpeechJson = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        WriteIndented = true,
    };
}
