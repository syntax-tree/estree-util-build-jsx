/**
 * How to transform JSX.
 */
export type Runtime = 'automatic' | 'classic'

/**
 * Configuration.
 *
 * > 👉 **Note**: you can also configure `runtime`, `importSource`, `pragma`,
 * > and `pragmaFrag` from within files through comments.
 */
export interface Options {
  /**
   * When in the automatic runtime, whether to import
   * `theSource/jsx-dev-runtime.js`, use `jsxDEV`, and pass location info when
   * available (default: `false`).
   *
   * This helps debugging but adds a lot of code that you don’t want in
   * production.
   */
  development?: boolean | null | undefined
  /**
   * File path to the original source file (optional).
   *
   * Passed in location info to `jsxDEV` when using the automatic runtime with
   * `development: true`.
   */
  filePath?: string | null | undefined
  /**
   * Place to import `jsx`, `jsxs`, `jsxDEV`, and `Fragment` from, when the
   * effective runtime is automatic (default: `'react'`).
   *
   * Comment form: `@jsxImportSource theSource`.
   *
   * > 👉 **Note**: `/jsx-runtime` or `/jsx-dev-runtime` is appended to this
   * > provided source.
   * > In CJS, that can resolve to a file (as in `theSource/jsx-runtime.js`),
   * > but for ESM an export map needs to be set up to point to files:
   * >
   * > ```js
   * > // …
   * > "exports": {
   * >   // …
   * >   "./jsx-runtime": "./path/to/jsx-runtime.js",
   * >   "./jsx-dev-runtime": "./path/to/jsx-runtime.js"
   * >   // …
   * > ```
   */
  importSource?: string | null | undefined
  /**
   * Identifier or member expression to use as a symbol for fragments when the
   * effective runtime is classic (default: `'React.Fragment'`).
   *
   * Comment form: `@jsxFrag identifier`.
   */
  pragmaFrag?: string | null | undefined
  /**
   * Identifier or member expression to call when the effective runtime is
   * classic (default: `'React.createElement'`).
   *
   * Comment form: `@jsx identifier`.
   */
  pragma?: string | null | undefined
  /**
   * Choose the runtime (default: `'classic'`).
   *
   * Comment form: `@jsxRuntime theRuntime`.
   */
  runtime?: Runtime | null | undefined
}

/**
 * State where info from comments is gathered.
 */
export interface Annotations {
  /**
   * JSX identifier of fragment (`pragmaFrag`).
   */
  jsxFrag?: string | undefined
  /**
   * Where to import an automatic JSX runtime from.
   */
  jsxImportSource?: string | undefined
  /**
   * Runtime.
   */
  jsxRuntime?: Runtime | undefined
  /**
   * JSX identifier (`pragma`).
   */
  jsx?: string | undefined
}

/**
 * State of used identifiers from the automatic runtime.
 */
export interface Imports {
  /**
   * Symbol of `Fragment`.
   */
  fragment?: boolean | undefined
  /**
   * Symbol of `jsxDEV`.
   */
  jsxDEV?: boolean | undefined
  /**
   * Symbol of `jsxs`.
   */
  jsxs?: boolean | undefined
  /**
   * Symbol of `jsx`.
   */
  jsx?: boolean | undefined
}
