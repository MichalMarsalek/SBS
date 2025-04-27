import { serialize, deserialize } from ".";

type Pair = [string, string];

describe("Sbs (de)serialization", () => {
  test.each([true, false])(
    "Serialize_WithDefaultComments_Serializes (implicitSeparator: %s)",
    async (implicitSeparator) => {
      const pairs: Pair[] = [
        ["left1\nx", "right1\nx"],
        ["left2\ny", "right2\ny"],
      ];
      const separator = "|";
      const expected = `${
        !implicitSeparator ? separator.trim() + "\n" : ""
      }left1 | right1\nx     | x\n\nleft2 | right2\ny     | y`;

      const result = serialize(pairs, separator, implicitSeparator);

      expect(result).toBe(expected);
    }
  );

  test("Serialize_WithExtraSpaces_Serializes", async () => {
    const pairs: Pair[] = [
      ["left1\nx", "right1\nx"],
      ["left2\ny", "right2\ny"],
    ];
    const separator = "  |  ";
    const expected = `left1  |  right1\nx      |  x\n\nleft2  |  right2\ny      |  y`;

    const result = serialize(pairs, separator);

    expect(result).toBe(expected);
  });

  test.each([true, false])(
    "Serialize_WithCustomComments_Serializes (implicitSeparator: %s)",
    async (implicitSeparator) => {
      const a = `function add(a: number, b: number): number {\n    return a + b;\n}`;
      const b = `function add(a, b) {\n    return a + b;\n}`;
      const c = `function mul(a: number, b: number): number {\n    return a * b;\n}`;
      const d = `function mul(a, b) {\n    return a * b;\n}`;
      const pairs: Pair[] = [
        [a, b],
        [c, d],
      ];
      const separator = "  //  ";
      const comments = [
        "// Addition test",
        "\n// Multiplication test",
        null,
      ] as const;
      const expected = `${
        !implicitSeparator ? separator.trim() + "\n" : ""
      }// Addition test\nfunction add(a: number, b: number): number {  //  function add(a, b) {\n    return a + b;                             //      return a + b;\n}                                             //  }\n\n// Multiplication test\nfunction mul(a: number, b: number): number {  //  function mul(a, b) {\n    return a * b;                             //      return a * b;\n}                                             //  }`;

      const result = serialize(
        pairs,
        separator,
        implicitSeparator,
        false,
        comments
      );

      expect(result).toBe(expected);
    }
  );

  test("Serialize_WithMismatchedLengths_Throws", async () => {
    const pairs: Pair[] = [
      ["left1\nx", "right1\nx"],
      ["left2\ny", "right2\ny"],
    ];
    const separator = "|";
    const comments = ["// Comment 1", "// Comment 2"] as const;

    expect(() => serialize(pairs, separator, false, false, comments)).toThrow(
      /length/
    );
  });

  test("Serialize_WithNullMiddleMessage_Throws", async () => {
    const pairs: Pair[] = [
      ["left1\nx", "right1\nx"],
      ["left2\ny", "right2\ny"],
    ];
    const separator = "|";
    const comments = ["// Comment 1", null, "// Comment 2"] as const;

    expect(() =>
      serialize(pairs, separator, false, false, comments as any)
    ).toThrow(/be null/);
  });

  test("Serialize_WithUninferableSeparator_UsesExplicitSeparator", async () => {
    const pairs: Pair[] = [
      ["left1\nx", "right1 / x\nx / x"],
      ["left2\ny", "right2 / x\ny / y"],
    ];
    const separator = "|";

    const result = serialize(pairs, separator, true);

    expect(result.startsWith("|")).toBe(true);
  });

  test.each([false, true])(
    "Serialize_WithGlobalAlignment_Serializes (alignGlobally: %s)",
    async (alignGlobally) => {
      const pairs: Pair[] = [
        ["A", "B"],
        ["AA", "BB"],
      ];
      const separator = "|";

      const result = serialize(pairs, separator, undefined, alignGlobally);

      expect(result.startsWith(alignGlobally ? "A  |" : "A |")).toBe(true);
    }
  );

  test("Deserialize_WithImplicitSeparator_Deserializes", async () => {
    const doc = `1     | A | x\n2 | x |  B\n3     |  C`;
    const expected = {
      separator: " | ",
      pairs: [["1\n2 | x\n3", "A | x\n B\n C"]],
      comments: [null, null],
    };

    const result = deserialize(doc);

    expect(result.separator).toBe(expected.separator);
    expect(result.pairs).toEqual(expected.pairs);
    expect(result.comments).toEqual(expected.comments);
  });

  test("Deserialize_WithImplicitSeparatorAndMultiplePairs_Deserializes", async () => {
    const doc = `// Addition test
function add(a: number, b: number): number {  //  function add(a, b) {
    return a + b;                   //      return a + b;
}                                   //  }

// Multiplication test
function mul(a: number, b: number): number {  //  function mul(a, b) {
    return a * b;           //      return a * b;
}                           //  }`;
    const a = `function add(a: number, b: number): number {
    return a + b;
}`;
    const b = `function add(a, b) {
    return a + b;
}`;
    const c = `function mul(a: number, b: number): number {
    return a * b;
}`;
    const d = `function mul(a, b) {
    return a * b;
}`;
    const expected = {
      separator: "  //  ",
      pairs: [
        [a, b],
        [c, d],
      ],
      comments: ["// Addition test", "\n// Multiplication test", null],
    };

    const result = deserialize(doc);

    expect(result.separator).toBe(expected.separator);
    expect(result.pairs).toEqual(expected.pairs);
    expect(result.comments).toEqual(expected.comments);
    expect(result.separatorLocations).toEqual([
      [44, 34, 34],
      [44, 26, 26],
    ]);
  });

  test("Deserialize_WithAmbiguousImplicitSeparator_Throws", async () => {
    const doc = `1 | A\n2 / B`;

    expect(() => deserialize(doc)).toThrow(
      /Separator ambiguous, candidates: | \//
    );
  });

  test("Deserialize_WithExplicitSeparator_Deserializes", async () => {
    const doc = `|\n1  |  / | A\n2  |  /   B\n3  |  /   C`;
    const expected = {
      separator: "  |  ",
      pairs: [["1\n2\n3", "/ | A\n/   B\n/   C"]],
      comments: [null, null],
    };

    const result = deserialize(doc);

    expect(result.separator).toBe(expected.separator);
    expect(result.pairs).toEqual(expected.pairs);
    expect(result.comments).toEqual(expected.comments);
  });
});
