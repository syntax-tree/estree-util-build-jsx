import test from 'tape'
import {Parser} from 'acorn'
// @ts-ignore
import jsx from 'acorn-jsx'
import {walk} from 'estree-walker'
import {generate} from 'astring'
import recast from 'recast'
import escodegen from 'escodegen'
import {buildJsx} from './index.js'

const parser = Parser.extend(jsx())

test('estree-util-build-jsx', (t) => {
  t.deepEqual(
    expression(buildJsx(parse('<><x /></>'))),
    {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: {type: 'Identifier', name: 'React'},
        property: {type: 'Identifier', name: 'createElement'},
        computed: false,
        optional: false
      },
      arguments: [
        {
          type: 'MemberExpression',
          object: {type: 'Identifier', name: 'React'},
          property: {type: 'Identifier', name: 'Fragment'},
          computed: false,
          optional: false
        },
        {type: 'Literal', value: null},
        {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: {type: 'Identifier', name: 'React'},
            property: {type: 'Identifier', name: 'createElement'},
            computed: false,
            optional: false
          },
          arguments: [{type: 'Literal', value: 'x'}],
          optional: false
        }
      ],
      optional: false
    },
    'should default to `React.createElement` / `React.Fragment`'
  )

  t.deepEqual(
    expression(buildJsx(parse('<><x /></>'), {pragma: 'a', pragmaFrag: 'b'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'a'},
      arguments: [
        {type: 'Identifier', name: 'b'},
        {type: 'Literal', value: null},
        {
          type: 'CallExpression',
          callee: {type: 'Identifier', name: 'a'},
          arguments: [{type: 'Literal', value: 'x'}],
          optional: false
        }
      ],
      optional: false
    },
    'should support `pragma`, `pragmaFrag`'
  )

  t.deepEqual(
    expression(buildJsx(parse('<x />'), {pragma: 'a.b-c'})),
    {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: {type: 'Identifier', name: 'a'},
        property: {type: 'Literal', value: 'b-c'},
        computed: true,
        optional: false
      },
      arguments: [{type: 'Literal', value: 'x'}],
      optional: false
    },
    'should support `pragma` w/ non-identifiers (1)'
  )

  t.equal(
    generate(buildJsx(parse('<x />'), {pragma: 'a.b-c'})),
    'a["b-c"]("x");\n',
    'should support `pragma` w/ non-identifiers (2)'
  )

  t.deepEqual(
    expression(buildJsx(parse('/* @jsx a @jsxFrag b */\n<><x /></>'))),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'a'},
      arguments: [
        {type: 'Identifier', name: 'b'},
        {type: 'Literal', value: null},
        {
          type: 'CallExpression',
          callee: {type: 'Identifier', name: 'a'},
          arguments: [{type: 'Literal', value: 'x'}],
          optional: false
        }
      ],
      optional: false
    },
    'should support `@jsx`, `@jsxFrag` comments'
  )

  t.throws(
    () => {
      buildJsx(parse('/* @jsx a @jsxRuntime automatic */'))
    },
    /Unexpected `@jsx` pragma w\/ automatic runtime/,
    'should throw when `@jsx` is set in the automatic runtime'
  )

  t.throws(
    () => {
      buildJsx(parse('/* @jsxFrag a @jsxRuntime automatic */'))
    },
    /Unexpected `@jsxFrag` pragma w\/ automatic runtime/,
    'should throw when `@jsxFrag` is set in the automatic runtime'
  )

  t.throws(
    () => {
      buildJsx(parse('/* @jsxImportSource a @jsxRuntime classic */'))
    },
    /Unexpected `@jsxImportSource` w\/ classic runtime/,
    'should throw when `@jsxImportSource` is set in the classic runtime'
  )

  t.throws(
    () => {
      buildJsx(parse('/* @jsxRuntime a */'))
    },
    /Unexpected `jsxRuntime` `a`, expected `automatic` or `classic`/,
    'should throw on a non-automatic nor classic `@jsxRuntime`'
  )

  t.deepEqual(
    expression(buildJsx(parse('// a\n<><x /></>'))),
    {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: {type: 'Identifier', name: 'React'},
        property: {type: 'Identifier', name: 'createElement'},
        computed: false,
        optional: false
      },
      arguments: [
        {
          type: 'MemberExpression',
          object: {type: 'Identifier', name: 'React'},
          property: {type: 'Identifier', name: 'Fragment'},
          computed: false,
          optional: false
        },
        {type: 'Literal', value: null},
        {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: {type: 'Identifier', name: 'React'},
            property: {type: 'Identifier', name: 'createElement'},
            computed: false,
            optional: false
          },
          arguments: [{type: 'Literal', value: 'x'}],
          optional: false
        }
      ],
      optional: false
    },
    'should ignore other comments'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [{type: 'Literal', value: 'a'}],
      optional: false
    },
    'should support a self-closing element'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a>b</a>'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Literal', value: null},
        {type: 'Literal', value: 'b'}
      ],
      optional: false
    },
    'should support a closed element'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a.b />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {
          type: 'MemberExpression',
          object: {type: 'Identifier', name: 'a'},
          property: {type: 'Identifier', name: 'b'},
          computed: false,
          optional: false
        }
      ],
      optional: false
    },
    'should support dots in a tag name for member expressions'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a.b-c />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {
          type: 'MemberExpression',
          object: {type: 'Identifier', name: 'a'},
          property: {type: 'Literal', value: 'b-c'},
          computed: true,
          optional: false
        }
      ],
      optional: false
    },
    'should support dots *and* dashes in tag names (1)'
  )

  t.equal(
    generate(buildJsx(parse('<a.b-c />'), {pragma: 'h'})),
    'h(a["b-c"]);\n',
    'should support dots *and* dashes in tag names (2)'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a-b.c />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {
          type: 'MemberExpression',
          object: {type: 'Literal', value: 'a-b'},
          property: {type: 'Identifier', name: 'c'},
          computed: false,
          optional: false
        }
      ],
      optional: false
    },
    'should support dots *and* dashes in tag names (3)'
  )

  t.equal(
    generate(buildJsx(parse('<a-b.c />'), {pragma: 'h'})),
    'h(("a-b").c);\n',
    'should support dots *and* dashes in tag names (4)'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a.b.c.d />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {
          type: 'MemberExpression',
          object: {
            type: 'MemberExpression',
            object: {
              type: 'MemberExpression',
              object: {type: 'Identifier', name: 'a'},
              property: {type: 'Identifier', name: 'b'},
              computed: false,
              optional: false
            },
            property: {type: 'Identifier', name: 'c'},
            computed: false,
            optional: false
          },
          property: {type: 'Identifier', name: 'd'},
          computed: false,
          optional: false
        }
      ],
      optional: false
    },
    'should support dots in a tag name for member expressions (2)'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a:b />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [{type: 'Literal', value: 'a:b'}],
      optional: false
    },
    'should support colons in a tag name for namespaces'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a-b />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [{type: 'Literal', value: 'a-b'}],
      optional: false
    },
    'should support dashes in tag names'
  )

  t.deepEqual(
    expression(buildJsx(parse('<A />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [{type: 'Identifier', name: 'A'}],
      optional: false
    },
    'should non-lowercase for components in tag names'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a b />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {
          type: 'ObjectExpression',
          properties: [
            {
              type: 'Property',
              key: {type: 'Identifier', name: 'b'},
              value: {type: 'Literal', value: true},
              kind: 'init',
              method: false,
              shorthand: false,
              computed: false
            }
          ]
        }
      ],
      optional: false
    },
    'should support a boolean prop'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a b:c />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {
          type: 'ObjectExpression',
          properties: [
            {
              type: 'Property',
              key: {type: 'Literal', value: 'b:c'},
              value: {type: 'Literal', value: true},
              kind: 'init',
              method: false,
              shorthand: false,
              computed: false
            }
          ]
        }
      ],
      optional: false
    },
    'should support colons in prop names'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a b-c />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {
          type: 'ObjectExpression',
          properties: [
            {
              type: 'Property',
              key: {type: 'Literal', value: 'b-c'},
              value: {type: 'Literal', value: true},
              kind: 'init',
              method: false,
              shorthand: false,
              computed: false
            }
          ]
        }
      ],
      optional: false
    },
    'should support a prop name that can’t be an identifier'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a b="c" />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {
          type: 'ObjectExpression',
          properties: [
            {
              type: 'Property',
              key: {type: 'Identifier', name: 'b'},
              value: {type: 'Literal', value: 'c'},
              kind: 'init',
              method: false,
              shorthand: false,
              computed: false
            }
          ]
        }
      ],
      optional: false
    },
    'should support a prop value'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a b={c} />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {
          type: 'ObjectExpression',
          properties: [
            {
              type: 'Property',
              key: {type: 'Identifier', name: 'b'},
              value: {type: 'Identifier', name: 'c'},
              kind: 'init',
              method: false,
              shorthand: false,
              computed: false
            }
          ]
        }
      ],
      optional: false
    },
    'should support an expression as a prop value'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a b={1} />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {
          type: 'ObjectExpression',
          properties: [
            {
              type: 'Property',
              key: {type: 'Identifier', name: 'b'},
              value: {type: 'Literal', value: 1},
              kind: 'init',
              method: false,
              shorthand: false,
              computed: false
            }
          ]
        }
      ],
      optional: false
    },
    'should support an expression as a prop value (2)'
  )

  t.deepEqual(
    expression(
      buildJsx(parse('<a b=<>c</> />'), {pragma: 'h', pragmaFrag: 'f'})
    ),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {
          type: 'ObjectExpression',
          properties: [
            {
              type: 'Property',
              key: {type: 'Identifier', name: 'b'},
              value: {
                type: 'CallExpression',
                callee: {type: 'Identifier', name: 'h'},
                arguments: [
                  {type: 'Identifier', name: 'f'},
                  {type: 'Literal', value: null},
                  {type: 'Literal', value: 'c'}
                ],
                optional: false
              },
              kind: 'init',
              method: false,
              shorthand: false,
              computed: false
            }
          ]
        }
      ],
      optional: false
    },
    'should support a fragment as a prop value'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a b=<c /> />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {
          type: 'ObjectExpression',
          properties: [
            {
              type: 'Property',
              key: {type: 'Identifier', name: 'b'},
              value: {
                type: 'CallExpression',
                callee: {type: 'Identifier', name: 'h'},
                arguments: [{type: 'Literal', value: 'c'}],
                optional: false
              },
              kind: 'init',
              method: false,
              shorthand: false,
              computed: false
            }
          ]
        }
      ],
      optional: false
    },
    'should support an element as a prop value'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a {...b} />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Identifier', name: 'b'}
      ],
      optional: false
    },
    'should support a single spread prop'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a {...b} c />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: {type: 'Identifier', name: 'Object'},
            property: {type: 'Identifier', name: 'assign'},
            computed: false,
            optional: false
          },
          arguments: [
            {type: 'ObjectExpression', properties: []},
            {type: 'Identifier', name: 'b'},
            {
              type: 'ObjectExpression',
              properties: [
                {
                  type: 'Property',
                  key: {type: 'Identifier', name: 'c'},
                  value: {type: 'Literal', value: true},
                  kind: 'init',
                  method: false,
                  shorthand: false,
                  computed: false
                }
              ]
            }
          ],
          optional: false
        }
      ],
      optional: false
    },
    'should support a spread prop and another prop'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a b {...c} />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: {type: 'Identifier', name: 'Object'},
            property: {type: 'Identifier', name: 'assign'},
            computed: false,
            optional: false
          },
          arguments: [
            {
              type: 'ObjectExpression',
              properties: [
                {
                  type: 'Property',
                  key: {type: 'Identifier', name: 'b'},
                  value: {type: 'Literal', value: true},
                  kind: 'init',
                  method: false,
                  shorthand: false,
                  computed: false
                }
              ]
            },
            {type: 'Identifier', name: 'c'}
          ],
          optional: false
        }
      ],
      optional: false
    },
    'should support a prop and a spread prop'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a {...b} {...c} />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: {type: 'Identifier', name: 'Object'},
            property: {type: 'Identifier', name: 'assign'},
            computed: false,
            optional: false
          },
          arguments: [
            {type: 'ObjectExpression', properties: []},
            {type: 'Identifier', name: 'b'},
            {type: 'Identifier', name: 'c'}
          ],
          optional: false
        }
      ],
      optional: false
    },
    'should support two spread props'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a {...{b:1,...c,d:2}} />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {
          type: 'ObjectExpression',
          properties: [
            {
              type: 'Property',
              method: false,
              shorthand: false,
              computed: false,
              key: {type: 'Identifier', name: 'b'},
              value: {type: 'Literal', value: 1},
              kind: 'init'
            },
            {type: 'SpreadElement', argument: {type: 'Identifier', name: 'c'}},
            {
              type: 'Property',
              method: false,
              shorthand: false,
              computed: false,
              key: {type: 'Identifier', name: 'd'},
              value: {type: 'Literal', value: 2},
              kind: 'init'
            }
          ]
        }
      ],
      optional: false
    },
    'should support more complex spreads'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a>{1}</a>'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Literal', value: null},
        {type: 'Literal', value: 1}
      ],
      optional: false
    },
    'should support expressions content'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a>{}</a>'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [{type: 'Literal', value: 'a'}],
      optional: false
    },
    'should support empty expressions content'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a>  b</a>'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Literal', value: null},
        {type: 'Literal', value: '  b'}
      ],
      optional: false
    },
    'should support initial spaces in content'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a>b  </a>'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Literal', value: null},
        {type: 'Literal', value: 'b  '}
      ],
      optional: false
    },
    'should support final spaces in content'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a>  b  </a>'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Literal', value: null},
        {type: 'Literal', value: '  b  '}
      ],
      optional: false
    },
    'should support initial and final spaces in content'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a> b \r c \n d \n </a>'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Literal', value: null},
        {type: 'Literal', value: ' b c d'}
      ],
      optional: false
    },
    'should support spaces around line endings'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a> b \r \n c \n\n d \n </a>'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Literal', value: null},
        {type: 'Literal', value: ' b c d'}
      ],
      optional: false
    },
    'should support skip empty or whitespace only line endings'
  )

  t.deepEqual(
    expression(buildJsx(parse('<a> \t\n </a>'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [{type: 'Literal', value: 'a'}],
      optional: false
    },
    'should support skip whitespace only content'
  )

  t.equal(
    generate(
      buildJsx(parse('<>\n  <a b c="d" e={f} {...g}>h</a>\n</>'), {
        pragma: 'h',
        pragmaFrag: 'f'
      })
    ),
    'h(f, null, h("a", Object.assign({\n  b: true,\n  c: "d",\n  e: f\n}, g), "h"));\n',
    'should integrate w/ generators (`astring`)'
  )

  t.equal(
    recast.print(
      buildJsx(parse('<>\n  <a b c="d" e={f} {...g}>h</a>\n</>'), {
        pragma: 'h',
        pragmaFrag: 'f'
      })
    ).code,
    'h(f, null, h("a", Object.assign({\n    b: true,\n    c: "d",\n    e: f\n}, g), "h"));',
    'should integrate w/ generators (`recast`)'
  )

  t.equal(
    escodegen.generate(
      buildJsx(parse('<>\n  <a b c="d" e={f} {...g}>h</a>\n</>'), {
        pragma: 'h',
        pragmaFrag: 'f'
      })
    ),
    "h(f, null, h('a', Object.assign({\n    b: true,\n    c: 'd',\n    e: f\n}, g), 'h'));",
    'should integrate w/ generators (`escodegen`)'
  )

  t.deepEqual(
    buildJsx(parse('<>\n  <a b c="d" e={f} {...g}>h</a>\n</>', false)),
    {
      type: 'Program',
      start: 0,
      end: 38,
      loc: {start: {line: 1, column: 0}, end: {line: 3, column: 3}},
      range: [0, 38],
      body: [
        {
          type: 'ExpressionStatement',
          start: 0,
          end: 38,
          loc: {start: {line: 1, column: 0}, end: {line: 3, column: 3}},
          range: [0, 38],
          expression: {
            type: 'CallExpression',
            callee: {
              type: 'MemberExpression',
              object: {type: 'Identifier', name: 'React'},
              property: {type: 'Identifier', name: 'createElement'},
              computed: false,
              optional: false
            },
            arguments: [
              {
                type: 'MemberExpression',
                object: {type: 'Identifier', name: 'React'},
                property: {type: 'Identifier', name: 'Fragment'},
                computed: false,
                optional: false
              },
              {type: 'Literal', value: null},
              {
                type: 'CallExpression',
                callee: {
                  type: 'MemberExpression',
                  object: {type: 'Identifier', name: 'React'},
                  property: {type: 'Identifier', name: 'createElement'},
                  computed: false,
                  optional: false
                },
                arguments: [
                  {
                    type: 'Literal',
                    value: 'a',
                    start: 6,
                    end: 7,
                    loc: {
                      start: {line: 2, column: 3},
                      end: {line: 2, column: 4}
                    },
                    range: [6, 7]
                  },
                  {
                    type: 'CallExpression',
                    callee: {
                      type: 'MemberExpression',
                      object: {type: 'Identifier', name: 'Object'},
                      property: {type: 'Identifier', name: 'assign'},
                      computed: false,
                      optional: false
                    },
                    arguments: [
                      {
                        type: 'ObjectExpression',
                        properties: [
                          {
                            type: 'Property',
                            key: {
                              type: 'Identifier',
                              name: 'b',
                              start: 8,
                              end: 9,
                              loc: {
                                start: {line: 2, column: 5},
                                end: {line: 2, column: 6}
                              },
                              range: [8, 9]
                            },
                            value: {type: 'Literal', value: true},
                            kind: 'init',
                            method: false,
                            shorthand: false,
                            computed: false,
                            start: 8,
                            end: 9,
                            loc: {
                              start: {line: 2, column: 5},
                              end: {line: 2, column: 6}
                            },
                            range: [8, 9]
                          },
                          {
                            type: 'Property',
                            key: {
                              type: 'Identifier',
                              name: 'c',
                              start: 10,
                              end: 11,
                              loc: {
                                start: {line: 2, column: 7},
                                end: {line: 2, column: 8}
                              },
                              range: [10, 11]
                            },
                            value: {
                              type: 'Literal',
                              start: 12,
                              end: 15,
                              loc: {
                                start: {line: 2, column: 9},
                                end: {line: 2, column: 12}
                              },
                              range: [12, 15],
                              value: 'd'
                            },
                            kind: 'init',
                            method: false,
                            shorthand: false,
                            computed: false,
                            start: 10,
                            end: 15,
                            loc: {
                              start: {line: 2, column: 7},
                              end: {line: 2, column: 12}
                            },
                            range: [10, 15]
                          },
                          {
                            type: 'Property',
                            key: {
                              type: 'Identifier',
                              name: 'e',
                              start: 16,
                              end: 17,
                              loc: {
                                start: {line: 2, column: 13},
                                end: {line: 2, column: 14}
                              },
                              range: [16, 17]
                            },
                            value: {
                              type: 'Identifier',
                              start: 19,
                              end: 20,
                              loc: {
                                start: {line: 2, column: 16},
                                end: {line: 2, column: 17}
                              },
                              range: [19, 20],
                              name: 'f'
                            },
                            kind: 'init',
                            method: false,
                            shorthand: false,
                            computed: false,
                            start: 16,
                            end: 21,
                            loc: {
                              start: {line: 2, column: 13},
                              end: {line: 2, column: 18}
                            },
                            range: [16, 21]
                          }
                        ]
                      },
                      {
                        type: 'Identifier',
                        start: 26,
                        end: 27,
                        loc: {
                          start: {line: 2, column: 23},
                          end: {line: 2, column: 24}
                        },
                        range: [26, 27],
                        name: 'g'
                      }
                    ],
                    optional: false
                  },
                  {
                    type: 'Literal',
                    value: 'h',
                    start: 29,
                    end: 30,
                    loc: {
                      start: {line: 2, column: 26},
                      end: {line: 2, column: 27}
                    },
                    range: [29, 30]
                  }
                ],
                optional: false,
                start: 5,
                end: 34,
                loc: {start: {line: 2, column: 2}, end: {line: 2, column: 31}},
                range: [5, 34]
              }
            ],
            optional: false,
            start: 0,
            end: 38,
            loc: {start: {line: 1, column: 0}, end: {line: 3, column: 3}},
            range: [0, 38]
          }
        }
      ],
      sourceType: 'script',
      comments: []
    },
    'should support positional info'
  )

  t.deepEqual(
    buildJsx(parse('<><x /></>', true, false)),
    {
      type: 'Program',
      body: [
        {
          type: 'ExpressionStatement',
          expression: {
            type: 'CallExpression',
            callee: {
              type: 'MemberExpression',
              object: {type: 'Identifier', name: 'React'},
              property: {type: 'Identifier', name: 'createElement'},
              computed: false,
              optional: false
            },
            arguments: [
              {
                type: 'MemberExpression',
                object: {type: 'Identifier', name: 'React'},
                property: {type: 'Identifier', name: 'Fragment'},
                computed: false,
                optional: false
              },
              {type: 'Literal', value: null},
              {
                type: 'CallExpression',
                callee: {
                  type: 'MemberExpression',
                  object: {type: 'Identifier', name: 'React'},
                  property: {type: 'Identifier', name: 'createElement'},
                  computed: false,
                  optional: false
                },
                arguments: [{type: 'Literal', value: 'x'}],
                optional: false
              }
            ],
            optional: false
          }
        }
      ],
      sourceType: 'script'
    },
    'should support no comments on `program`'
  )

  t.deepEqual(
    generate(buildJsx(parse('<>a</>'), {runtime: 'automatic'})),
    [
      'import {Fragment as _Fragment, jsx as _jsx} from "react/jsx-runtime";',
      '_jsx(_Fragment, {',
      '  children: "a"',
      '});',
      ''
    ].join('\n'),
    'should support the automatic runtime (fragment, jsx, settings)'
  )

  t.deepEqual(
    generate(buildJsx(parse('/*@jsxRuntime automatic*/\n<a key="a">b{1}</a>'))),
    [
      'import {jsxs as _jsxs} from "react/jsx-runtime";',
      '_jsxs("a", {',
      '  children: ["b", 1]',
      '}, "a");',
      ''
    ].join('\n'),
    'should support the automatic runtime (jsxs, key, comment)'
  )

  t.deepEqual(
    generate(buildJsx(parse('<a b="1" {...c}>d</a>'), {runtime: 'automatic'})),
    [
      'import {jsx as _jsx} from "react/jsx-runtime";',
      '_jsx("a", Object.assign({',
      '  b: "1"',
      '}, c, {',
      '  children: "d"',
      '}));',
      ''
    ].join('\n'),
    'should support the automatic runtime (props, spread, children)'
  )

  t.deepEqual(
    generate(
      buildJsx(parse('<a {...{b: 1, c: 2}} d="e">f</a>'), {
        runtime: 'automatic'
      })
    ),
    [
      'import {jsx as _jsx} from "react/jsx-runtime";',
      '_jsx("a", Object.assign({',
      '  b: 1,',
      '  c: 2',
      '}, {',
      '  d: "e",',
      '  children: "f"',
      '}));',
      ''
    ].join('\n'),
    'should support the automatic runtime (spread, props, children)'
  )

  t.deepEqual(
    generate(buildJsx(parse('<a>b</a>'), {runtime: 'automatic'})),
    [
      'import {jsx as _jsx} from "react/jsx-runtime";',
      '_jsx("a", {',
      '  children: "b"',
      '});',
      ''
    ].join('\n'),
    'should support the automatic runtime (no props, children)'
  )

  t.deepEqual(
    generate(buildJsx(parse('<a/>'), {runtime: 'automatic'})),
    [
      'import {jsx as _jsx} from "react/jsx-runtime";',
      '_jsx("a", {});',
      ''
    ].join('\n'),
    'should support the automatic runtime (no props, no children)'
  )

  t.deepEqual(
    generate(buildJsx(parse('<a key/>'), {runtime: 'automatic'})),
    [
      'import {jsx as _jsx} from "react/jsx-runtime";',
      '_jsx("a", {}, true);',
      ''
    ].join('\n'),
    'should support the automatic runtime (key, no props, no children)'
  )

  t.deepEqual(
    generate(
      buildJsx(parse('<>a</>', false), {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })
    ),
    [
      'import {Fragment as _Fragment, jsxDEV as _jsxDEV} from "react/jsx-dev-runtime";',
      '_jsxDEV(_Fragment, {',
      '  children: "a"',
      '}, void 0, false, {',
      '  fileName: "index.js",',
      '  lineNumber: 1,',
      '  columnNumber: 1',
      '});',
      ''
    ].join('\n'),
    'should support the automatic runtime (fragment, jsx, settings, development)'
  )

  t.deepEqual(
    generate(
      buildJsx(parse('<a key="a">b{1}</a>', false), {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })
    ),
    [
      'import {jsxDEV as _jsxDEV} from "react/jsx-dev-runtime";',
      '_jsxDEV("a", {',
      '  children: ["b", 1]',
      '}, "a", true, {',
      '  fileName: "index.js",',
      '  lineNumber: 1,',
      '  columnNumber: 1',
      '});',
      ''
    ].join('\n'),
    'should support the automatic runtime (jsxs, key, comment, development)'
  )

  t.deepEqual(
    generate(
      buildJsx(parse('<a b="1" {...c}>d</a>', false), {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })
    ),
    [
      'import {jsxDEV as _jsxDEV} from "react/jsx-dev-runtime";',
      '_jsxDEV("a", Object.assign({',
      '  b: "1"',
      '}, c, {',
      '  children: "d"',
      '}), void 0, false, {',
      '  fileName: "index.js",',
      '  lineNumber: 1,',
      '  columnNumber: 1',
      '});',
      ''
    ].join('\n'),
    'should support the automatic runtime (props, spread, children, development)'
  )

  t.deepEqual(
    generate(
      buildJsx(parse('<a {...{b: 1, c: 2}} d="e">f</a>', false), {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })
    ),
    [
      'import {jsxDEV as _jsxDEV} from "react/jsx-dev-runtime";',
      '_jsxDEV("a", Object.assign({',
      '  b: 1,',
      '  c: 2',
      '}, {',
      '  d: "e",',
      '  children: "f"',
      '}), void 0, false, {',
      '  fileName: "index.js",',
      '  lineNumber: 1,',
      '  columnNumber: 1',
      '});',
      ''
    ].join('\n'),
    'should support the automatic runtime (spread, props, children, development)'
  )

  t.deepEqual(
    generate(
      buildJsx(parse('<a>b</a>', false), {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })
    ),
    [
      'import {jsxDEV as _jsxDEV} from "react/jsx-dev-runtime";',
      '_jsxDEV("a", {',
      '  children: "b"',
      '}, void 0, false, {',
      '  fileName: "index.js",',
      '  lineNumber: 1,',
      '  columnNumber: 1',
      '});',
      ''
    ].join('\n'),
    'should support the automatic runtime (no props, children, development)'
  )

  t.deepEqual(
    generate(
      buildJsx(parse('<a/>', false), {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })
    ),
    [
      'import {jsxDEV as _jsxDEV} from "react/jsx-dev-runtime";',
      '_jsxDEV("a", {}, void 0, false, {',
      '  fileName: "index.js",',
      '  lineNumber: 1,',
      '  columnNumber: 1',
      '});',
      ''
    ].join('\n'),
    'should support the automatic runtime (no props, no children, development)'
  )

  t.deepEqual(
    generate(
      buildJsx(parse('<a key/>', false), {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })
    ),
    [
      'import {jsxDEV as _jsxDEV} from "react/jsx-dev-runtime";',
      '_jsxDEV("a", {}, true, false, {',
      '  fileName: "index.js",',
      '  lineNumber: 1,',
      '  columnNumber: 1',
      '});',
      ''
    ].join('\n'),
    'should support the automatic runtime (key, no props, no children, development)'
  )

  t.deepEqual(
    generate(
      buildJsx(parse('<a />', false), {
        runtime: 'automatic',
        development: true
      })
    ),
    [
      'import {jsxDEV as _jsxDEV} from "react/jsx-dev-runtime";',
      '_jsxDEV("a", {}, void 0, false);',
      ''
    ].join('\n'),
    'should support the automatic runtime (no props, no children, development, no filePath)'
  )

  t.deepEqual(
    generate(
      buildJsx(parse('<a />'), {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })
    ),
    [
      'import {jsxDEV as _jsxDEV} from "react/jsx-dev-runtime";',
      '_jsxDEV("a", {}, void 0, false, {',
      '  fileName: "index.js"',
      '});',
      ''
    ].join('\n'),
    'should support the automatic runtime (no props, no children, development, no locations)'
  )

  t.deepEqual(
    generate(
      buildJsx(parse('<a>\n  <b />\n</a>', false), {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })
    ),
    [
      'import {jsxDEV as _jsxDEV} from "react/jsx-dev-runtime";',
      '_jsxDEV("a", {',
      '  children: _jsxDEV("b", {}, void 0, false, {',
      '    fileName: "index.js",',
      '    lineNumber: 2,',
      '    columnNumber: 3',
      '  })',
      '}, void 0, false, {',
      '  fileName: "index.js",',
      '  lineNumber: 1,',
      '  columnNumber: 1',
      '});',
      ''
    ].join('\n'),
    'should support the automatic runtime (no props, nested children, development, positional info)'
  )

  t.throws(
    () => {
      buildJsx(parse('<a {...b} key/>'), {runtime: 'automatic'})
    },
    /Expected `key` to come before any spread expressions/,
    'should throw on spread after `key`'
  )

  t.deepEqual(
    generate(
      buildJsx(parse('/*@jsxRuntime classic*/ <a/>'), {runtime: 'automatic'})
    ),
    'React.createElement("a");\n',
    'should prefer a `jsxRuntime` comment over a `runtime` option'
  )

  t.end()
})

