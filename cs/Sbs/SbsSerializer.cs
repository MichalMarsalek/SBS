using System.Text;
using System.Text.RegularExpressions;

namespace Sbs;

public static class SbsSerializer
{
    /// <summary>
    /// Serializes a list of pairs into SBS.
    /// </summary>
    /// <param name="pairs">Pairs to serialize</param>
    /// <param name="separator">Separator of left and right items in the pairs (without or without the spaces)</param>
    /// <param name="preferImplicitSeparator">Separator of left and right items in the pairs (without or without the spaces)</param>
    /// <param name="comments">Either null - empty lines are used to delimit individual pairs or N+1 strings where N is the length of <see cref="pairs"/>. Null indicates that nothing should be appended - but that's only allowed before the first pair and after the last pair.</param>
    /// <returns>An SBS document.</returns>
    public static string Serialize(IList<(string, string)> pairs, string separator, bool preferImplicitSeparator = true, bool alignGlobally = false, IList<string?>? comments = null)
    {
        if (!separator.StartsWith(' ')) separator = ' ' + separator;
        if (!separator.EndsWith(' ')) separator += ' ';
        if (comments != null && comments.Count != pairs.Count + 1)
        {
            throw new ArgumentException("The length of `comments` must be one more than the length of `pairs˛.");
        }
        if (comments != null && comments.Select((x, i) => (x, i)).Any(X => X.i != 0 && X.i != pairs.Count && X.x == null)) {
            throw new ArgumentException("Only the first and last comment can be null.");
        }
        var builder = new StringBuilder();
        if (!preferImplicitSeparator) builder.AppendLine(separator.Trim());
        var pairIndex = 0;
        var pairsAsLines = pairs.Select(pair => (pair.Item1.GetLines(), pair.Item2.GetLines())).ToList();
        var globalLeftWidth = pairsAsLines.Max(pair => pair.Item1.Max(line => line.Length));
        foreach (var (left, right) in pairsAsLines)
        {
            if (pairIndex == 0)
            {
                if (comments != null && comments[pairIndex] != null)
                {
                    builder.AppendLine(comments[pairIndex]);
                }
            }
            else
            {
                builder.AppendLine(comments != null ? comments[pairIndex] : "");
            }
            pairIndex++;
            var linesLength = Math.Max(left.Count, right.Count);
            var leftWidth = alignGlobally ? globalLeftWidth : left.Max(line => line.Length);
            for (var i = 0; i < linesLength; i++)
            {
                builder
                    .Append(i < linesLength ? left[i].PadRight(leftWidth) : "")
                    .Append(separator)
                    .AppendLine(i < linesLength ? right[i] : "");
            }
        }
        if (comments != null && comments[pairIndex] != null)
        {
            builder.AppendLine(comments[pairIndex]);
        }

        var result = builder.ToString().ReplaceLineEndings()[..^Environment.NewLine.Length];
        if (preferImplicitSeparator) {
            string? inferredSeparator;
            try
            {
                inferredSeparator = InferSeparator(result, result.GetLines())?.Trim();
            }
            catch
            {
                inferredSeparator = null;
            }
            if (inferredSeparator != separator.Trim())
            {
                result = separator.Trim() + Environment.NewLine + result;
            }
        }
        return result;
    }

    private static string InferSeparator(string document, IList<string> lines)
    {
        var separatorCandidates = Regex.Matches(document, @" [^a-zA-Z0-9\s]{1,5} ")
            .Select(x => x.Value)
            .Distinct()
            .ToList();
        if (separatorCandidates.Count == 0)
        {
            throw new ArgumentException("No separator found.");
        }
        var separatorFrequencies = separatorCandidates.Select(x => new
        {
            Separator = x,
            Frequency = lines.Count(line => line.Split(x).Length == 2)
        }).ToList();
        var maxFrequency = separatorFrequencies.Max(x => x.Frequency);
        var maxSeparators = separatorFrequencies.Where(x => x.Frequency == maxFrequency).ToList();
        if (maxSeparators.Count != 1)
        {
            throw new ArgumentException($"Separator ambiguous, candidates: {string.Join(' ', maxSeparators.Select(x => x.Separator.Trim()))}");
        }
        return maxSeparators[0].Separator;
    }

    private static string GetSeparator(string document, IList<string> lines)
    {
        if (Regex.IsMatch(lines[0], @"^[^a-zA-Z0-9\s]{1,5}$"))
        {
            var separator = ' ' + lines[0] + ' ';
            lines.RemoveAt(0);
            return separator;
        }
        return InferSeparator(document, lines);
    }

    public static DeserializationResult Deserialize(string document)
    {
        var documentLines = document.GetLines();
        var separator = GetSeparator(document, documentLines);

        var rawPairs = new List<List<string>>();
        var comments = new List<string?>();

        string? currentComment = null;
        List<string>? currentPair = null;
        foreach (var line in documentLines)
        {
            if (line.Contains(separator))
            {
                if (currentComment != null || comments.Count == 0)
                {
                    comments.Add(currentComment);
                    currentComment = null;
                }
                currentPair ??= [];
                currentPair.Add(line);
            }
            else
            {
                if (currentPair != null)
                {
                    rawPairs.Add(currentPair);
                    currentPair = null;
                }
                currentComment = currentComment == null ? line : currentComment + Environment.NewLine + line;
            }
        }
        if (currentPair != null)
        {
            rawPairs.Add(currentPair);
        }
        comments.Add(currentComment);

        var pairs = rawPairs.Select(pairLines =>
        {
            var separatorLocationsPerLine = pairLines.Select(pairLine =>
            {
                var indexes = new List<int>();
                var index = 0;
                while (true)
                {
                    index = pairLine.IndexOf(separator, index);
                    if (index == -1) break;
                    indexes.Add(index);
                    index++;
                }
                return indexes;
            }).ToList();
            var separatorLocationsFrequencies = separatorLocationsPerLine.SelectMany(x => x).GroupBy(x => x).ToDictionary(x => x.Key, x => x.Count());
            var pairLinesSeparated = pairLines.Select((pairLine, i) =>
            {
                var separatorLocation = separatorLocationsPerLine[i].MaxBy(x => separatorLocationsFrequencies[x]);
                var left = pairLine[..separatorLocation];
                var right = pairLine[(separatorLocation + separator.Length)..];
                return (left, right);
            }).ToList();
            var extraRightWhitespace = 0;
            while (pairLinesSeparated.All(x => extraRightWhitespace < x.right.Length && char.IsWhiteSpace(x.right[extraRightWhitespace])))
            {
                extraRightWhitespace++;
            }
            var extraLeftWhitespace = 0;
            while (pairLinesSeparated.All(x => extraLeftWhitespace + 1 <= x.left.Length && char.IsWhiteSpace(x.left[^(extraLeftWhitespace + 1)])))
            {
                extraLeftWhitespace++;
            }
            var left = string.Join(Environment.NewLine, pairLinesSeparated.Select(x => x.left.TrimEnd()));
            var right = string.Join(Environment.NewLine, pairLinesSeparated.Select(x => x.right[extraRightWhitespace..]));
            return (left, right, extraLeftWhitespace, extraRightWhitespace);
        }).ToList();

        separator = new string(' ', pairs.Select(x => x.extraLeftWhitespace).Min()) + separator + new string(' ', pairs.Select(x => x.extraRightWhitespace).Min());

        return new DeserializationResult(separator, pairs.Select(x => (x.left, x.right)).ToList(), comments);
    }
}

public record DeserializationResult(string Separator, IList<(string, string)> Pairs, IList<string?> Comments);
