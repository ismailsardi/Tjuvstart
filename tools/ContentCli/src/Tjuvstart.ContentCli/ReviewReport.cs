using System.Text;

namespace Tjuvstart.ContentCli;

/// <summary>
/// Which lessons a native speaker has approved. Every lesson starts as pending, and only
/// approved lessons are meant to ship in the store apps.
/// </summary>
public static class ReviewReport
{
    public static IReadOnlyList<Lesson> Pending(ContentSet content) =>
        content.Lessons.Where(l => !l.IsApproved).OrderBy(l => l.Level).ThenBy(l => l.Id, StringComparer.Ordinal).ToList();

    public static string ToMarkdown(ContentSet content)
    {
        var pending = Pending(content);
        var sb = new StringBuilder();
        sb.AppendLine("## Native-speaker review");
        sb.AppendLine();
        sb.AppendLine($"{content.Lessons.Count - pending.Count} of {content.Lessons.Count} lessons approved.");
        sb.AppendLine();
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