/**
 * @param {import('estree-jsx').Program} program
 * @returns {import('estree-jsx').Expression}
 */
function expression(program) {
  const head = program.body[0]

  if (!head || head.type !== 'ExpressionStatement') {
    throw new Error('Expected single expression')
  }

  return head.expression
}

/**
 * @param {string} doc
 * @param {boolean} [clean=true]
 * @param {boolean} [addComments=true]
 * @returns {import('estree-jsx').Program}
 */
function parse(doc, clean, addComments) {
  /** @type {import('estree-jsx').Comment[]} */
  const comments = []
  /** @type {import('estree-jsx').Program} */
  // @ts-ignore
  const tree = parser.parse(doc, {
    ecmaVersion: 2020,
    ranges: true,
    locations: true,
    // @ts-ignore
    onComment: comments
  })

  if (addComments !== false) tree.comments = comments

  // @ts-expect-error: types are wrong.
  if (clean !== false) walk(tree, {leave})

  return JSON.parse(JSON.stringify(tree))

  /**
   * @type {import('estree-walker').SyncHandler}
   * @param {import('estree-jsx').Node} n
   */
  function leave(n) {
    delete n.loc
    delete n.range
    // @ts-ignore
    delete n.start
    // @ts-ignore
    delete n.end
    // @ts-ignore
    delete n.raw
  }
}
