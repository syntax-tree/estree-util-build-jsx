'use strict'

module.exports = buildJsx

var walk = require('estree-walker').walk
var isIdentifierName = require('estree-util-is-identifier-name').name

function buildJsx(tree, options) {
  var settings = options || {}
  var pragma = settings.pragma
  var pragmaFrag = settings.pragmaFrag

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
        if ((match = /@jsx\s+(\S+)/.exec(comments[index].value))) {
          pragma = match[1]
        }

        if ((match = /@jsxFrag\s+(\S+)/.exec(comments[index].value))) {
          pragmaFrag = match[1]
        }
      }
    }
  }

  // Transform JSX.
  // eslint-disable-next-line complexity
  function leave(node) {
    var parameters
    var fields
    var objects
    var index
    var child
    var name
    var props
    var attributes

    if (node.type !== 'JSXElement' && node.type !== 'JSXFragment') {
      return
    }

    parameters = []
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

      parameters.push(child)
    }

    // Do the stuff needed for elements.
    if (node.openingElement) {
      name = toIdentifier(node.openingElement.name)

      // If the name could be an identifier, but start with something other than
      // a lowercase letter, it’s not a component.
      if (name.type === 'Identifier' && /^[a-z]/.test(name.name)) {
        name = create(name, {type: 'Literal', value: name.name})
      }

      attributes = node.openingElement.attributes
      objects = []
      fields = []
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
        } else {
          fields.push(toProperty(attributes[index]))
        }
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
    }
    // …and fragments.
    else {
      name = toMemberExpression(pragmaFrag || 'React.Fragment')
    }

    // There are props or children.
    if (props || parameters.length) {
      parameters.unshift(props || {type: 'Literal', value: null})
    }

    parameters.unshift(name)

    this.replace(
      create(node, {
        type: 'CallExpression',
        callee: toMemberExpression(pragma || 'React.createElement'),
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
