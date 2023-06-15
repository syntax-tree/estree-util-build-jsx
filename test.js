import assert from 'node:assert/strict'
import test from 'node:test'
import {Parser} from 'acorn'
import jsx from 'acorn-jsx'
import {walk} from 'estree-walker'
import {generate} from 'astring'
import recast from 'recast'
import escodegen from 'escodegen'
import {buildJsx} from './index.js'
import * as mod from './index.js'

const parser = Parser.extend(jsx())

test('should expose the public api', () => {
  assert.deepEqual(Object.keys(mod).sort(), ['buildJsx'])
})

test('should default to `React.createElement` / `React.Fragment`', () => {
  assert.deepEqual(expression(buildJsx(parse('<><x /></>'))), {
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
  })
})

test('should support `pragma`, `pragmaFrag`', () => {
  assert.deepEqual(
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
    }
  )
})

test('should support `pragma` w/ non-identifiers (1)', () => {
  assert.deepEqual(expression(buildJsx(parse('<x />'), {pragma: 'a.b-c'})), {
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
  })
})

test('should support `pragma` w/ non-identifiers (2)', () => {
  assert.equal(
    generate(buildJsx(parse('<x />'), {pragma: 'a.b-c'})),
    'a["b-c"]("x");\n'
  )
})

test('should support `@jsx`, `@jsxFrag` comments', () => {
  assert.deepEqual(
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
    }
  )
})

test('should throw when `@jsx` is set in the automatic runtime', () => {
  assert.throws(() => {
    buildJsx(parse('/* @jsx a @jsxRuntime automatic */'))
  }, /Unexpected `@jsx` pragma w\/ automatic runtime/)
})

test('should throw when `@jsxFrag` is set in the automatic runtime', () => {
  assert.throws(() => {
    buildJsx(parse('/* @jsxFrag a @jsxRuntime automatic */'))
  }, /Unexpected `@jsxFrag` pragma w\/ automatic runtime/)
})

test('should throw when `@jsxImportSource` is set in the classic runtime', () => {
  assert.throws(() => {
    buildJsx(parse('/* @jsxImportSource a @jsxRuntime classic */'))
  }, /Unexpected `@jsxImportSource` w\/ classic runtime/)
})

test('should throw on a non-automatic nor classic `@jsxRuntime`', () => {
  assert.throws(() => {
    buildJsx(parse('/* @jsxRuntime a */'))
  }, /Unexpected `jsxRuntime` `a`, expected `automatic` or `classic`/)
})

test('should ignore other comments', () => {
  assert.deepEqual(expression(buildJsx(parse('// a\n<><x /></>'))), {
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
  })
})

test('should support a self-closing element', () => {
  assert.deepEqual(expression(buildJsx(parse('<a />'), {pragma: 'h'})), {
    type: 'CallExpression',
    callee: {type: 'Identifier', name: 'h'},
    arguments: [{type: 'Literal', value: 'a'}],
    optional: false
  })
})

test('should support a closed element', () => {
  assert.deepEqual(expression(buildJsx(parse('<a>b</a>'), {pragma: 'h'})), {
    type: 'CallExpression',
    callee: {type: 'Identifier', name: 'h'},
    arguments: [
      {type: 'Literal', value: 'a'},
      {type: 'Literal', value: null},
      {type: 'Literal', value: 'b'}
    ],
    optional: false
  })
})

test('should support dots in a tag name for member expressions', () => {
  assert.deepEqual(expression(buildJsx(parse('<a.b />'), {pragma: 'h'})), {
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
  })
})

test('should support dots *and* dashes in tag names (1)', () => {
  assert.deepEqual(expression(buildJsx(parse('<a.b-c />'), {pragma: 'h'})), {
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
  })
})

test('should support dots *and* dashes in tag names (2)', () => {
  assert.equal(
    generate(buildJsx(parse('<a.b-c />'), {pragma: 'h'})),
    'h(a["b-c"]);\n'
  )
})

test('should support dots *and* dashes in tag names (3)', () => {
  assert.deepEqual(expression(buildJsx(parse('<a-b.c />'), {pragma: 'h'})), {
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
  })
})

test('should support dots *and* dashes in tag names (4)', () => {
  assert.equal(
    generate(buildJsx(parse('<a-b.c />'), {pragma: 'h'})),
    'h(("a-b").c);\n'
  )
})

test('should support dots in a tag name for member expressions (2)', () => {
  assert.deepEqual(expression(buildJsx(parse('<a.b.c.d />'), {pragma: 'h'})), {
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
  })
})

