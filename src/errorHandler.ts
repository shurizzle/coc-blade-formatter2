import { commands, Disposable, OutputChannel, window } from 'coc.nvim';

let outputChannel: OutputChannel;

function addFilePath(msg: string, fileName: string): string {
  const lines = msg.split('\n');
  if (lines.length > 0) {
    lines[0] = lines[0].replace(/(\d*):(\d*)/g, `${fileName}:$1:$2`);
    return lines.join('\n');
  }

  return msg;
}

export function addToOutput(message: string, type = 'Trace'): void {
  if (!outputChannel) return;
  const title = `${type} - ${new Date().toLocaleString()}`;

  outputChannel.append('');
  outputChannel.appendLine(`[${title}] ${message}\n`);
}

function wrapAsync(cb: (() => string) | Promise<string>): Promise<string> {
  if (cb instanceof Promise) {
    return cb;
  }

  return (async () => {
    return cb();
  })();
}

export function safeExecute(
  cb: (() => string) | Promise<string>,
  defaultText: string,
  fileName: string
): string | Promise<string> {
  return wrapAsync(cb).catch((err: Error) => {
    addToOutput(addFilePath(err.message, fileName), 'Error');
    return defaultText;
  });
}

export function setupErrorHandler(): Disposable {
  outputChannel = window.createOutputChannel('bladeFormatter');

  return commands.registerCommand('bladeFormatter.open-output', () => {
    outputChannel.show();
  });
}
