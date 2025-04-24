using TUnit.Assertions.AssertConditions.Throws;

namespace Sbs.Tests;

public class SbsSerializerTests
{
    [Test]
    public async Task Serialize_WithDefaultComments_Serializes()
    {
        var pairs = new List<(string, string)>
        {
            ("left1\nx", "right1\nx"),
            ("left2\ny", "right2\ny")
        };
        var separator = "|";
        var expected = """
            left1 | right1
            x     | x

            left2 | right2
            y     | y

            """;

        var result = SbsSerializer.Serialize(pairs, separator);

        await Assert.That(result).IsEquivalentTo(expected);
    }

    [Test]
    public async Task Serialize_WithCustomComments_Serializes()
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
        var separator = " // ";
        var comments = new List<string?>
        {
            "// Addition test",
            "\n// Multiplication test",
            null
        };
        var expected = """
            // Addition test
            function add(a: number, b: number): number {  //  function add(a, b) {
                return a + b;                             //      return a + b;
            }                                             //  }

            // Multiplication test
            function mul(a: number, b: number): number {  //  function mul(a, b) {
                return a * b;                             //      return a * b;
            }                                             //  }

            """.ReplaceLineEndings();

        var result = SbsSerializer.Serialize(pairs, separator, comments).ReplaceLineEndings();

        await Assert.That(result).IsEquivalentTo(expected);
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

        var act = () => SbsSerializer.Serialize(pairs, separator, comments);

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

        var act = () => SbsSerializer.Serialize(pairs, separator, comments);

        await Assert.That(act).Throws<ArgumentException>().WithMessageMatching("*be null*");
    }
}
