namespace Tjuvstart.ContentCli.Tests;

public sealed class AlphabetTests : IDisposable
{
    private readonly ContentFixture _content = new();

    public AlphabetTests() => _content.WriteDescriptors(("A2-W-01", "writing"));

    public void Dispose() => _content.Dispose();

    private static string Letter(char letter, string example) =>
        $$"""{ "letter": "{{letter}}", "name": "{{char.ToLowerInvariant(letter)}}", "example": "{{example}}" }""";

    private void WriteAlphabet(Func<char, string> example) =>
        _content.Write(ContentLoader.AlphabetFile, $$"""
            { "letters": [ {{string.Join(", ", ContentValidator.NorwegianAlphabet.Select(c => Letter(c, example(c))))}} ] }
            """);

    [Fact]
    public void Loads_the_alphabet_and_records_letter_names_and_examples()
    {
        WriteAlphabet(c => $"{char.ToLowerInvariant(c)}ord");

        var content = ContentLoader.Load(_content.Root);

        Assert.Empty(ContentValidator.Validate(content));
        Assert.Equal(29, content.Alphabet.Count);
        var texts = SpeechManifest.Build(content).Select(e => e.Text).ToList();
        Assert.Contains("ø", texts);
        Assert.Contains("øord", texts);
    }

    [Fact]
    public void Rejects_an_example_without_its_letter()
    {
        WriteAlphabet(c => c == 'Å' ? "ord" : $"{char.ToLowerInvariant(c)}ord");

        Assert.Contains(
            "Example 'ord' does not contain the letter Å.",
            ContentValidator.Validate(ContentLoader.Load(_content.Root)).Select(i => i.Message));
    }

    [Fact]
    public void Rejects_letters_out_of_order()
    {
        var swapped = "BACDEFGHIJKLMNOPQRSTUVWXYZÆØÅ";
        _content.Write(ContentLoader.AlphabetFile, $$"""
            { "letters": [ {{string.Join(", ", swapped.Select(c => Letter(c, $"{char.ToLowerInvariant(c)}ord")))}} ] }
            """);

        Assert.Contains(
            ContentValidator.Validate(ContentLoader.Load(_content.Root)),
            i => i.File == ContentLoader.AlphabetFile && i.Message.StartsWith("Letters must be"));
    }
}
