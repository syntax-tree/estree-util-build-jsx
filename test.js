/**
 * @typedef {import('estree-jsx').Comment} Comment
 * @typedef {import('estree-jsx').Expression} Expression
 * @typedef {import('estree-jsx').Program} Program
 * @typedef {import('estree-jsx').Node} Node
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import {Parser} from 'acorn'
import jsx from 'acorn-jsx'
import {generate} from 'astring'
import {buildJsx} from 'estree-util-build-jsx'
import {walk} from 'estree-walker'

const parser = Parser.extend(jsx())

test('estree-util-build-jsx', async function (t) {
  await t.test('should expose the public api', async function () {
    assert.deepEqual(
      Object.keys(await import('estree-util-build-jsx')).sort(),
      ['buildJsx']
    )
  })

  await t.test(
    'should default to `React.createElement` / `React.Fragment`',
    function () {
      const tree = parse('<><x /></>')
      buildJsx(tree)

      assert.deepEqual(expression(tree), {
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
    }
  )

  await t.test('should support `pragma`, `pragmaFrag`', function () {
    const tree = parse('<><x /></>')
    buildJsx(tree, {pragma: 'a', pragmaFrag: 'b'})

    assert.deepEqual(expression(tree), {
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
    })
  })

  await t.test('should support `pragma` w/ non-identifiers (1)', function () {
    const tree = parse('<x />')
    buildJsx(tree, {pragma: 'a.b-c'})

    assert.deepEqual(expression(tree), {
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

    assert.equal(generate(tree), 'a["b-c"]("x");\n')
  })

  await t.test('should support `@jsx`, `@jsxFrag` comments', function () {
    const tree = parse('/* @jsx a @jsxFrag b */\n<><x /></>')
    buildJsx(tree)

    assert.deepEqual(expression(tree), {
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
    })
  })

  await t.test(
    'should throw when `@jsx` is set in the automatic runtime',
    function () {
      assert.throws(function () {
        buildJsx(parse('/* @jsx a @jsxRuntime automatic */'))
      }, /Unexpected `@jsx` pragma w\/ automatic runtime/)
    }
  )

  await t.test(
    'should throw when `@jsxFrag` is set in the automatic runtime',
    function () {
      assert.throws(function () {
        buildJsx(parse('/* @jsxFrag a @jsxRuntime automatic */'))
      }, /Unexpected `@jsxFrag` pragma w\/ automatic runtime/)
    }
  )

  await t.test(
    'should throw when `@jsxImportSource` is set in the classic runtime',
    function () {
      assert.throws(function () {
        buildJsx(parse('/* @jsxImportSource a @jsxRuntime classic */'))
      }, /Unexpected `@jsxImportSource` w\/ classic runtime/)
    }
  )

  await t.test(
    'should throw on a non-automatic nor classic `@jsxRuntime`',
    function () {
      assert.throws(function () {
        buildJsx(parse('/* @jsxRuntime a */'))
      }, /Unexpected `jsxRuntime` `a`, expected `automatic` or `classic`/)
    }
  )

  await t.test('should ignore other comments', function () {
    const tree = parse('// a\n<><x /></>')
    buildJsx(tree)

    assert.deepEqual(expression(tree), {
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

  await t.test('should support a self-closing element', function () {
    const tree = parse('<a />')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [{type: 'Literal', value: 'a'}],
      optional: false
    })
  })

  await t.test('should support a closed element', function () {
    const tree = parse('<a>b</a>')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
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

  await t.test(
    'should support dots in a tag name for member expressions',
    function () {
      const tree = parse('<a.b />')
      buildJsx(tree, {pragma: 'h'})

      assert.deepEqual(expression(tree), {
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
    }
  )

  await t.test(
    'should support dots *and* dashes in tag names (1)',
    function () {
      const tree = parse('<a.b-c />')
      buildJsx(tree, {pragma: 'h'})

      assert.deepEqual(expression(tree), {
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

      assert.equal(generate(tree), 'h(a["b-c"]);\n')
    }
  )

  await t.test(
    'should support dots *and* dashes in tag names (2)',
    function () {
      const tree = parse('<a-b.c />')
      buildJsx(tree, {pragma: 'h'})

      assert.deepEqual(expression(tree), {
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

      assert.equal(generate(tree), 'h(("a-b").c);\n')
    }
  )
  await t.test(
    'should support dots in a tag name for member expressions (2)',
    function () {
      const tree = parse('<a.b.c.d />')
      buildJsx(tree, {pragma: 'h'})

      assert.deepEqual(expression(tree), {
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
    }
  )

  await t.test(
    'should support colons in a tag name for namespaces',
    function () {
      const tree = parse('<a:b />')
      buildJsx(tree, {pragma: 'h'})

      assert.deepEqual(expression(tree), {
        type: 'CallExpression',
        callee: {type: 'Identifier', name: 'h'},
        arguments: [{type: 'Literal', value: 'a:b'}],
        optional: false
      })
    }
  )

  await t.test('should support dashes in tag names', function () {
    const tree = parse('<a-b />')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [{type: 'Literal', value: 'a-b'}],
      optional: false
    })
  })

  await t.test('should non-lowercase for components in tag names', function () {
    const tree = parse('<A />')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [{type: 'Identifier', name: 'A'}],
      optional: false
    })
  })

  await t.test('should support a boolean prop', function () {
    const tree = parse('<a b />')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
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

  await t.test('should support colons in prop names', function () {
    const tree = parse('<a b:c />')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
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

  await t.test(
    'should support a prop name that can’t be an identifier',
    function () {
      const tree = parse('<a b-c />')
      buildJsx(tree, {pragma: 'h'})

      assert.deepEqual(expression(tree), {
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
    }
  )

  await t.test('should support a prop value', function () {
    const tree = parse('<a b="c" />')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
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

  await t.test('should support an expression as a prop value', function () {
    const tree = parse('<a b={c} />')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
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

  await t.test('should support an expression as a prop value (2)', function () {
    const tree = parse('<a b={1} />')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
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

  await t.test('should support a fragment as a prop value', function () {
    const tree = parse('<a b=<>c</> />')
    buildJsx(tree, {pragma: 'h', pragmaFrag: 'f'})

    assert.deepEqual(expression(tree), {
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
    })
  })

  await t.test('should support an element as a prop value', function () {
    const tree = parse('<a b=<c /> />')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
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
    })
  })

  await t.test('should support a single spread prop', function () {
    const tree = parse('<a {...b} />')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
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

  await t.test('should support a spread prop and another prop', function () {
    const tree = parse('<a {...b} c />')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
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
    })
  })

  await t.test('should support a prop and a spread prop', function () {
    const tree = parse('<a b {...c} />')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
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
    })
  })

  await t.test('should support two spread props', function () {
    const tree = parse('<a {...b} {...c} />')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
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
    })
  })

  await t.test('should support more complex spreads', function () {
    const tree = parse('<a {...{b:1,...c,d:2}} />')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
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
    })
  })

  await t.test('should support expressions content', function () {
    const tree = parse('<a>{1}</a>')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
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

  await t.test('should support empty expressions content', function () {
    const tree = parse('<a>{}</a>')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [{type: 'Literal', value: 'a'}],
      optional: false
    })
  })

  await t.test('should support initial spaces in content', function () {
    const tree = parse('<a>  b</a>')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
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

  await t.test('should support final spaces in content', function () {
    const tree = parse('<a>b  </a>')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
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

  await t.test(
    'should support initial and final spaces in content',
    function () {
      const tree = parse('<a>  b  </a>')
      buildJsx(tree, {pragma: 'h'})

      assert.deepEqual(expression(tree), {
        type: 'CallExpression',
        callee: {type: 'Identifier', name: 'h'},
        arguments: [
          {type: 'Literal', value: 'a'},
          {type: 'Literal', value: null},
          {type: 'Literal', value: '  b  '}
        ],
        optional: false
      })
    }
  )

  await t.test('should support spaces around line endings', function () {
    const tree = parse('<a> b \r c \n d \n </a>')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Literal', value: null},
        {type: 'Literal', value: ' b c d'}
      ],
      optional: false
    })
  })

  await t.test(
    'should support skip empty or whitespace only line endings',
    function () {
      const tree = parse('<a> b \r \n c \n\n d \n </a>')
      buildJsx(tree, {pragma: 'h'})

      assert.deepEqual(expression(tree), {
        type: 'CallExpression',
        callee: {type: 'Identifier', name: 'h'},
        arguments: [
          {type: 'Literal', value: 'a'},
          {type: 'Literal', value: null},
          {type: 'Literal', value: ' b c d'}
        ],
        optional: false
      })
    }
  )

  await t.test('should support skip whitespace only content', function () {
    const tree = parse('<a> \t\n </a>')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [{type: 'Literal', value: 'a'}],
      optional: false
    })
  })

  await t.test('should trim strings with leading line feed', function () {
    const tree = parse('<a>\n  line1\n</a>')
    buildJsx(tree, {pragma: 'h'})

    assert.deepEqual(expression(tree), {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Literal', value: null},
        {type: 'Literal', value: 'line1'}
      ],
      optional: false
    })
  })

  await t.test(
    'should trim strings with leading line feed (multiline test)',
    function () {
      const tree = parse('<a>\n  line1{" "}\n  line2\n</a>')
      buildJsx(tree, {pragma: 'h'})

      assert.deepEqual(expression(tree), {
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
      })
    }
  )

  await t.test('should integrate w/ generators (`astring`)', function () {
    const tree = parse('<>\n  <a b c="d" e={f} {...g}>h</a>\n</>')
    buildJsx(tree, {pragma: 'h', pragmaFrag: 'f'})

    assert.deepEqual(
      generate(tree),
      'h(f, null, h("a", {\n  b: true,\n  c: "d",\n  e: f,\n  ...g\n}, "h"));\n'
    )
  })

  await t.test('should support positional info', function () {
    const tree = parse('<>\n  <a b c="d" e={f} {...g}>h</a>\n</>', false)
    buildJsx(tree)

    assert.deepEqual(tree, {
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
    })
  })

  await t.test('should support no comments on `program`', function () {
    const tree = parse('<><x /></>', true, false)
    buildJsx(tree)

    assert.deepEqual(tree, {
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

  await t.test(
    'should support the automatic runtime (fragment, jsx, settings)',
    function () {
      const tree = parse('<>a</>')
      buildJsx(tree, {runtime: 'automatic'})

      assert.equal(
        generate(tree),
        [
          'import {Fragment as _Fragment, jsx as _jsx} from "react/jsx-runtime";',
          '_jsx(_Fragment, {',
          '  children: "a"',
          '});',
          ''
        ].join('\n')
      )
    }
  )

  await t.test(
    'should support the automatic runtime (jsxs, key, comment)',
    function () {
      const tree = parse('/*@jsxRuntime automatic*/\n<a key="a">b{1}</a>')
      buildJsx(tree)

      assert.equal(
        generate(tree),
        [
          'import {jsxs as _jsxs} from "react/jsx-runtime";',
          '_jsxs("a", {',
          '  children: ["b", 1]',
          '}, "a");',
          ''
        ].join('\n')
      )
    }
  )

  await t.test(
    'should support the automatic runtime (props, spread, children)',
    function () {
      const tree = parse('<a b="1" {...c}>d</a>')
      buildJsx(tree, {runtime: 'automatic'})

      assert.equal(
        generate(tree),
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
    }
  )

  await t.test(
    'should support the automatic runtime (spread, props, children)',
    function () {
      const tree = parse('<a {...{b: 1, c: 2}} d="e">f</a>')
      buildJsx(tree, {runtime: 'automatic'})

      assert.equal(
        generate(tree),
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
    }
  )

  await t.test(
    'should support the automatic runtime (no props, children)',
    function () {
      const tree = parse('<a>b</a>')
      buildJsx(tree, {runtime: 'automatic'})

      assert.equal(
        generate(tree),
        [
          'import {jsx as _jsx} from "react/jsx-runtime";',
          '_jsx("a", {',
          '  children: "b"',
          '});',
          ''
        ].join('\n')
      )
    }
  )

  await t.test(
    'should support the automatic runtime (no props, no children)',
    function () {
      const tree = parse('<a/>')
      buildJsx(tree, {runtime: 'automatic'})

      assert.equal(
        generate(tree),
        [
          'import {jsx as _jsx} from "react/jsx-runtime";',
          '_jsx("a", {});',
          ''
        ].join('\n')
      )
    }
  )

  await t.test(
    'should support the automatic runtime (key, no props, no children)',
    function () {
      const tree = parse('<a key/>')
      buildJsx(tree, {runtime: 'automatic'})

      assert.equal(
        generate(tree),
        [
          'import {jsx as _jsx} from "react/jsx-runtime";',
          '_jsx("a", {}, true);',
          ''
        ].join('\n')
      )
    }
  )

  await t.test(
    'should support the automatic runtime (fragment, jsx, settings, development)',
    function () {
      const tree = parse('<>a</>', false)
      buildJsx(tree, {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })

      assert.equal(
        generate(tree),
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
    }
  )

  await t.test(
    'should support the automatic runtime (jsxs, key, comment, development)',
    function () {
      const tree = parse('<a key="a">b{1}</a>', false)
      buildJsx(tree, {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })

      assert.equal(
        generate(tree),
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
    }
  )

  await t.test(
    'should support the automatic runtime (props, spread, children, development)',
    function () {
      const tree = parse('<a b="1" {...c}>d</a>', false)

      buildJsx(tree, {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })

      assert.equal(
        generate(tree),
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
    }
  )

  await t.test(
    'should support the automatic runtime (spread, props, children, development)',
    function () {
      const tree = parse('<a {...{b: 1, c: 2}} d="e">f</a>', false)

      buildJsx(tree, {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })

      assert.equal(
        generate(tree),
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
    }
  )

  await t.test(
    'should support the automatic runtime (no props, children, development)',
    function () {
      const tree = parse('<a>b</a>', false)

      buildJsx(tree, {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })

      assert.equal(
        generate(tree),
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
    }
  )

  await t.test(
    'should support the automatic runtime (no props, no children, development)',
    function () {
      const tree = parse('<a/>', false)

      buildJsx(tree, {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })

      assert.equal(
        generate(tree),
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
    }
  )

  await t.test(
    'should support the automatic runtime (key, no props, no children, development)',
    function () {
      const tree = parse('<a key/>', false)

      buildJsx(tree, {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })

      assert.equal(
        generate(tree),
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
    }
  )

  await t.test(
    'should support the automatic runtime (no props, no children, development, no filePath)',
    function () {
      const tree = parse('<a />', false)

      buildJsx(tree, {
        runtime: 'automatic',
        development: true
      })

      assert.equal(
        generate(tree),
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
    }
  )

  await t.test(
    'should support the automatic runtime (no props, no children, development, empty filePath)',
    function () {
      const tree = parse('<a />', false)

      buildJsx(tree, {
        runtime: 'automatic',
        development: true,
        filePath: ''
      })

      assert.equal(
        generate(tree),
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
    }
  )

  await t.test(
    'should support the automatic runtime (no props, no children, development, no locations)',
    function () {
      const tree = parse('<a />')

      buildJsx(tree, {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })

      assert.equal(
        generate(tree),
        [
          'import {jsxDEV as _jsxDEV} from "react/jsx-dev-runtime";',
          '_jsxDEV("a", {}, undefined, false, {',
          '  fileName: "index.js"',
          '}, this);',
          ''
        ].join('\n')
      )
    }
  )

  await t.test(
    'should support the automatic runtime (no props, nested children, development, positional info)',
    function () {
      const tree = parse('<a>\n  <b />\n</a>', false)

      buildJsx(tree, {
        runtime: 'automatic',
        development: true,
        filePath: 'index.js'
      })

      assert.equal(
        generate(tree),
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
    }
  )

  await t.test('should throw on spread after `key`', function () {
    assert.throws(function () {
      buildJsx(parse('<a {...b} key/>'), {runtime: 'automatic'})
    }, /Expected `key` to come before any spread expressions/)
  })

  await t.test(
    'should prefer a `jsxRuntime` comment over a `runtime` option',
    function () {
      const tree = parse('/*@jsxRuntime classic*/ <a/>')

      buildJsx(tree, {runtime: 'automatic'})

      assert.equal(generate(tree), 'React.createElement("a");\n')
    }
  )

  await t.test('should keep directives first', function () {
    const tree = parse('"use client"\nconst x = <a/>')

    buildJsx(tree, {runtime: 'automatic'})

    assert.equal(
      generate(tree),
      '"use client";\nimport {jsx as _jsx} from "react/jsx-runtime";\nconst x = _jsx("a", {});\n'
    )
  })
})

/**
 * @param {Program} program
 * @returns {Expression}
 */
function expression(program) {
  const head = program.body[0]

  if (!head || head.type !== 'ExpressionStatement') {
    throw new Error('Expected single expression')
  }

  return head.expression
}

/**
 * Parse a string of JS.
 *
 * @param {string} document
 *   Value.
 * @param {boolean} [clean=true]
 *   Clean positional info (default: `true`).
 * @param {boolean} [addComments=true]
 *   Add comments (default: `true`).
 * @returns {Program}
 *   ESTree program.
 */
function parse(document, clean, addComments) {
  /** @type {Array<Comment>} */
  const comments = []
  const tree = /** @type {Program} */ (
    parser.parse(document, {
      ecmaVersion: 'latest',
      ranges: true,
      locations: true,
      // @ts-expect-error: acorn is similar enough to estree.
      onComment: comments
    })
  )

  if (addComments !== false) tree.comments = comments

  if (clean !== false) walk(tree, {leave})

  // eslint-disable-next-line unicorn/prefer-structured-clone -- JSON casting needed to remove class stuff.
  return JSON.parse(JSON.stringify(tree))
}

/**
 * Clean a node.
 *
 * @param {Node} n
 *   ESTree node.
 */
function leave(n) {
  delete n.loc
  delete n.range
  // @ts-expect-error: exists on acorn nodes.
  delete n.start
  // @ts-expect-error: exists on acorn nodes.
  delete n.end
  // @ts-expect-error: exists on acorn nodes.
  delete n.raw
}