test('should support colons in a tag name for namespaces', () => {
  assert.deepEqual(expression(buildJsx(parse('<a:b />'), {pragma: 'h'})), {
    type: 'CallExpression',
    callee: {type: 'Identifier', name: 'h'},
    arguments: [{type: 'Literal', value: 'a:b'}],
    optional: false
  })
})

test('should support dashes in tag names', () => {
  assert.deepEqual(expression(buildJsx(parse('<a-b />'), {pragma: 'h'})), {
    type: 'CallExpression',
    callee: {type: 'Identifier', name: 'h'},
    arguments: [{type: 'Literal', value: 'a-b'}],
    optional: false
  })
})

test('should non-lowercase for components in tag names', () => {
  assert.deepEqual(expression(buildJsx(parse('<A />'), {pragma: 'h'})), {
    type: 'CallExpression',
    callee: {type: 'Identifier', name: 'h'},
    arguments: [{type: 'Identifier', name: 'A'}],
    optional: false
  })
})

test('should support a boolean prop', () => {
  assert.deepEqual(expression(buildJsx(parse('<a b />'), {pragma: 'h'})), {
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
  })
})

test('should support colons in prop names', () => {
  assert.deepEqual(expression(buildJsx(parse('<a b:c />'), {pragma: 'h'})), {
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
  })
})

test('should support a prop name that can’t be an identifier', () => {
  assert.deepEqual(expression(buildJsx(parse('<a b-c />'), {pragma: 'h'})), {
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
  })
})

test('should support a prop value', () => {
  assert.deepEqual(expression(buildJsx(parse('<a b="c" />'), {pragma: 'h'})), {
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
  })
})

test('should support an expression as a prop value', () => {
  assert.deepEqual(expression(buildJsx(parse('<a b={c} />'), {pragma: 'h'})), {
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
  })
})

test('should support an expression as a prop value (2)', () => {
  assert.deepEqual(expression(buildJsx(parse('<a b={1} />'), {pragma: 'h'})), {
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
  })
})

test('should support a fragment as a prop value', () => {
  assert.deepEqual(
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
    }
  )
})

test('should support an element as a prop value', () => {
  assert.deepEqual(
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
    }
  )
})

test('should support a single spread prop', () => {
  assert.deepEqual(expression(buildJsx(parse('<a {...b} />'), {pragma: 'h'})), {
    type: 'CallExpression',
    callee: {type: 'Identifier', name: 'h'},
    arguments: [
      {type: 'Literal', value: 'a'},
      {
        type: 'ObjectExpression',
        properties: [
          {type: 'SpreadElement', argument: {type: 'Identifier', name: 'b'}}
        ]
      }
    ],
    optional: false
  })
})

test('should support a spread prop and another prop', () => {
  assert.deepEqual(
    expression(buildJsx(parse('<a {...b} c />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {
          type: 'ObjectExpression',
          properties: [
            {
              type: 'SpreadElement',
              argument: {type: 'Identifier', name: 'b'}
            },
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
  )
})

test('should support a prop and a spread prop', () => {
  assert.deepEqual(
    expression(buildJsx(parse('<a b {...c} />'), {pragma: 'h'})),
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
            },
            {type: 'SpreadElement', argument: {type: 'Identifier', name: 'c'}}
          ]
        }
      ],
      optional: false
    }
  )
})

test('should support two spread props', () => {
  assert.deepEqual(
    expression(buildJsx(parse('<a {...b} {...c} />'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {
          type: 'ObjectExpression',
          properties: [
            {
              type: 'SpreadElement',
              argument: {type: 'Identifier', name: 'b'}
            },
            {
              type: 'SpreadElement',
              argument: {type: 'Identifier', name: 'c'}
            }
          ]
        }
      ],
      optional: false
    }
  )
})

test('should support more complex spreads', () => {
  assert.deepEqual(
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
            {
              type: 'SpreadElement',
              argument: {type: 'Identifier', name: 'c'}
            },
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
    }
  )
})

test('should support expressions content', () => {
  assert.deepEqual(expression(buildJsx(parse('<a>{1}</a>'), {pragma: 'h'})), {
    type: 'CallExpression',
    callee: {type: 'Identifier', name: 'h'},
    arguments: [
      {type: 'Literal', value: 'a'},
      {type: 'Literal', value: null},
      {type: 'Literal', value: 1}
    ],
    optional: false
  })
})

