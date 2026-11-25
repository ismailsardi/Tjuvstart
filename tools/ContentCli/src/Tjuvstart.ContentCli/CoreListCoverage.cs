using System.Text;

namespace Tjuvstart.ContentCli;

public sealed record CoreListLevel(string Level, int Words, int WithCard, IReadOnlyList<CoreWord> NextMissing);

/// <summary>
/// How much of the frequency-ranked core word list has a word card. A list word counts as covered
/// when a card has it as its dictionary form or lists it among its forms, whatever the part of
/// speech: the list and the cards do not always file a word in the same class ("mange" is an
/// adjective in Norsk Ordbank and a determiner on its card).
/// </summary>
public static class CoreListCoverage
{
    public const int NextCount = 10;

    public static IReadOnlyList<CoreListLevel> Build(ContentSet content)
    {
        var known = content.Cards
            .SelectMany(c => c.Forms.Append(c.Nb.ToLowerInvariant()))
            .ToHashSet(StringComparer.Ordinal);

        return content.CoreList
            .GroupBy(w => w.Level)
            .OrderBy(g => g.Key, StringComparer.Ordinal)
            .Select(g =>
            {
                var missing = g.Where(w => !known.Contains(w.Lemma)).OrderBy(w => w.Rank).ToList();
                return new CoreListLevel(g.Key, g.Count(), g.Count() - missing.Count, missing.Take(NextCount).ToList());
            })
            .ToList();
    }

    public static string ToMarkdown(IReadOnlyList<CoreListLevel> rows)
    {
        if (rows.Count == 0)
        {
            return "";
        }

        var sb = new StringBuilder();
        sb.AppendLine("## Core word list");
        sb.AppendLine();
        sb.AppendLine("Words from `vocab/core-list.tsv` that have a card, by frequency band.");
        sb.AppendLine();
        sb.AppendLine($"| Level | With a card | Most frequent without one |");
        sb.AppendLine("| --- | ---: | --- |");
        foreach (var row in rows)
        {
            var next = row.NextMissing.Count == 0 ? "none" : string.Join(", ", row.NextMissing.Select(w => w.Lemma));
            sb.AppendLine($"| {row.Level} | {row.WithCard} of {row.Words} | {next} |");
        }
        sb.AppendLine();
        return sb.ToString();
    }
}
