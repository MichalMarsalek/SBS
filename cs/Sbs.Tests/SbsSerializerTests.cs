using TUnit.Assertions.AssertConditions.Throws;
using TUnit.Assertions.Extensions;

namespace Sbs.Tests;

public class SbsSerializerTests
{
    [Test]
    [Arguments(true)]
    [Arguments(false)]
    public async Task Serialize_WithDefaultComments_Serializes(bool implicitSeparator)
    {
        var pairs = new List<(string, string)>
        {
            ("left1\nx", "right1\nx"),
            ("left2\ny", "right2\ny")
        };
        var separator = "|";
        var expected = ((!implicitSeparator ? separator.Trim() + "\n" : "") + """
            left1 | right1
            x     | x

            left2 | right2
            y     | y
            """).ReplaceLineEndings();

        var result = SbsSerializer.Serialize(pairs, separator, implicitSeparator).ReplaceLineEndings();

        await Assert.That(result).IsEqualTo(expected);
    }

    [Test]
    public async Task Serialize_WithExtraSpaces_Serializes()
    {
        var pairs = new List<(string, string)>
        {
            ("left1\nx", "right1\nx"),
            ("left2\ny", "right2\ny")
        };
        var separator = "  |  ";
        var expected = """
            left1  |  right1
            x      |  x

            left2  |  right2
            y      |  y
            """.ReplaceLineEndings();

        var result = SbsSerializer.Serialize(pairs, separator).ReplaceLineEndings();

        await Assert.That(result).IsEqualTo(expected);
    }

    [Test]
    [Arguments(true)]
    [Arguments(false)]
    public async Task Serialize_WithCustomComments_Serializes(bool implicitSeparator)
    {
        var a = """
            function add(a: number, b: number): number {
                return a + b;
            }
            """;
        var b = """
            function add(a, b) {
                return a + b;
            }
            """;
        var c = """
            function mul(a: number, b: number): number {
                return a * b;
            }
            """;
        var d = """
            function mul(a, b) {
                return a * b;
            }
            """;
        var pairs = new List<(string, string)>
        {
            (a, b),
            (c, d)
        };
        var separator = "  //  ";
        var comments = new List<string?>
        {
            "// Addition test",
            "\n// Multiplication test",
            null
        };
        var expected = ((!implicitSeparator ? separator.Trim() + "\n" : "") + """
            // Addition test
            function add(a: number, b: number): number {  //  function add(a, b) {
                return a + b;                             //      return a + b;
            }                                             //  }

            // Multiplication test
            function mul(a: number, b: number): number {  //  function mul(a, b) {
                return a * b;                             //      return a * b;
            }                                             //  }
            """).ReplaceLineEndings();

        var result = SbsSerializer.Serialize(pairs, separator, implicitSeparator, false, comments).ReplaceLineEndings();

        await Assert.That(result).IsEqualTo(expected);
    }

    [Test]
    public async Task Serialize_WithMismatchedLengths_Throws()
    {
        var pairs = new List<(string, string)>
        {
            ("left1\nx", "right1\nx"),
            ("left2\ny", "right2\ny")
        };
        var separator = "|";
        var comments = new List<string?>
        {
            "// Comment 1",
            "// Comment 2",
        };

        var act = () => SbsSerializer.Serialize(pairs, separator, false, false, comments);

        await Assert.That(act).Throws<ArgumentException>().WithMessageMatching("*length*");
    }

    [Test]
    public async Task Serialize_WithNullMiddleMessage_Throws()
    {
        var pairs = new List<(string, string)>
        {
            ("left1\nx", "right1\nx"),
            ("left2\ny", "right2\ny")
        };
        var separator = "|";
        var comments = new List<string?>
        {
            "// Comment 1",
            null,
            "// Comment 2",
        };

        var act = () => SbsSerializer.Serialize(pairs, separator, false, false, comments);

        await Assert.That(act).Throws<ArgumentException>().WithMessageMatching("*be null*");
    }

