using System.Text;

namespace Tjuvstart.ContentCli;

/// <summary>
/// Which lessons a native speaker has approved. Every lesson starts as pending, and only
/// approved lessons are meant to ship in the store apps. New language packs are also marked
/// pending until a speaker of that language has checked the translations.
/// </summary>
public static class ReviewReport
{
    public static IReadOnlyList<Lesson> Pending(ContentSet content) =>
        content.Lessons.Where(l => !l.IsApproved).OrderBy(l => l.Level).ThenBy(l => l.Id, StringComparer.Ordinal).ToList();

    public static IReadOnlyList<LanguagePack> PendingPacks(ContentSet content) =>
        content.Packs.Where(p => !p.IsApproved).OrderBy(p => p.Language, StringComparer.Ordinal).ToList();

    public static string ToMarkdown(ContentSet content)
    {
        var pending = Pending(content);
        var pendingPacks = PendingPacks(content);
        var sb = new StringBuilder();
        sb.AppendLine("## Native-speaker review");
        sb.AppendLine();
        sb.AppendLine($"{content.Lessons.Count - pending.Count} of {content.Lessons.Count} lessons approved.");
        sb.AppendLine();
        if (pendingPacks.Count > 0)
        {
            sb.AppendLine($"Language packs waiting for review: {string.Join(", ", pendingPacks.Select(p => p.Language))}.");
            sb.AppendLine();
        }

        if (pending.Count == 0)
        {
            return sb.ToString();
        }

        sb.AppendLine("| Level | Waiting for review |");
        sb.AppendLine("| --- | --- |");
        foreach (var level in pending.GroupBy(l => l.Level))
        {
            sb.AppendLine($"| {level.Key} | {string.Join(", ", level.Select(l => l.Id))} |");
        }
        sb.AppendLine();
        return sb.ToString();
    }
}
