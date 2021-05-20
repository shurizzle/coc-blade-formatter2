import {
  DocumentFormattingEditProvider,
  Range,
  TextDocument,
  TextEdit,
  Uri,
  window,
  workspace,
} from 'coc.nvim';
import { addToOutput, safeExecute } from './errorHandler';
import { BladeFormatterConfig } from './types';
import { getConfig } from './utils';
import esm from 'esm';
const esmRequire = esm(module);
const { default: Formatter } = esmRequire('blade-formatter/src/formatter');

export async function format(
  text: string,
  { languageId, uri }: TextDocument
): Promise<string> {
  const u = Uri.parse(uri);
  const fileName = u.fsPath;
  const vscodeConfig: BladeFormatterConfig = getConfig(u);

  if (languageId !== 'blade') {
    window.showMessage(
      `${languageId} not supported by blade formatter`,
      'error'
    );
  }

  const options = {
    indentSize: vscodeConfig.indentSize,
    wrapLineLenght: vscodeConfig.wrapLineLenght,
    wrapAttributes: vscodeConfig.wrapAttributes,
  };

  async function _format(text: string) {
    return await new Formatter(options).formatContent(text);
  }

  return safeExecute(_format(text), text, fileName);
}

function fullDocumentRange(document: TextDocument): Range {
  const lastLineId = document.lineCount - 1;
  const doc = workspace.getDocument(document.uri);
  return {
    start: { character: 0, line: 0 },
    end: { character: doc.getline(lastLineId).length, line: lastLineId },
  };
}

export default class BladeEditProvider
  implements DocumentFormattingEditProvider
{
  constructor(private _fileIsIgnored: (filePath: string) => boolean) {}

  public provideDocumentFormattingEdits(
    document: TextDocument
  ): Promise<TextEdit[]> {
    return this._provideEdits(document);
  }

  private async _provideEdits(document: TextDocument): Promise<TextEdit[]> {
    const fileName = Uri.parse(document.uri).fsPath;
    if (!document.uri.startsWith('untitled') && this._fileIsIgnored(fileName)) {
      return Promise.resolve([]);
    }

    const code = await format(document.getText(), document);
    const edits: TextEdit[] = [
      {
        range: fullDocumentRange(document),
        newText: code,
      },
    ];
    const { disableSuccessMessage } = getConfig();

    if (edits && edits.length && !disableSuccessMessage) {
      window.showMessage('Formatted by Blade Formatter');
    }

    addToOutput(`Formatted file: ${document.uri}`);
    addToOutput(
      `Blade Formatter format edits: ${JSON.stringify(edits, null, 2)}`
    );

    return edits;
  }
}
