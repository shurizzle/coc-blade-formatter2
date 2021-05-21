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
import { loadWASM as onigLoadWASM } from 'vscode-oniguruma';
import BladeEditProvider from './BladeEditProvider';
import { setupErrorHandler } from './errorHandler';
import ignoreFileHandler from './ignoreFileHandler';
import { getConfig } from './utils';

const esmRequire = esm(module);

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

async function loadWASM(): Promise<void> {
  const onigPath = esmRequire.resolve('vscode-oniguruma/release/onig.wasm');
  const { buffer: wasm } = await fs.readFile(onigPath);
  // HACK: while the module is executed in a separate vm but fs module is
  // cached the resulting ArrayBuffer may not be and instance of the current
  // vm's ArrayBuffer so we force the prototype to be the current ArrayBuffer.
  // Otherwise vscode-oniguruma will not recognize it as an ArrayBuffer and
  // will fail because it needs Response object that we don't have in nodejs.
  //
  // tl;dr: it sucks but it works.
  if (wasm && !(wasm instanceof ArrayBuffer)) {
    Object.setPrototypeOf(wasm, ArrayBuffer.prototype);
  }
  await onigLoadWASM(wasm);
}

export async function activate(context: ExtensionContext): Promise<void> {
  const extensionConfig = getConfig();
  if (!extensionConfig.enable) return;

  context.subscriptions.push(setupErrorHandler());
  try {
    await loadWASM();
  } catch (err) {
    context.logger.error(err);
    window.showMessage('Blade Formatter has failed to instantiate', 'error');
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
