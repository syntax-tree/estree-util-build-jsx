'use strict'

module.exports = buildJsx

var walk = require('estree-walker').walk
var isIdentifierName = require('estree-util-is-identifier-name').name

var regex = /@(jsx|jsxFrag|jsxImportSource|jsxRuntime)\s+(\S+)/g

function buildJsx(tree, options) {
  var settings = options || {}
  var automatic = settings.runtime === 'automatic'
  var annotations = {}
  var imports = {}

  walk(tree, {enter: enter, leave: leave})

  return tree

  // When entering the program, check all comments, and prefer comments over
  // config.
  function enter(node) {
    var comments
    var index
    var match

    if (node.type === 'Program') {
      comments = node.comments || []
      index = -1

      while (++index < comments.length) {
        regex.lastIndex = 0

        while ((match = regex.exec(comments[index].value))) {
          annotations[match[1]] = match[2]
        }
      }

      if (annotations.jsxRuntime) {
        if (annotations.jsxRuntime === 'automatic') {
          automatic = true

          if (annotations.jsx) {
            throw new Error('Unexpected `@jsx` pragma w/ automatic runtime')
          }

          if (annotations.jsxFrag) {
            throw new Error('Unexpected `@jsxFrag` pragma w/ automatic runtime')
          }
        } else if (annotations.jsxRuntime === 'classic') {
          automatic = false

          if (annotations.jsxImportSource) {
            throw new Error('Unexpected `@jsxImportSource` w/ classic runtime')
          }
        } else {
          throw new Error(
            'Unexpected `jsxRuntime` `' +
              annotations.jsxRuntime +
              '`, expected `automatic` or `classic`'
          )
        }
      }
    }
  }

  // Transform JSX.
  // eslint-disable-next-line complexity
  function leave(node) {
    var parameters
    var children
    var fields
    var objects
    var index
    var child
    var name
    var props
    var attributes
    var spread
    var key
    var callee
    var specifiers
    var prop

    if (node.type === 'Program') {
      specifiers = []

      if (imports.fragment) {
        specifiers.push({
          type: 'ImportSpecifier',
          imported: {type: 'Identifier', name: 'Fragment'},
          local: {type: 'Identifier', name: '_Fragment'}
        })
      }

      if (imports.jsx) {
        specifiers.push({
          type: 'ImportSpecifier',
          imported: {type: 'Identifier', name: 'jsx'},
          local: {type: 'Identifier', name: '_jsx'}
        })
      }

      if (imports.jsxs) {
        specifiers.push({
          type: 'ImportSpecifier',
          imported: {type: 'Identifier', name: 'jsxs'},
          local: {type: 'Identifier', name: '_jsxs'}
        })
      }

      if (specifiers.length) {
        node.body.unshift({
          type: 'ImportDeclaration',
          specifiers: specifiers,
          source: {
            type: 'Literal',
            value:
              (annotations.jsxImportSource ||
                settings.importSource ||
                'react') + '/jsx-runtime'
          }
        })
      }
    }

    if (node.type !== 'JSXElement' && node.type !== 'JSXFragment') {
      return
    }

    parameters = []
    children = []
    objects = []
    fields = []
    index = -1

    // Figure out `children`.
    while (++index < node.children.length) {
      child = node.children[index]

      if (child.type === 'JSXExpressionContainer') {
        child = child.expression

        // Ignore empty expressions.
        if (child.type === 'JSXEmptyExpression') continue
      } else if (child.type === 'JSXText') {
        child = create(child, {
          type: 'Literal',
          value: child.value
            // Replace tabs w/ spaces.
            .replace(/\t/g, ' ')
            // Use line feeds, drop spaces around them.
            .replace(/ *(\r?\n|\r) */g, '\n')
            // Collapse multiple line feeds.
            .replace(/\n+/g, '\n')
            // Drop final line feeds.
            .replace(/\n+$/, '')
            // Replace line feeds with spaces.
            .replace(/\n/g, ' ')
        })

        // Ignore collapsible text.
        if (!child.value) continue
      }
      // Otherwise, this is an already compiled call.

      children.push(child)
    }

    // Do the stuff needed for elements.
    if (node.openingElement) {
      name = toIdentifier(node.openingElement.name)

      // If the name could be an identifier, but start with a lowercase letter,
      // it’s not a component.
      if (name.type === 'Identifier' && /^[a-z]/.test(name.name)) {
        name = create(name, {type: 'Literal', value: name.name})
      }

      attributes = node.openingElement.attributes
      index = -1

      // Place props in the right order, because we might have duplicates
      // in them and what’s spread in.
      while (++index < attributes.length) {
        if (attributes[index].type === 'JSXSpreadAttribute') {
          if (fields.length) {
            objects.push({type: 'ObjectExpression', properties: fields})
            fields = []
          }

          objects.push(attributes[index].argument)
          spread = true
        } else {
          prop = toProperty(attributes[index])

          if (automatic && prop.key.name === 'key') {
            if (spread) {
              throw new Error(
                'Expected `key` to come before any spread expressions'
              )
            }

            key = prop.value
          } else {
            fields.push(prop)
          }
        }
      }
    }
    // …and fragments.
    else if (automatic) {
      imports.fragment = true
      name = {type: 'Identifier', name: '_Fragment'}
    } else {
      name = toMemberExpression(
        annotations.jsxFrag || settings.pragmaFrag || 'React.Fragment'
      )
    }

    if (automatic && children.length) {
      fields.push({
        type: 'Property',
        key: {type: 'Identifier', name: 'children'},
        value:
          children.length > 1
            ? {type: 'ArrayExpression', elements: children}
            : children[0],
        kind: 'init'
      })
    } else {
      parameters = children
    }

    if (fields.length) {
      objects.push({type: 'ObjectExpression', properties: fields})
    }

    if (objects.length > 1) {
      // Don’t mutate the first object, shallow clone instead.
      if (objects[0].type !== 'ObjectExpression') {
        objects.unshift({type: 'ObjectExpression', properties: []})
      }

      props = {
        type: 'CallExpression',
        callee: toMemberExpression('Object.assign'),
        arguments: objects
      }
    } else if (objects.length) {
      props = objects[0]
    }

    if (automatic) {
      if (children.length > 1) {
        imports.jsxs = true
        callee = {type: 'Identifier', name: '_jsxs'}
      } else {
        imports.jsx = true
        callee = {type: 'Identifier', name: '_jsx'}
      }

      parameters.push(props || {type: 'ObjectExpression', properties: []})

      if (key) {
        parameters.push(key)
      }
    }
    // Classic.
    else {
      // There are props or children.
      if (props || parameters.length) {
        parameters.unshift(props || {type: 'Literal', value: null})
      }

      callee = toMemberExpression(
        annotations.jsx || settings.pragma || 'React.createElement'
      )
    }

    parameters.unshift(name)

    this.replace(
      create(node, {
        type: 'CallExpression',
        callee: callee,
        arguments: parameters
      })
    )
  }
}

