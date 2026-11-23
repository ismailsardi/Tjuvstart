namespace Tjuvstart.ContentCli;

public sealed record ValidationIssue(string File, string Message);

public sealed record Descriptor(string Id, string Level, string Skill, string Text);

public sealed record LessonItem(string Id, string Skill, string Level, IReadOnlyList<string> Descriptors);

public sealed record Lesson(string Id, string Level, string Title, string File, IReadOnlyList<LessonItem> Items);

/// <summary>Everything loaded from a content folder, plus the problems found while loading it.</summary>
public sealed record ContentSet(
    IReadOnlyList<Descriptor> Descriptors,
    IReadOnlyList<Lesson> Lessons,
    IReadOnlyList<ValidationIssue> Issues);