test('should support empty expressions content', () => {
  assert.deepEqual(expression(buildJsx(parse('<a>{}</a>'), {pragma: 'h'})), {
    type: 'CallExpression',
    callee: {type: 'Identifier', name: 'h'},
    arguments: [{type: 'Literal', value: 'a'}],
    optional: false
  })
})

test('should support initial spaces in content', () => {
  assert.deepEqual(expression(buildJsx(parse('<a>  b</a>'), {pragma: 'h'})), {
    type: 'CallExpression',
    callee: {type: 'Identifier', name: 'h'},
    arguments: [
      {type: 'Literal', value: 'a'},
      {type: 'Literal', value: null},
      {type: 'Literal', value: '  b'}
    ],
    optional: false
  })
})

test('should support final spaces in content', () => {
  assert.deepEqual(expression(buildJsx(parse('<a>b  </a>'), {pragma: 'h'})), {
    type: 'CallExpression',
    callee: {type: 'Identifier', name: 'h'},
    arguments: [
      {type: 'Literal', value: 'a'},
      {type: 'Literal', value: null},
      {type: 'Literal', value: 'b  '}
    ],
    optional: false
  })
})

test('should support initial and final spaces in content', () => {
  assert.deepEqual(expression(buildJsx(parse('<a>  b  </a>'), {pragma: 'h'})), {
    type: 'CallExpression',
    callee: {type: 'Identifier', name: 'h'},
    arguments: [
      {type: 'Literal', value: 'a'},
      {type: 'Literal', value: null},
      {type: 'Literal', value: '  b  '}
    ],
    optional: false
  })
})

test('should support spaces around line endings', () => {
  assert.deepEqual(
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
    }
  )
})

test('should support skip empty or whitespace only line endings', () => {
  assert.deepEqual(
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
    }
  )
})

test('should support skip whitespace only content', () => {
  assert.deepEqual(
    expression(buildJsx(parse('<a> \t\n </a>'), {pragma: 'h'})),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [{type: 'Literal', value: 'a'}],
      optional: false
    }
  )
})

test('should trim strings with leading line feed', () => {
  assert.deepEqual(
    expression(
      buildJsx(parse(['<a>', '  line1', '</a>'].join('\n')), {pragma: 'h'})
    ),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Literal', value: null},
        {type: 'Literal', value: 'line1'}
      ],
      optional: false
    }
  )
})

test('should trim strings with leading line feed (multiline test)', () => {
  assert.deepEqual(
    expression(
      buildJsx(parse(['<a>', '  line1{" "}', '  line2', '</a>'].join('\n')), {
        pragma: 'h'
      })
    ),
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Literal', value: null},
        {type: 'Literal', value: 'line1'},
        {type: 'Literal', value: ' '},
        {type: 'Literal', value: 'line2'}
      ],
      optional: false
    }
  )
})

test('should integrate w/ generators (`astring`)', () => {
  assert.equal(
    generate(
      buildJsx(parse('<>\n  <a b c="d" e={f} {...g}>h</a>\n</>'), {
        pragma: 'h',
        pragmaFrag: 'f'
      })
    ),
    'h(f, null, h("a", {\n  b: true,\n  c: "d",\n  e: f,\n  ...g\n}, "h"));\n'
  )
})

test('should integrate w/ generators (`recast`)', () => {
  assert.equal(
    recast.print(
      buildJsx(parse('<>\n  <a b c="d" e={f} {...g}>h</a>\n</>'), {
        pragma: 'h',
        pragmaFrag: 'f'
      })
    ).code,
    'h(f, null, h("a", {\n    b: true,\n    c: "d",\n    e: f,\n    ...g\n}, "h"));'
  )
})

test('should integrate w/ generators (`escodegen`)', () => {
  assert.equal(
    escodegen.generate(
      buildJsx(parse('<>\n  <a b c="d" e={f} {...g}>h</a>\n</>'), {
        pragma: 'h',
        pragmaFrag: 'f'
      })
    ),
    "h(f, null, h('a', {\n    b: true,\n    c: 'd',\n    e: f,\n    ...g\n}, 'h'));"
  )
})

test('should support positional info', () => {
  assert.deepEqual(
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
                      },
                      {
                        type: 'SpreadElement',
                        argument: {
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
                      }
                    ]
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
                loc: {
                  start: {line: 2, column: 2},
                  end: {line: 2, column: 31}
                },
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
    }
  )
})

