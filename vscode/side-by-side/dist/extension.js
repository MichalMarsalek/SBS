"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/.pnpm/@michalmarsalek+side-by-side@1.0.0/node_modules/@michalmarsalek/side-by-side/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  deserialize: () => deserialize,
  serialize: () => serialize
});
function serialize(pairs, separator, preferImplicitSeparator = true, alignGlobally = false, comments = null) {
  if (!separator.startsWith(" "))
    separator = " " + separator;
  if (!separator.endsWith(" "))
    separator += " ";
  if (comments && comments.length !== pairs.length + 1) {
    throw new Error("The length of `comments` must be one more than the length of `pairs`.");
  }
  if (comments?.some((c, i) => i !== 0 && i !== pairs.length && c === null)) {
    throw new Error("Only the first and last comment can be null.");
  }
  let lines = [];
  if (!preferImplicitSeparator) {
    lines.push(separator.trim());
  }
  const pairsAsLines = pairs.map(([left, right]) => [getLines(left), getLines(right)]);
  const globalLeftWidth = Math.max(...pairsAsLines.flatMap(([left]) => left.map((l) => l.length)));
  for (let pairIndex = 0; pairIndex < pairsAsLines.length; pairIndex++) {
    const [left, right] = pairsAsLines[pairIndex];
    if (pairIndex === 0) {
      if (comments?.[pairIndex] != null)
        lines.push(comments[pairIndex]);
    } else {
      lines.push(comments ? comments[pairIndex] : "");
    }
    const linesLength = Math.max(left.length, right.length);
    const leftWidth = alignGlobally ? globalLeftWidth : Math.max(...left.map((l) => l.length));
    for (let i = 0; i < linesLength; i++) {
      const leftPart = left[i] ?? "";
      const rightPart = right[i] ?? "";
      lines.push(leftPart.padEnd(leftWidth) + separator + rightPart);
    }
  }
  if (comments?.[pairsAsLines.length] != null) {
    lines.push(comments[pairsAsLines.length]);
  }
  let result = replaceLineEndings(lines.join("\n"));
  if (preferImplicitSeparator) {
    let inferredSeparator;
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
function inferSeparator(document, lines) {
  const separatorCandidates = [
    ...new Set([...document.matchAll(/ [^a-zA-Z0-9\s]{1,5} /g)].map((m) => m[0]))
  ];
  if (separatorCandidates.length === 0) {
    throw new Error("No separator found.");
  }
  const separatorFrequencies = separatorCandidates.map((sep) => ({
    separator: sep,
    frequency: lines.filter((line) => line.split(sep).length === 2).length
  }));
  const maxFrequency = Math.max(...separatorFrequencies.map((x) => x.frequency));
  const maxSeparators = separatorFrequencies.filter((x) => x.frequency === maxFrequency);
  if (maxSeparators.length !== 1) {
    throw new Error(`Separator ambiguous, candidates: ${maxSeparators.map((x) => x.separator.trim()).join(" ")}`);
  }
  return maxSeparators[0].separator;
}
function deserialize(document) {
  const documentLines = getLines(document);
  let separator;
  let isExplicitSeparator = /^[^a-zA-Z0-9\s]{1,5}$/.test(documentLines[0]);
  if (isExplicitSeparator) {
    separator = " " + documentLines.shift() + " ";
  } else {
    separator = inferSeparator(document, documentLines);
  }
  const rawPairs = [];
  const comments = [];
  let currentComment = null;
  let currentPair = null;
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
      currentComment = currentComment === null ? line : currentComment + "\n" + line;
    }
  }
  if (currentPair !== null) {
    rawPairs.push(currentPair);
  }
  comments.push(currentComment);
  const pairs = rawPairs.map((pairLines) => {
    const separatorLocationsPerLine = pairLines.map((pairLine) => {
      const indexes = [];
      let index = 0;
      while ((index = pairLine.indexOf(separator, index)) !== -1) {
        indexes.push(index);
        index++;
      }
      return indexes;
    });
    const separatorLocationsFrequencies = /* @__PURE__ */ new Map();
    for (const indexes of separatorLocationsPerLine) {
      for (const idx of indexes) {
        separatorLocationsFrequencies.set(idx, (separatorLocationsFrequencies.get(idx) ?? 0) + 1);
      }
    }
    const pairLinesSeparated = pairLines.map((pairLine, i) => {
      const separatorLocation = separatorLocationsPerLine[i].reduce((argMax, x) => (separatorLocationsFrequencies.get(x) ?? 0) > (separatorLocationsFrequencies.get(argMax) ?? 0) ? x : argMax);
      const left2 = pairLine.slice(0, separatorLocation);
      const right2 = pairLine.slice(separatorLocation + separator.length);
      return { left: left2, right: right2, separatorLocation };
    });
    let extraRightWhitespace2 = 0;
    while (pairLinesSeparated.every((x) => extraRightWhitespace2 < x.right.length && /\s/.test(x.right[extraRightWhitespace2]))) {
      extraRightWhitespace2++;
    }
    let extraLeftWhitespace2 = 0;
    while (pairLinesSeparated.every((x) => extraLeftWhitespace2 + 1 <= x.left.length && /\s/.test(x.left.at(-(extraLeftWhitespace2 + 1))))) {
      extraLeftWhitespace2++;
    }
    const left = pairLinesSeparated.map((x) => x.left.trimEnd()).join("\n");
    const right = pairLinesSeparated.map((x) => x.right.slice(extraRightWhitespace2)).join("\n");
    const separatorLocations = pairLinesSeparated.map((x) => x.separatorLocation);
    return {
      left,
      right,
      separatorLocations,
      extraLeftWhitespace: extraLeftWhitespace2,
      extraRightWhitespace: extraRightWhitespace2
    };
  });
  const extraLeftWhitespace = Math.min(...pairs.map((x) => x.extraLeftWhitespace));
  const extraRightWhitespace = Math.min(...pairs.map((x) => x.extraRightWhitespace));
  separator = " ".repeat(extraLeftWhitespace) + separator + " ".repeat(extraRightWhitespace);
  return {
    separator,
    isExplicitSeparator,
    pairs: pairs.map((x) => [x.left, x.right]),
    separatorLocations: pairs.map((x) => x.separatorLocations.map((x2) => x2 - extraLeftWhitespace)),
    comments
  };
}
var getLines, replaceLineEndings;
var init_dist = __esm({
  "node_modules/.pnpm/@michalmarsalek+side-by-side@1.0.0/node_modules/@michalmarsalek/side-by-side/dist/index.js"() {
    getLines = (text) => text.split(/\r?\n/);
    replaceLineEndings = (text) => text.replace(/\r?\n/g, "\n");
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));
async function activate(context) {
  const sbs = await Promise.resolve().then(() => (init_dist(), dist_exports));
  function formatSbs(text) {
    try {
      const cst = sbs.deserialize(text);
      return sbs.serialize(
        cst.pairs,
        cst.separator,
        !cst.isExplicitSeparator,
        false,
        cst.comments
      );
    } catch {
      return text;
    }
  }
  const selector = { language: "side-by-side", scheme: "file" };
  const provider = {
    provideDocumentFormattingEdits(document) {
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      );
      const formatted = formatSbs(document.getText());
      return [vscode.TextEdit.replace(fullRange, formatted)];
    }
  };
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(selector, provider)
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate
});
//# sourceMappingURL=extension.js.map
