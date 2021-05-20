export type WrapAttributes =
  | 'auto'
  | 'force'
  | 'force-aligned'
  | 'force-expand-multiline'
  | 'aligned-multiple'
  | 'preserve'
  | 'preserve-aligned';

export type BladeFormatterConfig = {
  /**
   * Wheter it enabled format
   */
  enabled: boolean;

  /**
   * Indent size
   */
  indentSize: number;

  /**
   * The length of line wrap size
   */
  wrapLineLenght: number;

  /**
   * The way to wrap attributes
   */
  wrapAttributes: WrapAttributes;

  /**
   * Path to '.bladeignore' or similar
   */
  ignorePath: string;

  /**
   * Disable the 'Formatted by Blade Formatter' message which is echoed every
   * time a file is successfully formatted
   */
  disableSuccessMessage: boolean;

  /**
   * Text shown in status item.
   */
  statusItemText: string;

  /**
   * Priority of format provider, default to 1 that higher than other languageserver formatter, change to -1 to make it lower priority.
   */
  formatterPriority: number;
};
