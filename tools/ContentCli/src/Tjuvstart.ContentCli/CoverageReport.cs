using System.Text;

namespace Tjuvstart.ContentCli;

public sealed record DescriptorCoverage(Descriptor Descriptor, int Lessons, int Items)
{
    public bool IsCovered => Items > 0;
}

/// <summary>How many lessons and items cover each CEFR descriptor.</summary>
public sealed class CoverageReport
{
    private CoverageReport(IReadOnlyList<DescriptorCoverage> rows) => Rows = rows;

    public IReadOnlyList<DescriptorCoverage> Rows { get; }

    public static CoverageReport Build(ContentSet content)
    {
        var rows = content.Descriptors
            .Select(d =>
            {
                var lessons = content.Lessons.Count(l => l.Items.Any(i => i.Descriptors.Contains(d.Id)));
                var items = content.Lessons.Sum(l => l.Items.Count(i => i.Descriptors.Contains(d.Id)));
                return new DescriptorCoverage(d, lessons, items);
            })
            .ToList();
        return new CoverageReport(rows);
    }

    /// <summary>Descriptors at the given levels that no item covers yet.</summary>
    public IReadOnlyList<DescriptorCoverage> GapsAt(IReadOnlyCollection<string> levels) =>
        Rows.Where(r => !r.IsCovered && levels.Contains(r.Descriptor.Level)).ToList();

    public string ToMarkdown()
    {
        var sb = new StringBuilder();
        sb.AppendLine("## CEFR descriptor coverage");
        sb.AppendLine();

        foreach (var level in Rows.Select(r => r.Descriptor.Level).Distinct())
        {
            var atLevel = Rows.Where(r => r.Descriptor.Level == level).ToList();
            sb.AppendLine($"### {level}: {atLevel.Count(r => r.IsCovered)} of {atLevel.Count} covered");
            sb.AppendLine();
            sb.AppendLine("| Descriptor | Skill | Lessons | Items | Can-do statement |");
            sb.AppendLine("| --- | --- | ---: | ---: | --- |");
            foreach (var row in atLevel)
            {
                var mark = row.IsCovered ? "" : " (gap)";
                sb.AppendLine($"| {row.Descriptor.Id}{mark} | {row.Descriptor.Skill} | {row.Lessons} | {row.Items} | {row.Descriptor.Text} |");
            }
            sb.AppendLine();
        }

        return sb.ToString();
    }
}
