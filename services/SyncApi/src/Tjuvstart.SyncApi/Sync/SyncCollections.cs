namespace Tjuvstart.SyncApi.Sync;

/// <summary>How a collection merges changes from several devices (ADR 0011).</summary>
public enum MergeRule
{
    /// <summary>Rows are written once and never change. A row the server already has is ignored.</summary>
    AppendOnly,

    /// <summary>The newest version of each record wins, by the client's update time.</summary>
    LastWriterWins,
}

/// <summary>The client tables that sync. The AI settings table is deliberately not here.</summary>
public static class SyncCollections
{
    public static readonly IReadOnlyDictionary<string, MergeRule> All = new Dictionary<string, MergeRule>
    {
        ["profiles"] = MergeRule.LastWriterWins,
        ["cards"] = MergeRule.LastWriterWins,
        ["completions"] = MergeRule.LastWriterWins,
        ["attempts"] = MergeRule.AppendOnly,
        ["reviews"] = MergeRule.AppendOnly,
        ["shadowing"] = MergeRule.AppendOnly,
    };
}
