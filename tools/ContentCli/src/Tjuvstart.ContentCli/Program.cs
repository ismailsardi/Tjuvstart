using Tjuvstart.ContentCli;

const string usage = "Usage: tjuvstart-content validate <content-folder>";

if (args is not ["validate", var contentRoot])
{
    Console.Error.WriteLine(usage);
    return 2;
}

var issues = ContentValidator.Validate(contentRoot);
foreach (var issue in issues)
{
    Console.Error.WriteLine($"{issue.File}: {issue.Message}");
}

Console.WriteLine(issues.Count == 0
    ? "Content is valid."
    : $"Found {issues.Count} problem(s).");

return issues.Count == 0 ? 0 : 1;
