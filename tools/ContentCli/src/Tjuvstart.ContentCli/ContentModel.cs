namespace Tjuvstart.ContentCli;

public sealed record ValidationIssue(string File, string Message);

public sealed record Descriptor(string Id, string Level, string Skill, string Text);

public sealed record LessonItem(
    string Id, string Skill, string Level, IReadOnlyList<string> Descriptors, string? Audio = null);

public sealed record Lesson(
    string Id,
    string Level,
    string Title,
    string File,
    IReadOnlyList<LessonItem> Items,
    string? Text = null,
    string Review = Lesson.Pending)
{
    public const string Pending = "pending";
    public const string Approved = "approved";

    public bool IsApproved => Review == Approved;
}

/// <summary>A word card. Meanings live in the language packs, keyed by <see cref="Id"/>.</summary>
public sealed record Card(
    string Id,
    string Level,
    string Nb,
    IReadOnlyList<string> Forms,
    string File,
    string? Example = null,
    string? Pos = null,
    string? Gender = null)
{
    /// <summary>The word as the card shows it: "en jobb", "å jobbe". Same rule as the web app.</summary>
    public string Label => Pos switch
    {
        "noun" when Gender is not null => $"{Gender} {Nb}",
        "verb" => $"å {Nb}",
        _ => Nb,
    };
}

/// <summary>A native-language pack, reduced to what cross-file checks need.</summary>
public sealed record LanguagePack(
    string Language,
    string Folder,
    string File,
    IReadOnlyList<string> Forms,
    IReadOnlyList<string> ItemNoteIds,
    IReadOnlyList<string> LessonRefs,
    IReadOnlyList<string>? WordIds = null,
    IReadOnlyList<string>? TrackRefs = null,
    IReadOnlyList<string>? CanDoRefs = null);

/// <summary>A guided path through lessons, in order.</summary>
public sealed record Track(string Id, string Title, IReadOnlyList<string> Lessons);

/// <summary>One letter on the alphabet page: the letter, how it is said, and an example word.</summary>
public sealed record AlphabetLetter(string Letter, string Name, string Example);

/// <summary>Everything loaded from a content folder, plus the problems found while loading it.</summary>
public sealed record ContentSet(
    IReadOnlyList<Descriptor> Descriptors,
    IReadOnlyList<Lesson> Lessons,
    IReadOnlyList<LanguagePack> Packs,
    IReadOnlyList<ValidationIssue> Issues)
{
    public IReadOnlyList<Card> Cards { get; init; } = [];

    public IReadOnlyList<Track> Tracks { get; init; } = [];

    public IReadOnlyList<AlphabetLetter> Alphabet { get; init; } = [];

    /// <summary>Lesson-text words that need no card, such as names.</summary>
    public IReadOnlySet<string> IgnoredWords { get; init; } = new HashSet<string>();
}
