'use strict'

var test = require('tape')
var acorn = require('acorn')
var jsx = require('acorn-jsx')
var walker = require('estree-walker')
var astring = require('astring')
var recast = require('recast')
var escodegen = require('escodegen')
var build = require('.')

var parser = acorn.Parser.extend(jsx())

test('estree-util-build-jsx', function (t) {
  t.deepEqual(
    build(parse('<><x /></>')).body[0].expression,
    {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: {type: 'Identifier', name: 'React'},
        property: {type: 'Identifier', name: 'createElement'}
      },
      arguments: [
        {
          type: 'MemberExpression',
          object: {type: 'Identifier', name: 'React'},
          property: {type: 'Identifier', name: 'Fragment'}
        },
        {type: 'Literal', value: null},
        {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: {type: 'Identifier', name: 'React'},
            property: {type: 'Identifier', name: 'createElement'}
          },
          arguments: [{type: 'Literal', value: 'x'}]
        }
      ]
    },
    'should default to `React.createElement` / `React.Fragment`'
  )

  t.deepEqual(
    build(parse('<><x /></>'), {pragma: 'a', pragmaFrag: 'b'}).body[0]
      .expression,
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'a'},
      arguments: [
        {type: 'Identifier', name: 'b'},
        {type: 'Literal', value: null},
        {
          type: 'CallExpression',
          callee: {type: 'Identifier', name: 'a'},
          arguments: [{type: 'Literal', value: 'x'}]
        }
      ]
    },
    'should support `pragma`, `pragmaFrag`'
  )

  t.deepEqual(
    build(parse('/* @jsx a @jsxFrag b */\n<><x /></>')).body[0].expression,
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'a'},
      arguments: [
        {type: 'Identifier', name: 'b'},
        {type: 'Literal', value: null},
        {
          type: 'CallExpression',
          callee: {type: 'Identifier', name: 'a'},
          arguments: [{type: 'Literal', value: 'x'}]
        }
      ]
    },
    'should support `@jsx`, `@jsxFrag` comments'
  )

  t.throws(
    function () {
      build(parse('/* @jsx a @jsxRuntime automatic */'))
    },
    /Unexpected `@jsx` pragma w\/ automatic runtime/,
    'should throw when `@jsx` is set in the automatic runtime'
  )

  t.throws(
    function () {
      build(parse('/* @jsxFrag a @jsxRuntime automatic */'))
    },
    /Unexpected `@jsxFrag` pragma w\/ automatic runtime/,
    'should throw when `@jsxFrag` is set in the automatic runtime'
  )

  t.throws(
    function () {
      build(parse('/* @jsxImportSource a @jsxRuntime classic */'))
    },
    /Unexpected `@jsxImportSource` w\/ classic runtime/,
    'should throw when `@jsxImportSource` is set in the classic runtime'
  )

  t.throws(
    function () {
      build(parse('/* @jsxRuntime a */'))
    },
    /Unexpected `jsxRuntime` `a`, expected `automatic` or `classic`/,
    'should throw on a non-automatic nor classic `@jsxRuntime`'
  )

  t.deepEqual(
    build(parse('// a\n<><x /></>')).body[0].expression,
    {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: {type: 'Identifier', name: 'React'},
        property: {type: 'Identifier', name: 'createElement'}
      },
      arguments: [
        {
          type: 'MemberExpression',
          object: {type: 'Identifier', name: 'React'},
          property: {type: 'Identifier', name: 'Fragment'}
        },
        {type: 'Literal', value: null},
        {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: {type: 'Identifier', name: 'React'},
            property: {type: 'Identifier', name: 'createElement'}
          },
          arguments: [{type: 'Literal', value: 'x'}]
        }
      ]
    },
    'should ignore other comments'
  )

  t.deepEqual(
    build(parse('<a />'), {pragma: 'h'}).body[0].expression,
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [{type: 'Literal', value: 'a'}]
    },
    'should support a self-closing element'
  )

  t.deepEqual(
    build(parse('<a>b</a>'), {pragma: 'h'}).body[0].expression,
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Literal', value: null},
        {type: 'Literal', value: 'b'}
      ]
    },
    'should support a closed element'
  )

  t.deepEqual(
    build(parse('<a.b />'), {pragma: 'h'}).body[0].expression,
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {
          type: 'MemberExpression',
          object: {type: 'Identifier', name: 'a'},
          property: {type: 'Identifier', name: 'b'}
        }
      ]
    },
    'should support dots in a tag name for member expressions'
  )

  t.deepEqual(
    build(parse('<a.b.c.d />'), {pragma: 'h'}).body[0].expression,
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
              property: {type: 'Identifier', name: 'b'}
            },
            property: {type: 'Identifier', name: 'c'}
          },
          property: {type: 'Identifier', name: 'd'}
        }
      ]
    },
    'should support dots in a tag name for member expressions (2)'
  )

  t.deepEqual(
    build(parse('<a:b />'), {pragma: 'h'}).body[0].expression,
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [{type: 'Literal', value: 'a:b'}]
    },
    'should support colons in a tag name for namespaces'
  )

  t.deepEqual(
    build(parse('<a-b />'), {pragma: 'h'}).body[0].expression,
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [{type: 'Literal', value: 'a-b'}]
    },
    'should support dashes in tag names'
  )

  t.deepEqual(
    build(parse('<A />'), {pragma: 'h'}).body[0].expression,
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [{type: 'Identifier', name: 'A'}]
    },
    'should non-lowercase for components in tag names'
  )

  t.deepEqual(
    build(parse('<a b />'), {pragma: 'h'}).body[0].expression,
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
              kind: 'init'
            }
          ]
        }
      ]
    },
    'should support a boolean prop'
  )

  t.deepEqual(
    build(parse('<a b:c />'), {pragma: 'h'}).body[0].expression,
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
              kind: 'init'
            }
          ]
        }
      ]
    },
    'should support colons in prop names'
  )

  t.deepEqual(
    build(parse('<a b-c />'), {pragma: 'h'}).body[0].expression,
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
              kind: 'init'
            }
          ]
        }
      ]
    },
    'should support a prop name that can’t be an identifier'
  )

  t.deepEqual(
    build(parse('<a b="c" />'), {pragma: 'h'}).body[0].expression,
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
              kind: 'init'
            }
          ]
        }
      ]
    },
    'should support a prop value'
  )

  t.deepEqual(
    build(parse('<a b={c} />'), {pragma: 'h'}).body[0].expression,
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
              kind: 'init'
            }
          ]
        }
      ]
    },
    'should support an expression as a prop value'
  )

  t.deepEqual(
    build(parse('<a b={1} />'), {pragma: 'h'}).body[0].expression,
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
              kind: 'init'
            }
          ]
        }
      ]
    },
    'should support an expression as a prop value (2)'
  )

  t.deepEqual(
    build(parse('<a b=<>c</> />'), {pragma: 'h', pragmaFrag: 'f'}).body[0]
      .expression,
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
                ]
              },
              kind: 'init'
            }
          ]
        }
      ]
    },
    'should support a fragment as a prop value'
  )

  t.deepEqual(
    build(parse('<a b=<c /> />'), {pragma: 'h'}).body[0].expression,
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
                arguments: [{type: 'Literal', value: 'c'}]
              },
              kind: 'init'
            }
          ]
        }
      ]
    },
    'should support an element as a prop value'
  )

  t.deepEqual(
    build(parse('<a {...b} />'), {pragma: 'h'}).body[0].expression,
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Identifier', name: 'b'}
      ]
    },
    'should support a single spread prop'
  )

  t.deepEqual(
    build(parse('<a {...b} c />'), {pragma: 'h'}).body[0].expression,
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
            property: {type: 'Identifier', name: 'assign'}
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
                  kind: 'init'
                }
              ]
            }
          ]
        }
      ]
    },
    'should support a spread prop and another prop'
  )

  t.deepEqual(
    build(parse('<a b {...c} />'), {pragma: 'h'}).body[0].expression,
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
            property: {type: 'Identifier', name: 'assign'}
          },
          arguments: [
            {
              type: 'ObjectExpression',
              properties: [
                {
                  type: 'Property',
                  key: {type: 'Identifier', name: 'b'},
                  value: {type: 'Literal', value: true},
                  kind: 'init'
                }
              ]
            },
            {type: 'Identifier', name: 'c'}
          ]
        }
      ]
    },
    'should support a prop and a spread prop'
  )

  t.deepEqual(
    build(parse('<a {...b} {...c} />'), {pragma: 'h'}).body[0].expression,
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
            property: {type: 'Identifier', name: 'assign'}
          },
          arguments: [
            {type: 'ObjectExpression', properties: []},
            {type: 'Identifier', name: 'b'},
            {type: 'Identifier', name: 'c'}
          ]
        }
      ]
    },
    'should support two spread props'
  )

  t.deepEqual(
    build(parse('<a {...{b:1,...c,d:2}} />'), {pragma: 'h'}).body[0].expression,
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
      ]
    },
    'should support more complex spreads'
  )

  t.deepEqual(
    build(parse('<a>{1}</a>'), {pragma: 'h'}).body[0].expression,
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Literal', value: null},
        {type: 'Literal', value: 1}
      ]
    },
    'should support expressions content'
  )

  t.deepEqual(
    build(parse('<a>{}</a>'), {pragma: 'h'}).body[0].expression,
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [{type: 'Literal', value: 'a'}]
    },
    'should support empty expressions content'
  )

  t.deepEqual(
    build(parse('<a>  b</a>'), {pragma: 'h'}).body[0].expression,
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Literal', value: null},
        {type: 'Literal', value: '  b'}
      ]
    },
    'should support initial spaces in content'
  )

  t.deepEqual(
    build(parse('<a>b  </a>'), {pragma: 'h'}).body[0].expression,
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Literal', value: null},
        {type: 'Literal', value: 'b  '}
      ]
    },
    'should support final spaces in content'
  )

  t.deepEqual(
    build(parse('<a>  b  </a>'), {pragma: 'h'}).body[0].expression,
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Literal', value: null},
        {type: 'Literal', value: '  b  '}
      ]
    },
    'should support initial and final spaces in content'
  )

  t.deepEqual(
    build(parse('<a> b \r c \n d \n </a>'), {pragma: 'h'}).body[0].expression,
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Literal', value: null},
        {type: 'Literal', value: ' b c d'}
      ]
    },
    'should support spaces around line endings'
  )

  t.deepEqual(
    build(parse('<a> b \r \n c \n\n d \n </a>'), {pragma: 'h'}).body[0]
      .expression,
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [
        {type: 'Literal', value: 'a'},
        {type: 'Literal', value: null},
        {type: 'Literal', value: ' b c d'}
      ]
    },
    'should support skip empty or whitespace only line endings'
  )

  t.deepEqual(
    build(parse('<a> \t\n </a>'), {pragma: 'h'}).body[0].expression,
    {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: 'h'},
      arguments: [{type: 'Literal', value: 'a'}]
    },
    'should support skip whitespace only content'
  )

  t.equal(
    astring.generate(
      build(parse('<>\n  <a b c="d" e={f} {...g}>h</a>\n</>'), {
        pragma: 'h',
        pragmaFrag: 'f'
      })
    ),
    'h(f, null, h("a", Object.assign({\n  b: true,\n  c: "d",\n  e: f\n}, g), "h"));\n',
    'should integrate w/ generators (`astring`)'
  )

  t.equal(
    recast.print(
      build(parse('<>\n  <a b c="d" e={f} {...g}>h</a>\n</>'), {
        pragma: 'h',
        pragmaFrag: 'f'
      })
    ).code,
    'h(f, null, h("a", Object.assign({\n    b: true,\n    c: "d",\n    e: f\n}, g), "h"));',
    'should integrate w/ generators (`recast`)'
  )

  t.equal(
    escodegen.generate(
      build(parse('<>\n  <a b c="d" e={f} {...g}>h</a>\n</>'), {
        pragma: 'h',
        pragmaFrag: 'f'
      })
    ),
    "h(f, null, h('a', Object.assign({\n    b: true,\n    c: 'd',\n    e: f\n}, g), 'h'));",
    'should integrate w/ generators (`escodegen`)'
  )

  t.deepEqual(
    build(parse('<>\n  <a b c="d" e={f} {...g}>h</a>\n</>', false)),
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
              property: {type: 'Identifier', name: 'createElement'}
            },
            arguments: [
              {
                type: 'MemberExpression',
                object: {type: 'Identifier', name: 'React'},
                property: {type: 'Identifier', name: 'Fragment'}
              },
              {type: 'Literal', value: null},
              {
                type: 'CallExpression',
                callee: {
                  type: 'MemberExpression',
                  object: {type: 'Identifier', name: 'React'},
                  property: {type: 'Identifier', name: 'createElement'}
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
                      property: {type: 'Identifier', name: 'assign'}
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
                start: 5,
                end: 34,
                loc: {start: {line: 2, column: 2}, end: {line: 2, column: 31}},
                range: [5, 34]
              }
            ],
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
    build(parse('<><x /></>', true, false)),
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
              property: {type: 'Identifier', name: 'createElement'}
            },
            arguments: [
              {
                type: 'MemberExpression',
                object: {type: 'Identifier', name: 'React'},
                property: {type: 'Identifier', name: 'Fragment'}
              },
              {type: 'Literal', value: null},
              {
                type: 'CallExpression',
                callee: {
                  type: 'MemberExpression',
                  object: {type: 'Identifier', name: 'React'},
                  property: {type: 'Identifier', name: 'createElement'}
                },
                arguments: [{type: 'Literal', value: 'x'}]
              }
            ]
          }
        }
      ],
      sourceType: 'script'
    },
    'should support no comments on `program`'
  )

  t.deepEqual(
    astring.generate(build(parse('<>a</>'), {runtime: 'automatic'})),
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
    astring.generate(
      build(parse('/*@jsxRuntime automatic*/\n<a key="a">b{1}</a>'))
    ),
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
    astring.generate(
      build(parse('<a b="1" {...c}>d</a>'), {runtime: 'automatic'})
    ),
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
    astring.generate(
      build(parse('<a {...{b: 1, c: 2}} d="e">f</a>'), {runtime: 'automatic'})
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
    astring.generate(build(parse('<a>b</a>'), {runtime: 'automatic'})),
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
    astring.generate(build(parse('<a/>'), {runtime: 'automatic'})),
    [
      'import {jsx as _jsx} from "react/jsx-runtime";',
      '_jsx("a", {});',
      ''
    ].join('\n'),
    'should support the automatic runtime (no props, no children)'
  )

  t.deepEqual(
    astring.generate(build(parse('<a key/>'), {runtime: 'automatic'})),
    [
      'import {jsx as _jsx} from "react/jsx-runtime";',
      '_jsx("a", {}, true);',
      ''
    ].join('\n'),
    'should support the automatic runtime (key, no props, no children)'
  )

  t.throws(
    function () {
      build(parse('<a {...b} key/>'), {runtime: 'automatic'})
    },
    /Expected `key` to come before any spread expressions/,
    'should throw on spread after `key`'
  )

  t.deepEqual(
    astring.generate(
      build(parse('/*@jsxRuntime classic*/ <a/>'), {runtime: 'automatic'})
    ),
    'React.createElement("a");\n',
    'should prefer a `jsxRuntime` comment over a `runtime` option'
  )

  t.end()
})

function parse(doc, clean, addComments) {
  var comments = []
  var tree = parser.parse(doc, {
    ranges: true,
    locations: true,
    onComment: comments
  })

  if (addComments !== false) tree.comments = comments

  if (clean !== false) walker.walk(tree, {leave: leave})

  return JSON.parse(JSON.stringify(tree))

  function leave(n) {
    delete n.loc
    delete n.range
    delete n.start
    delete n.end
    delete n.raw
  }
}
