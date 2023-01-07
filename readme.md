# estree-util-build-jsx

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[estree][] utility to turn JSX into function calls: `<x />` -> `h('x')`!

## Contents

*   [What is this?](#what-is-this)
*   [When should I use this?](#when-should-i-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`buildJsx(tree, options?)`](#buildjsxtree-options)
*   [Examples](#examples)
    *   [Example: use with Acorn](#example-use-with-acorn)
*   [Algorithm](#algorithm)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Related](#related)
*   [Security](#security)
*   [Contribute](#contribute)
*   [License](#license)

## What is this?

This package is a utility that takes an [estree][] (JavaScript) syntax tree as
input that contains embedded JSX nodes (elements, fragments) and turns them into
function calls.

## When should I use this?

If you already have a tree and only need to compile JSX away, use this.
If you have code, using something like [SWC][] or [esbuild][] instead.

## Install

This package is [ESM only][esm].
In Node.js (version 14.14+, 16.0+), install with [npm][]:

```sh
npm install estree-util-build-jsx
```

In Deno with [`esm.sh`][esmsh]:

```js
import {buildJsx} from 'https://esm.sh/estree-util-build-jsx@2'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {buildJsx} from 'https://esm.sh/estree-util-build-jsx@2?bundle'
</script>
```

## Use

Say we have the following `example.jsx`:

```js
import x from 'xastscript'

console.log(
  <album id={123}>
    <name>Born in the U.S.A.</name>
    <artist>Bruce Springsteen</artist>
    <releasedate date="1984-04-06">April 6, 1984</releasedate>
  </album>
)

console.log(
  <>
    {1 + 1}
    <self-closing />
    <x name key="value" key={expression} {...spread} />
  </>
)
```

…and next to it a module `example.js`:

```js
import fs from 'node:fs/promises'
import {Parser} from 'acorn'
import jsx from 'acorn-jsx'
import {generate} from 'astring'
import {buildJsx} from 'estree-util-build-jsx'

const doc = String(await fs.readFile('example.jsx'))

const tree = Parser.extend(jsx()).parse(doc, {
  sourceType: 'module',
  ecmaVersion: 2022
})

buildJsx(tree, {pragma: 'x', pragmaFrag: 'null'})

console.log(generate(tree))
```

…now running `node example.js` yields:

```js
import x from 'xastscript';
console.log(x("album", {
  id: 123
}, x("name", null, "Born in the U.S.A."), x("artist", null, "Bruce Springsteen"), x("releasedate", {
  date: "1984-04-06"
}, "April 6, 1984")));
console.log(x(null, null, 1 + 1, x("self-closing"), x("x", Object.assign({
  name: true,
  key: "value",
  key: expression
}, spread))));
```

## API

This package exports the identifier `buildJsx`.
There is no default export.

### `buildJsx(tree, options?)`

Turn JSX in `tree` ([`Program`][program]) into function calls:
`<x />` -> `h('x')`!

##### `options`

Configuration (optional).

> 👉 **Note**: you can also configure `runtime`, `importSource`, `pragma`, and
> `pragmaFrag` from within files through comments.

###### `options.runtime`

Choose the [runtime][]
(`string`, `'automatic'` or `'classic'`, default: `'classic'`).

Comment form: `@jsxRuntime theRuntime`.

###### `options.importSource`

Place to import `jsx`, `jsxs`, `jsxDEV`, and/or `Fragment` from, when the
effective runtime is automatic (`string`, default: `'react'`).

Comment form: `@jsxImportSource theSource`.

> 👉 **Note**: `/jsx-runtime` or `/jsx-dev-runtime` is appended to this provided
> source.
> In CJS, that can resolve to a file (as in `theSource/jsx-runtime.js`), but for
> ESM an export map needs to be set up to point to files:
>
> ```js
> // …
> "exports": {
>   // …
>   "./jsx-runtime": "./path/to/jsx-runtime.js",
>   "./jsx-dev-runtime": "./path/to/jsx-runtime.js"
>   // …
> ```

###### `options.pragma`

Identifier or member expression to call when the effective runtime is classic
(`string`, default: `'React.createElement'`).

Comment form: `@jsx identifier`.

###### `options.pragmaFrag`

Identifier or member expression to use as a symbol for fragments when the
effective runtime is classic (`string`, default: `'React.Fragment'`).

Comment form: `@jsxFrag identifier`.

###### `options.development`

Import `jsxDEV` from `theSource/jsx-dev-runtime.js` and add location info on
where a component originated from (`boolean`, default: `false`).
This helps debugging but adds a lot of code that you don’t want in production.
Only used in the automatic runtime.

###### `options.filePath`

File path to the original source file (`string`, example: `'path/to/file.js'`).
Used in the location info when using the automatic runtime with
`development: true`.

##### Returns

The given `tree` (`Node`).

## Examples

### Example: use with Acorn

To support configuration from comments in Acorn, those comments have to be in
the program.
This is done by [`espree`][espree] but not automatically by [`acorn`][acorn]:

```js
import {Parser} from 'acorn'
import jsx from 'acorn-jsx'

const doc = '' // To do: get `doc` somehow.

const comments = []
const tree = Parser.extend(jsx()).parse(doc, {onComment: comments})
tree.comments = comments
```

## Algorithm

In almost all cases, this utility is the same as the Babel plugin, except that
they work on slightly different syntax trees.

Some differences:

*   no pure annotations things
*   `this` is not a component: `<this>` -> `h('this')`, not `h(this)`
*   namespaces are supported: `<a:b c:d>` -> `h('a:b', {'c:d': true})`,
    which throws by default in Babel or can be turned on with `throwIfNamespace`
*   no `useSpread`, `useBuiltIns`, or `filter` options

## Types

This package is fully typed with [TypeScript][].
It exports the additional type `Options` and `Runtime`.

## Compatibility

Projects maintained by the unified collective are compatible with all maintained
versions of Node.js.
As of now, that is Node.js 14.14+ and 16.0+.
Our projects sometimes work with older versions, but this is not guaranteed.

## Related

*   [`syntax-tree/hast-util-to-estree`](https://github.com/syntax-tree/hast-util-to-estree)
    — turn [hast](https://github.com/syntax-tree/hast) (HTML) to [estree][]
    JSX
*   [`coderaiser/estree-to-babel`](https://github.com/coderaiser/estree-to-babel)
    — turn [estree][] to Babel trees

## Security

This package is safe.

## Contribute

See [`contributing.md` in `syntax-tree/.github`][contributing] for ways to get
started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://github.com/syntax-tree/estree-util-build-jsx/workflows/main/badge.svg

[build]: https://github.com/syntax-tree/estree-util-build-jsx/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/syntax-tree/estree-util-build-jsx.svg

[coverage]: https://codecov.io/github/syntax-tree/estree-util-build-jsx

[downloads-badge]: https://img.shields.io/npm/dm/estree-util-build-jsx.svg

[downloads]: https://www.npmjs.com/package/estree-util-build-jsx

[size-badge]: https://img.shields.io/bundlephobia/minzip/estree-util-build-jsx.svg

[size]: https://bundlephobia.com/result?p=estree-util-build-jsx

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[chat]: https://github.com/syntax-tree/unist/discussions

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[npm]: https://docs.npmjs.com/cli/install

[esmsh]: https://esm.sh

[license]: license

[author]: https://wooorm.com

[typescript]: https://www.typescriptlang.org

[contributing]: https://github.com/syntax-tree/.github/blob/main/contributing.md

[support]: https://github.com/syntax-tree/.github/blob/main/support.md

[coc]: https://github.com/syntax-tree/.github/blob/main/code-of-conduct.md

[acorn]: https://github.com/acornjs/acorn

[estree]: https://github.com/estree/estree

[espree]: https://github.com/eslint/espree

[program]: https://github.com/estree/estree/blob/master/es5.md#programs

[runtime]: https://reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html

[swc]: https://swc.rs

[esbuild]: https://esbuild.github.io
