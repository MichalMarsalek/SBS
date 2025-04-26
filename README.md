# SBS
SBS - Side by side - a text format for pairs of multiline data

## What this is for
Main motivation is definition of data for data driven unit testing of functions which have multiline inputs and outputs.

## Description of the format
Each SBS file has a single *pair separator* - a string matching `/ [^a-zA-Z0-9\s]{1,5} /`. This separator is used to separate a pair of multiline texts. For example, if ` | ` is the separator, then

```
1 | A
2 | B
3 | C
```
denotes a pair

```
1
2
3
```
&

```
A
B
C
```

Lines without the separator are ignored and separate multiple pairs in a single file. For example, here is another example, this time two pairs with `//` as a separator.

```ts
// Addition test
function add(a: number, b: number): number {  //  function add(a, b) {
    return a + b;                             //      return a + b;
}                                             //  }

// Multiplication test
function mul(a: number, b: number): number {  //  function mul(a, b) {
    return a * b;                             //      return a * b;
}                                             //  }
```

Note that the `//` on the first line is considered a comment not a separator, because it does not follow a space. Extra spaces at the end of the left item of the pair and at the start of the right item of the pair are ignored (up to the amount that is extra on each line - meaning in the example above, the indetation of the `return` line is preserved in the right item).

The separator is the content of the very first line, if it contains a valid separator, otherwise it is detected automatically to be the string that appears the most times exactly once on a line. The separator may appear more than once on the line and the split location is determined by alignment with other lines.