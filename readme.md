# estree-util-build-jsx

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

Transform JSX to function calls: `<x />` -> `h('x')`!

There is currently one project actively maintained that can transform JSX to
function calls: Babel.
Babel is amazing but ginormous (±300kb) and slow.
Switching from it to [estree][] in a project where Babel was only a small part
made the whole project [**68% smaller and 63% faster**][pr].
So let’s make that two implementations.

## Install

This package is ESM only: Node 12+ is needed to use it and it must be `import`ed
instead of `require`d.

[npm][]:

```sh
npm install estree-util-build-jsx
```

## Use

Say we have the following file, `example.jsx`:

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

And our script, `example.js`, looks as follows:

```js
import fs from 'node:fs'
import {Parser} from 'acorn'
import jsx from 'acorn-jsx'
import {generate} from 'astring'
import {buildJsx} from 'estree-util-build-jsx'

const doc = fs.readFileSync('example.jsx')

const tree = Parser.extend(jsx()).parse(doc, {
  sourceType: 'module',
  ecmaVersion: 2020
})

buildJsx(tree, {pragma: 'x', pragmaFrag: 'null'})

console.log(generate(tree))
```

Now, running `node example` yields:

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

This package exports the following identifiers: `buildJsx`.
There is no default export.

### `buildJsx(tree, options?)`

Turn JSX in `tree` ([`Program`][program]) into hyperscript calls.

##### `options`

###### `options.runtime`

Choose the [runtime][].
(`string`, `'automatic'` or `'classic'`, default: `'classic'`).
Comment form: `@jsxRuntime theRuntime`.

###### `options.importSource`

Place to import `jsx`, `jsxs`, and/or `Fragment` from, when the effective
runtime is automatic (`string`, default: `'react'`).
Comment: `@jsxImportSource theSource`.
Note that `/jsx-runtime` is appended to this provided source.

##### `options.development`

If the automatic runtime is used, this compiles JSX into automatic runtime
development mode (`boolean`, default: `false`).

###### `options.filePath`

If the automatic runtime development mode is used, this option is used to
provide a file path to map the JSX node to a source file (`string`).

###### `options.pragma`

Identifier or member expression to call when the effective runtime is classic
(`string`, default: `'React.createElement'`).
Comment: `@jsx identifier`.

###### `options.pragmaFrag`

Identifier or member expression to use as a sumbol for fragments when the
effective runtime is classic (`string`, default: `'React.Fragment'`).
Comment: `@jsxFrag identifier`.

###### Returns

`Node` — The given `tree`.

###### Notes

To support configuration from comments, those comments have to be in the
program.
This is done automatically by [`espree`][espree].
For [`acorn`][acorn], it can be done like so:

```js
import {Parser} from 'acorn'
import jsx from 'acorn-jsx'

var doc = ''

var comments = []
var tree = Parser.extend(jsx()).parse(doc, {onComment: comments})
tree.comments = comments
```

In almost all cases, this utility is the same as the Babel plugin, except that
they work on slightly different syntax trees.

Some differences:

*   No pure annotations or dev things
*   `this` is not a component: `<this>` -> `h('this')`, not `h(this)`
*   Namespaces are supported: `<a:b c:d>` -> `h('a:b', {'c:d': true})`,
    which throws by default in Babel or can be turned on with `throwIfNamespace`
*   No `useSpread`, `useBuiltIns`, or `filter` options

## Related

*   [`syntax-tree/hast-util-to-estree`](https://github.com/syntax-tree/hast-util-to-estree)
    — Transform [hast](https://github.com/syntax-tree/hast) (HTML) to [estree][]
    JSX
*   [`coderaiser/estree-to-babel`](https://github.com/coderaiser/estree-to-babel)
    — Transform [estree][] to Babel trees

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

[npm]: https://docs.npmjs.com/cli/install

[license]: license

[author]: https://wooorm.com

[acorn]: https://github.com/acornjs/acorn

[estree]: https://github.com/estree/estree

[espree]: https://github.com/eslint/espree

[program]: https://github.com/estree/estree/blob/master/es5.md#programs

[pr]: https://github.com/mdx-js/mdx/pull/1399

[runtime]: https://reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html
