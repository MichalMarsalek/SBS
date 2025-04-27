type Pair = readonly [string, string];

export interface DeserializationResult {
  separator: string;
  isExplicitSeparator: boolean;
  pairs: Pair[];
  separatorLocations: number[][];
  comments: (string | null)[];
}

const getLines = (text: string): string[] => text.split(/\r?\n/);

const replaceLineEndings = (text: string): string =>
  text.replace(/\r?\n/g, "\n");

export function serialize(
  pairs: Pair[],
  separator: string,
  preferImplicitSeparator = true,
  alignGlobally = false,
  comments: readonly [string | null, ...string[], string | null] | null = null
): string {
  if (!separator.startsWith(" ")) separator = " " + separator;
  if (!separator.endsWith(" ")) separator += " ";
  if (comments && comments.length !== pairs.length + 1) {
    throw new Error(
      "The length of `comments` must be one more than the length of `pairs`."
    );
  }
  if (comments?.some((c, i) => i !== 0 && i !== pairs.length && c === null)) {
    throw new Error("Only the first and last comment can be null.");
  }

  let lines: string[] = [];
  if (!preferImplicitSeparator) {
    lines.push(separator.trim());
  }

  const pairsAsLines = pairs.map(
    ([left, right]) => [getLines(left), getLines(right)] as const
  );
  const globalLeftWidth = Math.max(
    ...pairsAsLines.flatMap(([left]) => left.map((l) => l.length))
  );

  for (let pairIndex = 0; pairIndex < pairsAsLines.length; pairIndex++) {
    const [left, right] = pairsAsLines[pairIndex];

    if (pairIndex === 0) {
      if (comments?.[pairIndex] != null) lines.push(comments[pairIndex]!);
    } else {
      lines.push(comments ? comments[pairIndex]! : "");
    }

    const linesLength = Math.max(left.length, right.length);
    const leftWidth = alignGlobally
      ? globalLeftWidth
      : Math.max(...left.map((l) => l.length));

    for (let i = 0; i < linesLength; i++) {
      const leftPart = left[i] ?? "";
      const rightPart = right[i] ?? "";
      lines.push(leftPart.padEnd(leftWidth) + separator + rightPart);
    }
  }

  if (comments?.[pairsAsLines.length] != null) {
    lines.push(comments[pairsAsLines.length]!);
  }

  let result = replaceLineEndings(lines.join("\n"));

  if (preferImplicitSeparator) {
    let inferredSeparator: string | null;
    try {
      inferredSeparator = inferSeparator(result, getLines(result))?.trim();
    } catch {
      inferredSeparator = null;
    }
    if (inferredSeparator !== separator.trim()) {
      result = separator.trim() + "\n" + result;
    }
  }

  return result;
}

function inferSeparator(document: string, lines: string[]): string {
  const separatorCandidates = [
    ...new Set(
      [...document.matchAll(/ [^a-zA-Z0-9\s]{1,5} /g)].map((m) => m[0])
    ),
  ];

  if (separatorCandidates.length === 0) {
    throw new Error("No separator found.");
  }

  const separatorFrequencies = separatorCandidates.map((sep) => ({
    separator: sep,
    frequency: lines.filter((line) => line.split(sep).length === 2).length,
  }));

  const maxFrequency = Math.max(
    ...separatorFrequencies.map((x) => x.frequency)
  );
  const maxSeparators = separatorFrequencies.filter(
    (x) => x.frequency === maxFrequency
  );

  if (maxSeparators.length !== 1) {
    throw new Error(
      `Separator ambiguous, candidates: ${maxSeparators
        .map((x) => x.separator.trim())
        .join(" ")}`
    );
  }

  return maxSeparators[0].separator;
}

export function deserialize(document: string): DeserializationResult {
  const documentLines = getLines(document);
  let separator: string;
  let isExplicitSeparator = /^[^a-zA-Z0-9\s]{1,5}$/.test(documentLines[0]);
  if (isExplicitSeparator) {
    separator = " " + documentLines.shift() + " ";
  } else {
    separator = inferSeparator(document, documentLines);
  }

  const rawPairs: string[][] = [];
  const comments: (string | null)[] = [];

  let currentComment: string | null = null;
  let currentPair: string[] | null = null;

  for (const line of documentLines) {
    if (line.includes(separator)) {
      if (currentComment !== null || comments.length === 0) {
        comments.push(currentComment);
        currentComment = null;
      }
      currentPair ??= [];
      currentPair.push(line);
    } else {
      if (currentPair !== null) {
        rawPairs.push(currentPair);
        currentPair = null;
      }
      currentComment =
        currentComment === null ? line : currentComment + "\n" + line;
    }
  }

  if (currentPair !== null) {
    rawPairs.push(currentPair);
  }
  comments.push(currentComment);

  const pairs = rawPairs.map((pairLines) => {
    const separatorLocationsPerLine = pairLines.map((pairLine) => {
      const indexes: number[] = [];
      let index = 0;
      while ((index = pairLine.indexOf(separator, index)) !== -1) {
        indexes.push(index);
        index++;
      }
      return indexes;
    });

    const separatorLocationsFrequencies = new Map<number, number>();
    for (const indexes of separatorLocationsPerLine) {
      for (const idx of indexes) {
        separatorLocationsFrequencies.set(
          idx,
          (separatorLocationsFrequencies.get(idx) ?? 0) + 1
        );
      }
    }

    const pairLinesSeparated = pairLines.map((pairLine, i) => {
      const separatorLocation = separatorLocationsPerLine[i].reduce(
        (argMax, x) =>
          (separatorLocationsFrequencies.get(x) ?? 0) >
          (separatorLocationsFrequencies.get(argMax) ?? 0)
            ? x
            : argMax
      );
      const left = pairLine.slice(0, separatorLocation);
      const right = pairLine.slice(separatorLocation + separator.length);
      return { left, right, separatorLocation: separatorLocation };
    });

    let extraRightWhitespace = 0;
    while (
      pairLinesSeparated.every(
        (x) =>
          extraRightWhitespace < x.right.length &&
          /\s/.test(x.right[extraRightWhitespace])
      )
    ) {
      extraRightWhitespace++;
    }

    let extraLeftWhitespace = 0;
    while (
      pairLinesSeparated.every(
        (x) =>
          extraLeftWhitespace + 1 <= x.left.length &&
          /\s/.test(x.left.at(-(extraLeftWhitespace + 1))!)
      )
    ) {
      extraLeftWhitespace++;
    }

    const left = pairLinesSeparated.map((x) => x.left.trimEnd()).join("\n");
    const right = pairLinesSeparated
      .map((x) => x.right.slice(extraRightWhitespace))
      .join("\n");
    const separatorLocations = pairLinesSeparated.map(
      (x) => x.separatorLocation
    );

    return {
      left,
      right,
      separatorLocations,
      extraLeftWhitespace,
      extraRightWhitespace,
    };
  });

  const extraLeftWhitespace = Math.min(
    ...pairs.map((x) => x.extraLeftWhitespace)
  );
  const extraRightWhitespace = Math.min(
    ...pairs.map((x) => x.extraRightWhitespace)
  );
  separator =
    " ".repeat(extraLeftWhitespace) +
    separator +
    " ".repeat(extraRightWhitespace);

  return {
    separator,
    isExplicitSeparator,
    pairs: pairs.map((x) => [x.left, x.right]),
    separatorLocations: pairs.map((x) =>
      x.separatorLocations.map((x) => x - extraLeftWhitespace)
    ),
    comments,
  };
}
