using System.Text;
using System.Text.RegularExpressions;

namespace Tjuvstart.ContentCli;

public sealed record LevelVocabulary(string Level, int Cards, int LessonWords, IReadOnlyList<string> Missing)
{
    public int Covered => LessonWords - Missing.Count;
}

/// <summary>
/// Compares the words used in lesson texts with the word cards. A lesson word is covered when any
/// card lists it as a form, at any level; names and other exceptions come from <c>vocab/ignore.json</c>.
/// </summary>
public static partial class VocabularyCoverage
{
    public static IReadOnlyList<LevelVocabulary> Build(ContentSet content)
    {
        var known = content.Cards.SelectMany(c => c.Forms).ToHashSet(StringComparer.Ordinal);
        var levels = content.Lessons.Select(l => l.Level)
            .Concat(content.Cards.Select(c => c.Level))
            .Distinct()
            .Order(StringComparer.Ordinal);

        return levels
            .Select(level =>
            {
                var words = content.Lessons
                    .Where(l => l.Level == level && l.Text is not null)
                    .SelectMany(l => Tokens(l.Text!))
                    .Where(w => !content.IgnoredWords.Contains(w))
                    .ToHashSet(StringComparer.Ordinal);
                var missing = words.Where(w => !known.Contains(w)).Order(StringComparer.Ordinal).ToList();
                return new LevelVocabulary(level, content.Cards.Count(c => c.Level == level), words.Count, missing);
            })
            .ToList();
    }

    public static IEnumerable<string> Tokens(string text) =>
        WordPattern().Matches(text).Select(m => m.Value.ToLowerInvariant());

    public static string ToMarkdown(IReadOnlyList<LevelVocabulary> rows)
    {
        var sb = new StringBuilder();
        sb.AppendLine("## Vocabulary coverage");
        sb.AppendLine();
        sb.AppendLine("| Level | Cards | Lesson words with a card | Missing |");
        sb.AppendLine("| --- | ---: | ---: | --- |");
        foreach (var row in rows)
        {
            var missing = row.Missing.Count == 0 ? "none" : string.Join(", ", row.Missing);
            sb.AppendLine($"| {row.Level} | {row.Cards} | {row.Covered} of {row.LessonWords} | {missing} |");
        }
        sb.AppendLine();
        return sb.ToString();
    }

    [GeneratedRegex("[A-Za-zÆØÅæøå]+")]
    private static partial Regex WordPattern();
}
