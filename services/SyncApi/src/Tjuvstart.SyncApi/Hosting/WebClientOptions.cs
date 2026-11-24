using System.ComponentModel.DataAnnotations;

namespace Tjuvstart.SyncApi.Hosting;

/// <summary>
/// The browser origins allowed to call the API. The web app is a static PWA on another
/// origin (GitHub Pages in production, Vite on localhost in development), so CORS is required.
/// </summary>
public sealed class WebClientOptions : IValidatableObject
{
    public const string SectionName = "WebClient";

    [Required, MinLength(1)]
    public string[] AllowedOrigins { get; set; } = [];

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        foreach (var origin in AllowedOrigins)
        {
            if (!IsOrigin(origin))
            {
                yield return new ValidationResult(
                    $"'{origin}' is not an origin. Use scheme, host and optional port only, for example https://example.github.io.",
                    [nameof(AllowedOrigins)]);
            }
        }
    }

    private static bool IsOrigin(string value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp)
        && uri.AbsolutePath == "/"
        && string.IsNullOrEmpty(uri.Query)
        && string.IsNullOrEmpty(uri.Fragment)
        && !value.EndsWith('/');
}
