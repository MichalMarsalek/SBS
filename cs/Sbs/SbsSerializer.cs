using System.Text;
using System.Text.RegularExpressions;

namespace Sbs;

public static class SbsSerializer
{
    /// <summary>
    /// Serializes a list of pairs into SBS.
    /// </summary>
    /// <param name="pairs">Pairs to serialize</param>
    /// <param name="separator">Separator of left and right items in the pairs (without the spaces)</param>
    /// <param name="comments">Either null - empty lines are used to delimit individual pairs or N+1 strings where N is the length of <see cref="pairs"/>. Null indicates that nothing should be appended - but that's only allowed before the first pair and after the last pair.</param>
    /// <returns></returns>
    public static string Serialize(IList<(string, string)> pairs, string separator, IList<string?>? comments = null)
    {
        separator = ' ' + separator + ' ';
        if (comments != null && comments.Count != pairs.Count + 1)
        {
            throw new ArgumentException("The length of `comments` must be one more than the length of `pairs˛.");
        }
        if (comments != null && comments.Select((x, i) => (x, i)).Any(X => X.i != 0 && X.i != pairs.Count && X.x == null)) {
            throw new ArgumentException("Only the first and last comment can be null.");
        }
        var builder = new StringBuilder();
        var pairIndex = 0;
        foreach (var (left, right) in pairs)
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
            var leftLines = left.Split(["\n", "\r\n", "\r"], StringSplitOptions.None);
            var rightLines = right.Split(["\n", "\r\n", "\r"], StringSplitOptions.None);
            var linesLength = Math.Max(leftLines.Length, rightLines.Length);
            var leftWidth = leftLines.Max(line => line.Length);
            for (var i = 0; i < linesLength; i++)
            {
                builder
                    .Append(i < linesLength ? leftLines[i].PadRight(leftWidth) : "")
                    .Append(separator)
                    .AppendLine(i < linesLength ? rightLines[i] : "");
            }
        }
        if (comments != null && comments[pairIndex] != null)
        {
            builder.AppendLine(comments[pairIndex]);
        }

        return builder.ToString().ReplaceLineEndings();
    }

    public static DeserializationResult Deserialize(string document)
    {
        var separatorCandidates = Regex.Matches(document, @" [^a-zA-Z0-9\s]{1,5} ")
            .Select(x => x.Groups[1].Value)
            .Distinct()
            .ToList();
        if (separatorCandidates.Count == 0)
        {
            throw new ArgumentException("No separator found.");
        }
        var documentLines = document.Split(["\n", "\r\n", "\r"], StringSplitOptions.None);
        var separatorFrequencies = separatorCandidates.Select(x => new
        {
            Separator = x,
            Frequency = documentLines.Count(line => line.Split(x).Length == 2)
        }).ToList();
        var maxFrequency = separatorFrequencies.Max(x => x.Frequency);
        var maxSeparators = separatorFrequencies.Where(x => x.Frequency == maxFrequency).ToList();
        if (maxSeparators.Count != 1)
        {
            throw new ArgumentException($"Separator ambiguous, candidates: {string.Join(' ', maxSeparators.Select(x => x.Separator.Trim()))}");
        }
        var separator = maxSeparators[0].Separator;
        var rawPairs = new List<List<string>>();
        var comments = new List<string>();

        string? currentComment = null;
        List<string>? currentPair = null;
        foreach (var line in documentLines)
        {
            if (line.Contains(separator))
            {
                if (currentComment != null)
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
        if (currentComment != null)
        {
            comments.Add(currentComment);
        }

        var pairs = rawPairs.Select(pairLines =>
        {
            var separatorLocationsPerLine = pairLines.Select(pairLine =>
            {
                var indexes = new List<int>();
                while (true)
                {
                    var index = pairLine.IndexOf(separator, indexes.Count > 0 ? indexes[0] + 1 : 0);
                    if (index == -1)
                    {
                        break;
                    }
                    indexes.Add(index);
                    pairLine = pairLine.Substring(index + separator.Length);
                }
                return indexes;
            }).ToList();
            var separatorLocationsFrequencies = separatorLocationsPerLine.SelectMany(x => x).GroupBy(x => x).ToDictionary(x => x.Key, x => x.Count());
            var pairLinesSeparated = pairLines.Select((pairLine, i) =>
            {
                var separatorLocation = separatorLocationsPerLine[i].MaxBy(x => separatorLocationsFrequencies[x]);
                var left = pairLine[..separatorLocation].TrimEnd();
                var right = pairLine[(separatorLocation + separator.Length)..];
                return (left, right);
            }).ToList();
            var extraRightWhitespace = 0;
            while (pairLinesSeparated.All(x => extraRightWhitespace + 1 < x.right.Length && char.IsWhiteSpace(x.right[extraRightWhitespace + 1])))
            {
                extraRightWhitespace++;
            }
            var left = string.Join(Environment.NewLine, pairLinesSeparated.Select(x => x.left));
            var right = string.Join(Environment.NewLine, pairLinesSeparated.Select(x => x.right[extraRightWhitespace..]));
            return (left, right);
        }).ToList();

        return new DeserializationResult(separator, pairs, comments);
    }
}

public record DeserializationResult(string Separator, IList<(string, string)> Pairs, IList<string> Comments);
