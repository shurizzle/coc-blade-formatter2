import {
  Disposable,
  DocumentSelector,
  events,
  ExtensionContext,
  languages,
  window,
  workspace,
} from 'coc.nvim';
import esm from 'esm';
import { promises as fs } from 'fs';
import BladeEditProvider from './BladeEditProvider';
import { setupErrorHandler } from './errorHandler';
import ignoreFileHandler from './ignoreFileHandler';
import { getConfig } from './utils';

// HACK
globalThis.Response = () => {};

const esmRequire = esm(module);
const loadWASM = esmRequire('vscode-oniguruma').loadWASM;

function selectorForLanguage(language: string): DocumentSelector {
  return [
    { language, scheme: 'file' },
    { language, scheme: 'untitled' },
  ];
}

/**
 * Build formatter selectors
 */
function selector(): DocumentSelector {
  const language = 'blade';
  return selectorForLanguage(language);
}

let formatterHandler: undefined | Disposable;

function disposeHandlers(): void {
  formatterHandler?.dispose();
  formatterHandler = undefined;
}

function wait(ms: number): Promise<any> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(undefined);
    }, ms);
  });
}

export async function activate(context: ExtensionContext): Promise<void> {
  const extensionConfig = getConfig();
  if (!extensionConfig.enable) return;

  context.subscriptions.push(setupErrorHandler());
  try {
    const onigPath = esmRequire.resolve('vscode-oniguruma/release/onig.wasm');
    const wasm = await fs.readFile(onigPath);
    await loadWASM({ data: { arrayBuffer: () => wasm.buffer } });
  } catch (err) {
    window.showMessage('Blade Formatter has failed to instantiate');
    return;
  }

  const { fileIsIgnored } = ignoreFileHandler(context.subscriptions);
  const editProvider = new BladeEditProvider(fileIsIgnored);

  const statusItem = window.createStatusBarItem(0);
  context.subscriptions.push(statusItem);
  statusItem.text = extensionConfig.statusItemText;
  const priority = extensionConfig.formatterPriority;

  async function checkDocument(): Promise<void> {
    await wait(30);
    const doc = workspace.getDocument(workspace.bufnr);
    if (doc && doc.filetype === 'blade') {
      statusItem.show();
    } else {
      statusItem.hide();
    }
  }

  function registerFormatter(): void {
    disposeHandlers();
    const languageSelector = selector();

    formatterHandler = languages.registerDocumentFormatProvider(
      languageSelector,
      editProvider,
      priority
    );
  }
  registerFormatter();
  try {
    await checkDocument();
  } catch (_e) {
    // noop
  }

  events.on(
    'BufEnter',
    async () => {
      await checkDocument();
    },
    null,
    context.subscriptions
  );
}
