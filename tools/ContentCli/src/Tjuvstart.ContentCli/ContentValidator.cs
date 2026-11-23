namespace Tjuvstart.ContentCli;

/// <summary>
/// Cross-file checks on loaded content: unique ids, known descriptor references, and items
/// whose skill and level agree with the descriptors they claim to cover.
/// </summary>
public static class ContentValidator
{
    public static IReadOnlyList<ValidationIssue> Validate(ContentSet content)
    {
        var issues = new List<ValidationIssue>(content.Issues);

        var descriptors = new Dictionary<string, Descriptor>(StringComparer.Ordinal);
        foreach (var descriptor in content.Descriptors)
        {
            if (!descriptors.TryAdd(descriptor.Id, descriptor))
            {
                issues.Add(new ValidationIssue(ContentLoader.DescriptorsFile, $"Duplicate descriptor id '{descriptor.Id}'."));
            }
            else if (!descriptor.Id.StartsWith(descriptor.Level + "-", StringComparison.Ordinal))
            {
                issues.Add(new ValidationIssue(ContentLoader.DescriptorsFile, $"Descriptor '{descriptor.Id}' does not match its level {descriptor.Level}."));
            }
        }

        var lessonIds = new Dictionary<string, string>(StringComparer.Ordinal);
        var itemIds = new Dictionary<string, string>(StringComparer.Ordinal);

        foreach (var lesson in content.Lessons)
        {
            if (!lessonIds.TryAdd(lesson.Id, lesson.File))
            {
                issues.Add(new ValidationIssue(lesson.File, $"Duplicate lesson id '{lesson.Id}' (first defined in {lessonIds[lesson.Id]})."));
            }

            foreach (var item in lesson.Items)
            {
                if (!itemIds.TryAdd(item.Id, lesson.File))
                {
                    issues.Add(new ValidationIssue(lesson.File, $"Duplicate item id '{item.Id}' (first defined in {itemIds[item.Id]})."));
                }

                foreach (var reference in item.Descriptors)
                {
                    if (!descriptors.TryGetValue(reference, out var descriptor))
                    {
                        issues.Add(new ValidationIssue(lesson.File, $"Item '{item.Id}' references unknown descriptor '{reference}'."));
                    }
                    else if (descriptor.Skill != item.Skill)
                    {
                        issues.Add(new ValidationIssue(lesson.File, $"Item '{item.Id}' is a {item.Skill} item but descriptor '{reference}' is {descriptor.Skill}."));
                    }
                    else if (descriptor.Level != item.Level)
                    {
                        issues.Add(new ValidationIssue(lesson.File, $"Item '{item.Id}' is level {item.Level} but descriptor '{reference}' is {descriptor.Level}."));
                    }
                }
            }
        }

        return issues;
    }
}
