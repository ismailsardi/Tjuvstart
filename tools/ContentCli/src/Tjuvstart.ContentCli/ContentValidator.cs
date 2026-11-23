namespace Tjuvstart.ContentCli;

/// <summary>
/// Cross-file checks on loaded content: unique ids, known descriptor references, items whose
/// skill and level agree with their descriptors, language packs that point at real items,
/// and word cards that have a meaning in every pack.
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

        var cardIds = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var card in content.Cards)
        {
            if (!cardIds.TryAdd(card.Id, card.File))
            {
                issues.Add(new ValidationIssue(card.File, $"Duplicate card id '{card.Id}' (first defined in {cardIds[card.Id]})."));
            }

            foreach (var form in card.Forms.GroupBy(f => f).Where(g => g.Count() > 1).Select(g => g.Key))
            {
                issues.Add(new ValidationIssue(card.File, $"Card '{card.Id}' lists form '{form}' more than once."));
            }
        }

        foreach (var pack in content.Packs)
        {
            var words = new HashSet<string>(pack.WordIds ?? [], StringComparer.Ordinal);
            foreach (var cardId in cardIds.Keys.Where(id => !words.Contains(id)))
            {
                issues.Add(new ValidationIssue(pack.File, $"No meaning for card '{cardId}'."));
            }

            foreach (var wordId in words.Where(id => !cardIds.ContainsKey(id)))
            {
                issues.Add(new ValidationIssue(pack.File, $"Meaning for unknown card '{wordId}'."));
            }

            if (pack.Language != pack.Folder)
            {
                issues.Add(new ValidationIssue(pack.File, $"Language '{pack.Language}' does not match folder '{pack.Folder}'."));
            }

            foreach (var form in pack.Forms.GroupBy(f => f).Where(g => g.Count() > 1).Select(g => g.Key))
            {
                issues.Add(new ValidationIssue(pack.File, $"Word form '{form}' is listed more than once."));
            }

            foreach (var itemId in pack.ItemNoteIds.Where(id => !itemIds.ContainsKey(id)))
            {
                issues.Add(new ValidationIssue(pack.File, $"Note for unknown item '{itemId}'."));
            }

            foreach (var lessonId in pack.LessonRefs.Where(id => !lessonIds.ContainsKey(id)).Distinct())
            {
                issues.Add(new ValidationIssue(pack.File, $"Reference to unknown lesson '{lessonId}'."));
            }

            foreach (var trackId in (pack.TrackRefs ?? []).Where(id => content.Tracks.All(t => t.Id != id)))
            {
                issues.Add(new ValidationIssue(pack.File, $"Summary for unknown track '{trackId}'."));
            }
        }

        var trackIds = new HashSet<string>(StringComparer.Ordinal);
        foreach (var track in content.Tracks)
        {
            if (!trackIds.Add(track.Id))
            {
                issues.Add(new ValidationIssue(ContentLoader.TracksFile, $"Duplicate track id '{track.Id}'."));
            }

            foreach (var lessonId in track.Lessons.Where(id => !lessonIds.ContainsKey(id)))
            {
                issues.Add(new ValidationIssue(ContentLoader.TracksFile, $"Track '{track.Id}' lists unknown lesson '{lessonId}'."));
            }
        }

        return issues;
    }
}