test('should support no comments on `program`', () => {
  assert.deepEqual(buildJsx(parse('<><x /></>', true, false)), {
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
  })
})

test('should support the automatic runtime (fragment, jsx, settings)', () => {
  assert.deepEqual(
    generate(buildJsx(parse('<>a</>'), {runtime: 'automatic'})),
    [
      'import {Fragment as _Fragment, jsx as _jsx} from "react/jsx-runtime";',
      '_jsx(_Fragment, {',
      '  children: "a"',
      '});',
      ''
    ].join('\n')
  )
})

test('should support the automatic runtime (jsxs, key, comment)', () => {
  assert.deepEqual(
    generate(buildJsx(parse('/*@jsxRuntime automatic*/\n<a key="a">b{1}</a>'))),
    [
      'import {jsxs as _jsxs} from "react/jsx-runtime";',
      '_jsxs("a", {',
      '  children: ["b", 1]',
      '}, "a");',
      ''
    ].join('\n')
  )
})

test('should support the automatic runtime (props, spread, children)', () => {
  assert.deepEqual(
    generate(buildJsx(parse('<a b="1" {...c}>d</a>'), {runtime: 'automatic'})),
    [
      'import {jsx as _jsx} from "react/jsx-runtime";',
      '_jsx("a", {',
      '  b: "1",',
      '  ...c,',
      '  children: "d"',
      '});',
      ''
    ].join('\n')
  )
})

test('should support the automatic runtime (spread, props, children)', () => {
  assert.deepEqual(
    generate(
      buildJsx(parse('<a {...{b: 1, c: 2}} d="e">f</a>'), {
        runtime: 'automatic'
      })
    ),
    [
      'import {jsx as _jsx} from "react/jsx-runtime";',
      '_jsx("a", {',
      '  b: 1,',
      '  c: 2,',
      '  d: "e",',
      '  children: "f"',
      '});',
      ''
    ].join('\n')
  )
})

test('should support the automatic runtime (no props, children)', () => {
  assert.deepEqual(
    generate(buildJsx(parse('<a>b</a>'), {runtime: 'automatic'})),
    [
      'import {jsx as _jsx} from "react/jsx-runtime";',
      '_jsx("a", {',
      '  children: "b"',
      '});',
      ''
    ].join('\n')
  )
})

test('should support the automatic runtime (no props, no children)', () => {
  assert.deepEqual(
    generate(buildJsx(parse('<a/>'), {runtime: 'automatic'})),
    [
      'import {jsx as _jsx} from "react/jsx-runtime";',
      '_jsx("a", {});',
      ''
    ].join('\n')
  )
})

test('should support the automatic runtime (key, no props, no children)', () => {
  assert.deepEqual(
    generate(buildJsx(parse('<a key/>'), {runtime: 'automatic'})),
    [
      'import {jsx as _jsx} from "react/jsx-runtime";',
      '_jsx("a", {}, true);',
      ''
    ].join('\n')
  )
})

test('should support the automatic runtime (fragment, jsx, settings, development)', () => {
  assert.deepEqual(
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
      '}, undefined, false, {',
      '  fileName: "index.js",',
      '  lineNumber: 1,',
      '  columnNumber: 1',
      '}, this);',
      ''
    ].join('\n')
  )
})

test('should support the automatic runtime (jsxs, key, comment, development)', () => {
  assert.deepEqual(
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
      '}, this);',
      ''
    ].join('\n')
  )
})

test('should support the automatic runtime (props, spread, children, development)', () => {
  assert.deepEqual(
    generate(
      buildJsx(parse('<a b="1" {...c}>d</a>', false), {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })
    ),
    [
      'import {jsxDEV as _jsxDEV} from "react/jsx-dev-runtime";',
      '_jsxDEV("a", {',
      '  b: "1",',
      '  ...c,',
      '  children: "d"',
      '}, undefined, false, {',
      '  fileName: "index.js",',
      '  lineNumber: 1,',
      '  columnNumber: 1',
      '}, this);',
      ''
    ].join('\n')
  )
})

test('should support the automatic runtime (spread, props, children, development)', () => {
  assert.deepEqual(
    generate(
      buildJsx(parse('<a {...{b: 1, c: 2}} d="e">f</a>', false), {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })
    ),
    [
      'import {jsxDEV as _jsxDEV} from "react/jsx-dev-runtime";',
      '_jsxDEV("a", {',
      '  b: 1,',
      '  c: 2,',
      '  d: "e",',
      '  children: "f"',
      '}, undefined, false, {',
      '  fileName: "index.js",',
      '  lineNumber: 1,',
      '  columnNumber: 1',
      '}, this);',
      ''
    ].join('\n')
  )
})

