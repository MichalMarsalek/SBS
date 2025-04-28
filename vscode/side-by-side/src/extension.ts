import * as vscode from "vscode";

export async function activate(context: vscode.ExtensionContext) {
  const sbs = await import("@michalmarsalek/side-by-side");

  function formatSbs(text: string): string {
    try {
      const cst = sbs.deserialize(text);
      return sbs.serialize(
        cst.pairs,
        cst.separator,
        !cst.isExplicitSeparator,
        false,
        cst.comments as any
      );
    } catch {
      return text;
    }
  }

  const selector = { language: "side-by-side", scheme: "file" };

  const formattingProvider: vscode.DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits(
      document: vscode.TextDocument
    ): vscode.TextEdit[] {
      const documentText = document.getText();
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(documentText.length)
      );

      const formatted = formatSbs(documentText);

      return [vscode.TextEdit.replace(fullRange, formatted)];
    },
  };

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      selector,
      formattingProvider
    )
  );

  const tokensProvider: vscode.DocumentSemanticTokensProvider = {
    provideDocumentSemanticTokens(
      document: vscode.TextDocument
    ): vscode.SemanticTokens {
      const text = document.getText();
      const lines = text.split(/\r?\n/);
      const cst = sbs.deserialize(text);

      const tokensBuilder = new vscode.SemanticTokensBuilder(sbsLegend);
      let lineIndex = 0;
      if (cst.isExplicitSeparator) {
        tokensBuilder.push(lineIndex++, 0, cst.separator.trim().length, 1);
      }
      for (let pairIndex = 0; pairIndex <= cst.pairs.length; pairIndex++) {
        const comment = cst.comments[pairIndex];
        if (comment) {
          const commentLines = comment.split(/\r?\n/);
          for (const commentLine of commentLines) {
            tokensBuilder.push(lineIndex++, 0, commentLine.length, 2);
          }
        }
        const separatorLocations = cst.separatorLocations[pairIndex];
        if (separatorLocations) {
          for (const separatorLocation of separatorLocations) {
            tokensBuilder.push(lineIndex, 0, separatorLocation, 0);
            tokensBuilder.push(
              lineIndex,
              separatorLocation,
              cst.separator.length,
              1
            );
            tokensBuilder.push(
              lineIndex,
              separatorLocation + cst.separator.length,
              lines[lineIndex].length -
                separatorLocation +
                cst.separator.length,
              0
            );
            lineIndex++;
          }
        }
      }

      return tokensBuilder.build();
    },
  };

  vscode.languages.registerDocumentSemanticTokensProvider(
    selector,
    tokensProvider,
    sbsLegend
  );
}

const sbsLegend = new vscode.SemanticTokensLegend([
  "string",
  "operator",
  "comment",
]);
