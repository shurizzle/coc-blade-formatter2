export type BladeFormatConfig = {
  /**
   * Path to '.bladeignore' or similar
   */
  ignorePath: string;

  /**
   * Disable the 'Formatted by blade-formatter' message which is echoed every
   * time a file is successfully formatted
   */
  disableSuccessMessage: boolean;
};