test('should support the automatic runtime (no props, children, development)', () => {
  assert.deepEqual(
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
      '}, undefined, false, {',
      '  fileName: "index.js",',
      '  lineNumber: 1,',
      '  columnNumber: 1',
      '}, this);',
      ''
    ].join('\n')
  )
})

test('should support the automatic runtime (no props, no children, development)', () => {
  assert.deepEqual(
    generate(
      buildJsx(parse('<a/>', false), {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })
    ),
    [
      'import {jsxDEV as _jsxDEV} from "react/jsx-dev-runtime";',
      '_jsxDEV("a", {}, undefined, false, {',
      '  fileName: "index.js",',
      '  lineNumber: 1,',
      '  columnNumber: 1',
      '}, this);',
      ''
    ].join('\n')
  )
})

test('should support the automatic runtime (key, no props, no children, development)', () => {
  assert.deepEqual(
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
      '}, this);',
      ''
    ].join('\n')
  )
})

test('should support the automatic runtime (no props, no children, development, no filePath)', () => {
  assert.deepEqual(
    generate(
      buildJsx(parse('<a />', false), {
        runtime: 'automatic',
        development: true
      })
    ),
    [
      'import {jsxDEV as _jsxDEV} from "react/jsx-dev-runtime";',
      '_jsxDEV("a", {}, undefined, false, {',
      '  fileName: "<source.js>",',
      '  lineNumber: 1,',
      '  columnNumber: 1',
      '}, this);',
      ''
    ].join('\n')
  )
})

test('should support the automatic runtime (no props, no children, development, empty filePath)', () => {
  assert.deepEqual(
    generate(
      buildJsx(parse('<a />', false), {
        runtime: 'automatic',
        development: true,
        filePath: ''
      })
    ),
    [
      'import {jsxDEV as _jsxDEV} from "react/jsx-dev-runtime";',
      '_jsxDEV("a", {}, undefined, false, {',
      '  fileName: "<source.js>",',
      '  lineNumber: 1,',
      '  columnNumber: 1',
      '}, this);',
      ''
    ].join('\n')
  )
})

test('should support the automatic runtime (no props, no children, development, no locations)', () => {
  assert.deepEqual(
    generate(
      buildJsx(parse('<a />'), {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })
    ),
    [
      'import {jsxDEV as _jsxDEV} from "react/jsx-dev-runtime";',
      '_jsxDEV("a", {}, undefined, false, {',
      '  fileName: "index.js"',
      '}, this);',
      ''
    ].join('\n')
  )
})

test('should support the automatic runtime (no props, nested children, development, positional info)', () => {
  assert.deepEqual(
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
      '  children: _jsxDEV("b", {}, undefined, false, {',
      '    fileName: "index.js",',
      '    lineNumber: 2,',
      '    columnNumber: 3',
      '  }, this)',
      '}, undefined, false, {',
      '  fileName: "index.js",',
      '  lineNumber: 1,',
      '  columnNumber: 1',
      '}, this);',
      ''
    ].join('\n')
  )
})

test('should throw on spread after `key`', () => {
  assert.throws(() => {
    buildJsx(parse('<a {...b} key/>'), {runtime: 'automatic'})
  }, /Expected `key` to come before any spread expressions/)
})

test('should prefer a `jsxRuntime` comment over a `runtime` option', () => {
  assert.deepEqual(
    generate(
      buildJsx(parse('/*@jsxRuntime classic*/ <a/>'), {runtime: 'automatic'})
    ),
    'React.createElement("a");\n'
  )
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
  /** @type {Array<import('estree-jsx').Comment>} */
  const comments = []
  /** @type {import('estree-jsx').Program} */
  // @ts-expect-error
  const tree = parser.parse(doc, {
    ecmaVersion: 2020,
    ranges: true,
    locations: true,
    // @ts-expect-error
    onComment: comments
  })

  if (addComments !== false) tree.comments = comments

  if (clean !== false) walk(tree, {leave})

  return JSON.parse(JSON.stringify(tree))

  /**
   * @param {import('estree-jsx').Node} n
   */
  function leave(n) {
    delete n.loc
    delete n.range
    // @ts-expect-error
    delete n.start
    // @ts-expect-error
    delete n.end
    // @ts-expect-error
    delete n.raw
  }
}
