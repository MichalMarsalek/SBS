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

  const provider: vscode.DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits(
      document: vscode.TextDocument
    ): vscode.TextEdit[] {
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      );

      const formatted = formatSbs(document.getText());

      return [vscode.TextEdit.replace(fullRange, formatted)];
    },
  };

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(selector, provider)
  );
}