    [Test]
    public async Task Serialize_WithUninferableSeparator_UsesExplicitSeparator()
    {
        var pairs = new List<(string, string)>
        {
            ("left1\nx", "right1 / x\nx / x"),
            ("left2\ny", "right2 / x\ny / y")
        };
        var separator = "|";

        var result = SbsSerializer.Serialize(pairs, separator, true);

        await Assert.That(result).StartsWith("|");
    }


    [Test]
    [Arguments(false)]
    [Arguments(true)]
    public async Task Serialize_WithGlobalAlignment_Serializes(bool alignGlobally)
    {
        var pairs = new List<(string, string)>
        {
            ("A", "B"),
            ("AA", "BB")
        };
        var separator = "|";

        var result = SbsSerializer.Serialize(pairs, separator, alignGlobally: alignGlobally);

        await Assert.That(result).StartsWith(alignGlobally ? "A  |" : "A |");
    }

    [Test]
    public async Task Deserialize_WithImplicitSeparator_Deserializes()
    {
        string doc = """
            1     | A | x
            2 | x |  B
            3     |  C
            """;
        var expected = Normalize(new DeserializationResult(" | ", [
                ("1\n2 | x\n3", "A | x\n B\n C"),
            ], [null, null]));

        var result = SbsSerializer.Deserialize(doc);

        await Assert.That(result.Separator).IsEqualTo(expected.Separator);
        await Assert.That(result.Pairs).IsEquivalentTo(expected.Pairs);
        await Assert.That(result.Comments).IsEquivalentTo(expected.Comments);
    }

    [Test]
    public async Task Deserialize_WithImplicitSeparatorAndMultiplePairs_Deserializes()
    {
        string doc = """
            // Addition test
            function add(a: number, b: number): number {  //  function add(a, b) {
                return a + b;                             //      return a + b;
            }                                             //  }
            
            // Multiplication test
            function mul(a: number, b: number): number {  //  function mul(a, b) {
                return a * b;                             //      return a * b;
            }                                             //  }
            """;
        var a = """
            function add(a: number, b: number): number {
                return a + b;
            }
            """;
        var b = """
            function add(a, b) {
                return a + b;
            }
            """;
        var c = """
            function mul(a: number, b: number): number {
                return a * b;
            }
            """;
        var d = """
            function mul(a, b) {
                return a * b;
            }
            """;
        var expected = Normalize(new DeserializationResult("  //  ", [(a, b), (c, d)], ["// Addition test", "\n// Multiplication test", null]));

        var result = SbsSerializer.Deserialize(doc);

        await Assert.That(result.Separator).IsEqualTo(expected.Separator);
        await Assert.That(result.Pairs).IsEquivalentTo(expected.Pairs);
        await Assert.That(result.Comments).IsEquivalentTo(expected.Comments);
    }

    [Test]
    public async Task Deserialize_WithAmbiguousImplicitSeparator_Throws()
    {
        string doc = """
            1 | A
            2 / B
            """;

        var act = () => SbsSerializer.Deserialize(doc);

        await Assert.That(act).Throws<ArgumentException>().WithMessageMatching("Separator ambiguous, candidates: | /*");
    }

    [Test]
    public async Task Deserialize_WithExplicitSeparator_Deserializes()
    {
        string doc = """
            |
            1  |  / | A
            2  |  /   B
            3  |  /   C
            """;
        var expected = Normalize(new DeserializationResult("  |  ", [
                ("1\n2\n3", "/ | A\n/   B\n/   C"),
            ], [null, null]));

        var result = SbsSerializer.Deserialize(doc);

        await Assert.That(result.Separator).IsEqualTo(expected.Separator);
        await Assert.That(result.Pairs).IsEquivalentTo(expected.Pairs);
        await Assert.That(result.Comments).IsEquivalentTo(expected.Comments);
    }

    private DeserializationResult Normalize(DeserializationResult result) => new DeserializationResult(
        result.Separator,
        result.Pairs.Select(x => (x.Item1.ReplaceLineEndings(), x.Item2.ReplaceLineEndings())).ToList(),
        result.Comments.Select(x => x?.ReplaceLineEndings()).ToList()
    );
}
