import { Uri, workspace } from 'coc.nvim';
import { BladeFormatConfig } from './types';

export function getConfig(uri?: Uri): BladeFormatConfig {
  return workspace.getConfiguration('blade.format', uri?.toString()) as any;
}
