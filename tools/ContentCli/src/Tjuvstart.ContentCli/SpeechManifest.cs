using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace Tjuvstart.ContentCli;

/// <summary>One piece of Norwegian text that gets a recorded audio file.</summary>
/// <param name="Key">A stable file name derived from the text, so unchanged text keeps its audio.</param>
public sealed record SpeechEntry(string Key, string Text);

/// <summary>
/// Lists everything the app can read aloud: each sentence of a lesson text, the message of each
/// listening item, each word card (as labelled, with its article) with its example, and each
/// letter name and example word on the alphabet page. The audio build turns every entry into
/// <c>audio/&lt;voice&gt;-&lt;key&gt;.mp3</c>.
/// </summary>
public static partial class SpeechManifest
{
    public static IReadOnlyList<SpeechEntry> Build(ContentSet content)
    {
        var texts = content.Lessons
            .SelectMany(lesson => Sentences(lesson.Text ?? ""))
            // Listening items play their whole message in one go, so they are not split.
            .Concat(content.Lessons.SelectMany(lesson => lesson.Items).Select(item => item.Audio ?? ""))
            .Concat(content.Cards.SelectMany(card => new[] { card.Label, card.Example ?? "" }))
            .Concat(content.Alphabet.SelectMany(letter => new[] { letter.Name, letter.Example }));

        return texts
            .Select(Normalize)
            .Where(text => text.Length > 0)
            .Distinct(StringComparer.Ordinal)
            .Select(text => new SpeechEntry(Key(text), text))
            .OrderBy(entry => entry.Key, StringComparer.Ordinal)
            .ToList();
    }

    /// <summary>
    /// Splits a text after sentence-final punctuation and at line breaks. The web app splits
    /// lesson texts the same way, so each sentence it shows has its own audio. A period after a
    /// digit ends no sentence: "3. mars" is a date.
    /// </summary>
    public static IReadOnlyList<string> Sentences(string text) =>
        SentenceBreak().Split(text).Select(Normalize).Where(s => s.Length > 0).ToList();

    public static string Normalize(string text) => Whitespace().Replace(text, " ").Trim();

    /// <summary>The first 16 hex digits of the SHA-256 of the normalized text.</summary>
    public static string Key(string text) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(Normalize(text))))[..16];

    [GeneratedRegex(@"(?<=(?<!\d)[.!?…]»?)\s+|\n+")]
    private static partial Regex SentenceBreak();

    [GeneratedRegex(@"\s+")]
    private static partial Regex Whitespace();
}
