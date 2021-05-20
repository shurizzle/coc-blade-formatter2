import {
  Disposable,
  DocumentSelector,
  events,
  ExtensionContext,
  languages,
  window,
  workspace,
} from 'coc.nvim';
import BladeEditProvider from './BladeEditProvider';
import { setupErrorHandler } from './errorHandler';
import ignoreFileHandler from './ignoreFileHandler';
import { getConfig } from './utils';

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
  if (!extensionConfig.enabled) return;

  context.subscriptions.push(setupErrorHandler());
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
