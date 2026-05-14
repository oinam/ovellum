export interface OvellumErrorOptions {
  /** Short machine-readable code, e.g. `INVALID_CONFIG`. */
  code: string;
  /** Optional hint to surface in the CLI alongside the message. */
  hint?: string;
  /** Optional underlying cause. */
  cause?: unknown;
}

export class OvellumError extends Error {
  readonly code: string;
  readonly hint?: string;

  constructor(message: string, options: OvellumErrorOptions) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'OvellumError';
    this.code = options.code;
    this.hint = options.hint;
  }
}

export class ConfigError extends OvellumError {
  constructor(message: string, options?: { hint?: string; cause?: unknown }) {
    super(message, { code: 'INVALID_CONFIG', hint: options?.hint, cause: options?.cause });
    this.name = 'ConfigError';
  }
}
