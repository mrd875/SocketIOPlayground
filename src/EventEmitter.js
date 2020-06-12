/* eslint-disable standard/no-callback-literal */

// https://stackoverflow.com/questions/45831911/is-there-any-eventemitter-in-browser-side-that-has-similar-logic-in-nodejs
class EventEmitter {
  constructor () {
    this.__callbacks = {}
  }

  on (event, cb) {
    if (!this.__callbacks[event]) { this.__callbacks[event] = [] }
    this.__callbacks[event].push(cb)

    return this
  }

  once (event, cb) {
    const thiscb = (...args) => {
      cb(...args)
      this.off(event, thiscb)
    }

    this.on(event, thiscb)

    return this
  }

  emit (event, ...args) {
    if (!this.__callbacks[event]) { return this }

    const cbs = [...this.__callbacks[event]]
    if (cbs) {
      cbs.forEach(cb => cb(...args))
    }

    return this
  }

  off (event, cb) {
    if (!this.__callbacks[event]) { return this }

    if (!cb) {
      delete this.__callbacks[event]
    } else {
      this.__callbacks[event].splice(this.__callbacks[event].indexOf(cb), 1)
    }

    return this
  }
}

module.exports = EventEmitter
