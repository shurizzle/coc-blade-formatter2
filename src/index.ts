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

interface Selectors {
  rangeLanguageSelector: DocumentSelector;
  languageSelector: DocumentSelector;
}

function selectorForLanguage(language: string): DocumentSelector {
  return [
    { language, scheme: 'file' },
    { language, scheme: 'untitled' },
  ];
}

/**
 * Build formatter selectors
 */
function selectors(): Selectors {
  const language = 'blade';
  const rangeLanguageSelector = selectorForLanguage(language);
  const languageSelector = selectorForLanguage(language);

  return {
    rangeLanguageSelector,
    languageSelector,
  };
}

let formatterHandler: undefined | Disposable;
let rangeFormatterHandler: undefined | Disposable;

function disposeHandlers(): void {
  formatterHandler?.dispose();
  rangeFormatterHandler?.dispose();
  formatterHandler = undefined;
  rangeFormatterHandler = undefined;
}

function wait(ms: number): Promise<any> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(undefined);
    }, ms);
  });
}

export async function activate(context: ExtensionContext): Promise<void> {
  const extensionConfig = workspace.getConfiguration('blade.format');
  const isEnabled: boolean = extensionConfig.get('enable', true);
  if (!isEnabled) return;

  window.showMessage(`coc-blade-formatter works!`);
  context.subscriptions.push(setupErrorHandler());
  const { fileIsIgnored } = ignoreFileHandler(context.subscriptions);
  const editProvider = new BladeEditProvider(fileIsIgnored);

  const statusItem = window.createStatusBarItem(0);
  context.subscriptions.push(statusItem);
  statusItem.text = extensionConfig.get<string>(
    'statusItemText',
    'Blade Formatter'
  );
  const priority = extensionConfig.get<number>('formatterPriority', 1);

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
    const { languageSelector } = selectors();

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
