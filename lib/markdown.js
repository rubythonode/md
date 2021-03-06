'use strict'

const EventEmitter = require('events')

const tag = (level) => {
  let slog = ''

  if (level > 6) {
    level = 6
  }

  for (let i = 0; i < level; i++) {
    slog += '#'
  }

  return slog + ' '
}

const DEFAULT_LEVEL = 1
const DEFAULT_PRINT_ORDER = ['props', 'slots', 'events', 'methods']
const DEFAULT_TITLES = {
  props: 'props',
  methods: 'methods',
  events: 'events',
  slots: 'slots'
}

const bold = (text) => `**${text}**`
const italic = (text) => `*${text}*`
// const underline = (text) => `_${text}_`
const backtick = (text) => `\`${text}\``
const item = (text) => `- ${text}`

const h = (text, level) => tag(level) + text
const comma = () => ','
const parenthesis = (text) => `(${text})`

const writer = {
  props (options, props, title) {
    options.$println(h(title, options.level))

    props.forEach((prop) => {
      const type = prop.value.type || prop.value || 'any'
      const nature = prop.value.required ? 'required' : 'optional'
      const twoWay = prop.value.twoWay
      let defaultValue = prop.value.default

      switch (typeof defaultValue) {
        case 'boolean':
          defaultValue = defaultValue ? 'true' : 'false'
          break

        case 'string':
          defaultValue = defaultValue.replace(/'/g, '\'')
          defaultValue = `'${defaultValue}'`
          break

        default:
          if (defaultValue === null) {
            defaultValue = 'null'
          }
      }

      options.$print(item(backtick(prop.name)))
      options.$print(bold(italic(type)))
      options.$print(parenthesis(italic(nature)))

      const line = []

      if (twoWay) {
        line[line.length - 1] += comma()

        options.$print(backtick(`twoWay = ${twoWay}`))
      }

      if (defaultValue) {
        options.$print(backtick(`default: ${defaultValue}`))
      }

      options.$println()

      if (prop.description) {
        options.$println(prop.description)
        options.$println()
      }
    })
  },

  methods (options, methods, title) {
    options.$println(h(title, options.level))

    methods.forEach((method) => {
      options.$println(item(backtick(`${method.name}()`)))

      if (method.description) {
        options.$println(method.description)
      }

      options.$println()
    })

    options.$println()
  },

  slots (options, slots, title) {
    options.$println(h(title, options.level))

    slots.forEach((slot) => {
      options.$println(item(backtick(slot.name)), slot.description)
      options.$println()
    })
  },

  events (options, events, title) {
    options.$println(h(title, options.level))

    events.forEach((event) => {
      options.$println(item(backtick(event.name)), event.description)
      options.$println()
    })
  }
}

module.exports.render = (component, options) => {
  options = options || {}
  options.level = options.level || DEFAULT_LEVEL
  options.titles = options.titles || DEFAULT_TITLES
  options.printOrder = options.printOrder || DEFAULT_PRINT_ORDER

  const emiter = new EventEmitter()

  options.$print = function () {
    Array.prototype.slice.call(arguments)
      .forEach((str) => emiter.emit('write', str + ' '))
  }

  options.$println = function () {
    options.$print.apply(null, Array.prototype.slice.call(arguments))
    emiter.emit('write', '\n')
  }

  process.nextTick(() => {
    if (!options.ignoreName && component.name) {
      options.$println(h(component.name, options.level++))
    }

    if (!options.ignoreDescription && component.description) {
      options.$println(component.description)
      options.$println()
    }

    options.printOrder.forEach((node) => {
      if (!component.hasOwnProperty(node)) {
        throw new Error(`Unknow node '${node}'`)
      }

      if (!component[node].length) {
        return options.$println()
      }

      const title = options.titles[node] || DEFAULT_TITLES[node]

      writer[node](options, component[node], title)
    })

    emiter.emit('end')
  })

  return emiter
}
