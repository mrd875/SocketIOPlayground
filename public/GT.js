// https://stackoverflow.com/questions/45831911/is-there-any-eventemitter-in-browser-side-that-has-similar-logic-in-nodejs
class EventEmitter {
    constructor() {
        this.__callbacks = {}
    }

    on(event, cb) {
        if (!this.__callbacks[event]) this.__callbacks[event] = []
        this.__callbacks[event].push(cb)
    }

    once(event, cb) {
        const thiscb = (...args) => {
            cb(...args)
            this.off(event, thiscb)
        }

        this.on(event, thiscb)
    }

    emit(event, ...args) {
        if (!this.__callbacks[event]) return

        let cbs = [...this.__callbacks[event]]
        if (cbs) {
            cbs.forEach(cb => cb(...args))
        }
    }

    off(event, cb) {
        if (!this.__callbacks[event]) return

        if (!cb) {
            delete this.__callbacks[event]
        } else {
            this.__callbacks[event].splice(this.__callbacks[event].indexOf(cb), 1)
        }
    }
}

class GT extends EventEmitter {
    constructor() {
        super()

        const socket = io()

        this.socket = socket

        // setup the events.
        socket.on('init_state', (state, users) => {
            this.emit('init_state', state, users)
        })
        
        socket.on('connected', (id, user) => {
            this.emit('connected', id, user)
        })
        socket.on('disconnected', (id, reason) => {
            this.emit('disconnected', id, reason)
        })
        socket.on('user_updated', (id, payload_delta) => {
            this.emit('user_updated', id, payload_delta)
        })

        socket.on('state_updated', (id, payload_delta) => {
            this.emit('state_updated', id, payload_delta)
        })

        this.id = undefined

        socket.on('connect', () => {
            this.id = socket.id
        })

        socket.on('disconnect', reason => {
            this.emit('disconnect', reason)

            this.id = undefined
        })
    }

    updateState(payload_delta) {
        this.socket.emit('state_updated', payload_delta)
    }

    updateUser (payload_delta) {
        this.socket.emit('user_updated', payload_delta)
    }
}
