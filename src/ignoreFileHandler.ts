import { Disposable, Uri, workspace } from 'coc.nvim';
import { existsSync, readFileSync } from 'fs';
import ignore from 'ignore';
import * as path from 'path';
import { addToOutput } from './errorHandler';
import { getConfig } from './utils';

interface Ignorer {
  ignores(filePath: string): boolean;
}

const nullIgnorer: Ignorer = { ignores: () => false };

export default function ignoreFileHandler(disposables: Disposable[]): any {
  const ignorers = new Map<string, Ignorer>();
  disposables.push({ dispose: () => ignorers.clear() });
  return {
    fileIsIgnored(filePath: string): boolean {
      const { ignorer, ignoreFilePath } = getIgnorerForFile(filePath);
      return ignorer.ignores(
        path.relative(path.dirname(ignoreFilePath), filePath)
      );
    },
  };

  function getIgnorerForFile(fsPath: string): {
    ignorer: Ignorer;
    ignoreFilePath: string;
  } {
    const absolutePath = getIgnorePathForFile(
      fsPath,
      getConfig(Uri.file(fsPath)).ignorePath
    );

    if (!absolutePath) {
      return { ignoreFilePath: '', ignorer: nullIgnorer };
    }

    if (!ignorers.has(absolutePath)) {
      loadIgnorer(Uri.file(absolutePath));
    }

    if (!existsSync(absolutePath)) {
      const ignorePath = getConfig(Uri.file(fsPath)).ignorePath;
      if (ignorePath !== '.bladeignore') {
        addToOutput(
          `Wrong blade.format.ignorePath provided in your settings. ` +
            `The path (${ignorePath}) does not exists.`,
          'Warning'
        );
      }
      return { ignoreFilePath: '', ignorer: nullIgnorer };
    }

    return {
      ignoreFilePath: absolutePath,
      ignorer: ignorers.get(absolutePath)!,
    };
  }

  function loadIgnorer(ignoreUri: Uri): void {
    let ignorer = nullIgnorer;

    if (!ignorers.has(ignoreUri.fsPath)) {
      const fileWatcher = workspace.createFileSystemWatcher(ignoreUri.fsPath);
      disposables.push(fileWatcher);

      fileWatcher.onDidCreate(loadIgnorer, null, disposables);
      fileWatcher.onDidChange(loadIgnorer, null, disposables);
      fileWatcher.onDidDelete(unloadIgnorer, null, disposables);
    }

    if (existsSync(ignoreUri.fsPath)) {
      const ignoreFileContents = readFileSync(ignoreUri.fsPath, 'utf8');
      ignorer = ignore().add(ignoreFileContents);
    }

    ignorers.set(ignoreUri.fsPath, ignorer);
  }

  function unloadIgnorer(ignoreUri: Uri): void {
    ignorers.set(ignoreUri.fsPath, nullIgnorer);
  }
}

function getIgnorePathForFile(
  _filePath: string,
  ignorePath: string
): string | null {
  if (!ignorePath) {
    return null;
  }

  if (workspace.workspaceFolder) {
    const folder = workspace.workspaceFolder;
    return folder ? getPath(ignorePath, Uri.parse(folder.uri).fsPath) : null;
  }

  return null;
}

function getPath(fsPath: string, relativeTo: string): string {
  return path.isAbsolute(fsPath) ? fsPath : path.join(relativeTo, fsPath);
}
