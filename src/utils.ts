import { Uri, workspace } from 'coc.nvim';
import { BladeFormatterConfig } from './types';

export function getConfig(uri?: Uri): BladeFormatterConfig {
  return workspace.getConfiguration(
    'bladeFormatter.format',
    uri?.toString()
  ) as any;
}
