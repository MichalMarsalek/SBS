namespace Sbs;

internal static class Extensions
{
    public static List<string> GetLines(this string document)
        => document.Split(["\n", "\r\n", "\r"], StringSplitOptions.None).ToList();
}