function toProperty(node) {
  var value

  if (node.value) {
    if (node.value.type === 'JSXExpressionContainer') {
      value = node.value.expression
    }
    // Could be an element, fragment, or string.
    else {
      value = node.value
      // Remove `raw` so we don’t get character references in strings.
      delete value.raw
    }
  }
  // Boolean prop.
  else {
    value = {type: 'Literal', value: true}
  }

  return create(node, {
    type: 'Property',
    key: toIdentifier(node.name),
    value: value,
    kind: 'init'
  })
}

function toIdentifier(node) {
  return create(
    node,
    node.type === 'JSXMemberExpression'
      ? {
          type: 'MemberExpression',
          object: toIdentifier(node.object),
          property: toIdentifier(node.property)
        }
      : node.type === 'JSXNamespacedName'
      ? {type: 'Literal', value: node.namespace.name + ':' + node.name.name}
      : // Must be `JSXIdentifier`.
      isIdentifierName(node.name)
      ? {type: 'Identifier', name: node.name}
      : {type: 'Literal', value: node.name}
  )
}

function toMemberExpression(id) {
  var identifiers = id.split('.')
  var index = -1
  var result
  var prop

  while (++index < identifiers.length) {
    prop = {type: 'Identifier', name: identifiers[index]}
    result = index
      ? {type: 'MemberExpression', object: result, property: prop}
      : prop
  }

  return result
}

function create(template, node) {
  var fields = ['start', 'end', 'loc', 'range', 'comments']
  var index = -1
  var field

  while (++index < fields.length) {
    field = fields[index]
    if (field in template) {
      node[field] = template[field]
    }
  }

  return node
}
