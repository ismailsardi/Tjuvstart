using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Options;
using Tjuvstart.SyncApi.Hosting;

namespace Tjuvstart.SyncApi.Tests;

[Collection(ApiTestGroup.Name)]
public sealed class WebClientOptionsTests(PostgresFixture postgres)
{
    [Theory]
    [InlineData("https://ismailsardi.github.io")]
    [InlineData("http://localhost:5173")]
    public void Accepts_plain_origins(string origin)
    {
        Assert.Empty(Validate(origin));
    }

    [Theory]
    [InlineData("https://ismailsardi.github.io/")]
    [InlineData("https://ismailsardi.github.io/Tjuvstart")]
    [InlineData("ismailsardi.github.io")]
    [InlineData("ftp://example.com")]
    [InlineData("*")]
    public void Rejects_values_that_are_not_origins(string origin)
    {
        Assert.Single(Validate(origin));
    }

    [Fact]
    public void Startup_fails_with_an_invalid_origin()
    {
        using var factory = new SyncApiFactory(postgres).WithWebHostBuilder(b =>
            b.UseSetting("WebClient:AllowedOrigins:0", "https://ismailsardi.github.io/Tjuvstart/"));

        Assert.Throws<OptionsValidationException>(() => factory.CreateClient());
    }

    private static List<ValidationResult> Validate(string origin)
    {
        var options = new WebClientOptions { AllowedOrigins = [origin] };
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(options, new ValidationContext(options), results, validateAllProperties: true);
        return results;
    }
}
